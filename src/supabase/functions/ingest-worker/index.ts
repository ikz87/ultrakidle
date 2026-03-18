import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";
import {
  checkAuth,
  getStarterMessage,
  rejectThread,
  addReaction,
  closeThread,
  discordAvatarUrl,
  LEVEL_PATTERN,
} from "../_shared/discord.ts";

const ASPECT_TOLERANCE = 0.02;

function isAspectRatio16x9(w: number, h: number): boolean {
  return Math.abs(w / h - 16 / 9) < ASPECT_TOLERANCE;
}

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

  const { threads, guild_id } = await req.json() as {
    threads: { id: string; name: string }[];
    guild_id: string;
  };

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: levels } = await supabase
    .from("levels")
    .select("id, level_number");

  const levelMap = new Map(
    levels?.map((l) => [l.level_number, l.id]) ?? [],
  );

  let ingested = 0;

  for (const thread of threads) {
    try {
      await new Promise((r) => setTimeout(r, 1000));

      const title = (thread.name ?? "").trim();
      const levelMatch = title.match(LEVEL_PATTERN);

      if (!levelMatch) {
        console.log(
          `[ingest] Rejecting ${thread.id} — invalid title: "${title}"`,
        );
        await rejectThread(
          thread.id,
          thread.id,
          `Post title must be exactly a level name (e.g. \`2-1\`, \`P-2\`, \`0-E\`, \`7-S\`). Got: \`${title}\``,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        continue;
      }

      const levelNumber = levelMatch[1].toUpperCase();
      const levelId = levelMap.get(levelNumber);

      if (!levelId) {
        console.log(
          `[ingest] Rejecting ${thread.id} — unknown level "${levelNumber}"`,
        );
        await rejectThread(
          thread.id,
          thread.id,
          `Level \`${levelNumber}\` was not found in the database. Make sure it's a valid main level.`,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        continue;
      }

      const msg = await getStarterMessage(thread.id);
      if (!msg) {
        console.log(
          `[ingest] Archiving ${thread.id} — no starter message`,
        );
        await closeThread(thread.id);
        continue;
      }

      const imageAttachments = (msg.attachments ?? []).filter(
        (a: any) => {
          if (a.content_type?.startsWith("image/")) return true;
          return /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? "");
        },
      );

      if (imageAttachments.length === 0) {
        await rejectThread(
          thread.id,
          thread.id,
          "The first message must contain exactly one image attachment.",
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        continue;
      }

      if (imageAttachments.length > 1) {
        await rejectThread(
          thread.id,
          thread.id,
          `The first message must contain exactly one image. Found ${imageAttachments.length}.`,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        continue;
      }

      const attachment = imageAttachments[0];
      const imageData = await downloadImage(attachment.url);
      const decoded = await Image.decode(imageData);

      if (!isAspectRatio16x9(decoded.width, decoded.height)) {
        await rejectThread(
          thread.id,
          thread.id,
          `Image must be 16:9 aspect ratio. Got ${decoded.width}×${decoded.height}.`,
        );
        await supabase
          .from("rejected_threads")
          .insert({ thread_id: thread.id });
        continue;
      }

      const author = msg.author;
      const displayName = author.global_name || author.username;

      const { error } = await supabase
        .from("image_submissions")
        .insert({
          guild_id,
          channel_id: thread.id,
          message_id: thread.id,
          discord_user_id: author.id,
          discord_name: displayName,
          discord_avatar_url: discordAvatarUrl(
            author.id,
            author.avatar,
          ),
          level_id: levelId,
          image_url: attachment.url,
        })
        .single();

      if (error) {
        if (error.code === "23505") {
          console.log(`[ingest] Duplicate ${thread.id}, skipping`);
        } else {
          console.error(
            `[ingest] DB error for ${thread.id}:`,
            error,
          );
        }
        continue;
      }

      console.log(
        `[ingest] ✓ ${thread.id} — level ${levelNumber} by ${displayName}`,
      );
      await addReaction(thread.id, thread.id, "👀");
      ingested++;
    } catch (e) {
      console.error(`[ingest] Error for ${thread.id}:`, e);
      await closeThread(thread.id).catch(() => {});
    }
  }

  return Response.json({ ok: true, ingested });
});
