import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import {
  checkAuth,
  discordFetch,
  discordHeaders,
  getStarterMessage,
  getReactionUsers,
  sendMessage,
  closeThread,
  rejectThread,
  addReaction,
  removeReaction,
  DISCORD_API,
  LEVEL_PATTERN,
  REACTION_THRESHOLD,
} from "../_shared/discord.ts";

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;

async function downloadImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok)
    throw new Error(`Failed to download image: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

serve(async (req) => {
  if (!checkAuth(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { submission_ids, mode } = (await req.json()) as {
    submission_ids: string[];
    mode: "resolve" | "stale";
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: submissions } = await supabase
    .from("image_submissions")
    .select("*")
    .in("id", submission_ids)
    .eq("status", "pending");

  if (!submissions?.length) {
    return Response.json({ ok: true, resolved: 0, approved: 0 });
  }

  const { data: levels } = await supabase
    .from("levels")
    .select("id, level_number");

  const levelMap = new Map(
    levels?.map((l) => [l.level_number, l.id]) ?? [],
  );
  const levelById = new Map(
    levels?.map((l) => [l.id, l.level_number]) ?? [],
  );

  let resolved = 0;
  let approved = 0;

  for (const sub of submissions) {
    try {
      await new Promise((r) => setTimeout(r, 1000));

      // --- Stale mode: just expire ---
      if (mode === "stale") {
        await removeReaction(sub.channel_id, sub.message_id, "👀");
        await sendMessage(
          sub.channel_id,
          "⏰ **Submission expired** — This thread has been open for over 2 days without reaching the vote threshold. Feel free to resubmit!",
        );
        await closeThread(sub.channel_id);
        await supabase
          .from("image_submissions")
          .update({
            status: "expired",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
        console.log(`[resolve] ✓ Expired #${sub.id}`);
        resolved++;
        continue;
      }

      // --- Resolve mode ---
      const threadRes = await discordFetch(
        `${DISCORD_API}/channels/${sub.channel_id}`,
        { headers: discordHeaders },
      );

      if (!threadRes.ok) {
        console.warn(
          `[resolve] Failed thread fetch ${sub.channel_id}: ${threadRes.status}`,
        );
        continue;
      }

      const threadData = await threadRes.json();
      const currentTitle = (threadData.name ?? "")
        .trim()
        .toUpperCase();
      const levelMatch = currentTitle.match(LEVEL_PATTERN);
      const levelId = levelMatch
        ? levelMap.get(levelMatch[1])
        : null;

      if (!levelId) {
        await rejectThread(
          sub.channel_id,
          sub.message_id,
          `Title edited to invalid level: "${currentTitle}"`,
        );
        await supabase
          .from("image_submissions")
          .update({
            status: "rejected",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
        resolved++;
        continue;
      }

      if (levelId !== sub.level_id) {
        await supabase
          .from("image_submissions")
          .update({ level_id: levelId })
          .eq("id", sub.id);
        sub.level_id = levelId;
      }

      const [upUsers, downUsers] = await Promise.all([
        getReactionUsers(sub.channel_id, sub.message_id, "👍"),
        getReactionUsers(sub.channel_id, sub.message_id, "👎"),
      ]);

      const up = upUsers.length;
      const down = downUsers.length;

      await supabase
        .from("image_submissions")
        .update({ thumbs_up: up, thumbs_down: down })
        .eq("id", sub.id);

      if (
        up < REACTION_THRESHOLD &&
        down < REACTION_THRESHOLD
      ) {
        console.log(
          `[resolve] #${sub.id} — ${up}👍 ${down}👎 (need ${REACTION_THRESHOLD}), skipping`,
        );
        continue;
      }

      if (up > down) {
        const freshMsg = await getStarterMessage(sub.channel_id);
        const freshAttachment = freshMsg?.attachments?.find(
          (a: any) =>
            a.content_type?.startsWith("image/") ||
            /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? ""),
        );

        if (!freshAttachment) {
          await rejectThread(
            sub.channel_id,
            sub.message_id,
            "Original image is no longer available.",
          );
          await supabase
            .from("image_submissions")
            .update({
              status: "rejected",
              resolved_at: new Date().toISOString(),
            })
            .eq("id", sub.id);
          resolved++;
          continue;
        }

        const imageData = await downloadImage(freshAttachment.url);
        const decoded = await Image.decode(imageData);
        const resized = decoded.resize(TARGET_WIDTH, TARGET_HEIGHT);
        const jpegData = await resized.encodeJPEG(90);

        const levelNumber = levelById.get(sub.level_id);
        const storagePath = `${levelNumber}/${sub.id}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("level-images")
          .upload(storagePath, jpegData, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          console.error(
            `[resolve] Upload error #${sub.id}:`,
            uploadError,
          );
          continue;
        }

        await supabase
          .from("image_submissions")
          .update({
            status: "approved",
            storage_path: storagePath,
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        await removeReaction(sub.channel_id, sub.message_id, "👀");
        await addReaction(sub.channel_id, sub.message_id, "✅");
        await sendMessage(
          sub.channel_id,
          "✅ **Submission approved!** Added to gallery.",
        );
        await closeThread(sub.channel_id);
        resolved++;
        approved++;
        console.log(
          `[resolve] ✓ Approved #${sub.id} — ${up}👍 ${down}👎`,
        );
      } else {
        await supabase
          .from("image_submissions")
          .update({
            status: "rejected",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        await removeReaction(sub.channel_id, sub.message_id, "👀");
        await addReaction(sub.channel_id, sub.message_id, "❌");
        await sendMessage(
          sub.channel_id,
          "❌ **Submission rejected** by vote.",
        );
        await closeThread(sub.channel_id);
        resolved++;
        console.log(
          `[resolve] ✗ Rejected #${sub.id} — ${up}👍 ${down}👎`,
        );
      }
    } catch (e) {
      console.error(
        `[resolve] Error for submission #${sub.id}:`,
        e,
      );
      await supabase
        .from("image_submissions")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", sub.id)
        .then(() => {}, () => {});
      await closeThread(sub.channel_id).catch(() => {});
      resolved++;
    }
  }

  return Response.json({ ok: true, resolved, approved });
});
