import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const BOT_USER_ID = Deno.env.get("DISCORD_AUTOMATION_BOT_ID")!;
const DISCORD_API = "https://discord.com/api/v10";
const REACTION_THRESHOLD = 3;
const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const LEVEL_PATTERN = /^(\d+-\d+|\d+-[A-Z]\d*|P-\d+)$/i;
const STALE_MS = 2 * 24 * 60 * 60 * 1000;

const discordHeaders = {
  Authorization: `Bot ${BOT_TOKEN}`,
  "Content-Type": "application/json",
};

async function discordFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || res.status === 404) return res;
    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }
    if (res.status >= 500) {
      const backoff = 1000 * 2 ** attempt;
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }
    return res;
  }
  throw new Error(`All retries exhausted for ${url}`);
}

async function sendMessage(channelId: string, content: string) {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: discordHeaders,
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok)
    console.error(`[msg] Failed in ${channelId}: ${res.status}`);
}

async function closeThread(threadId: string) {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${threadId}`,
    {
      method: "PATCH",
      headers: discordHeaders,
      body: JSON.stringify({ archived: true, locked: true }),
    },
  );
  if (!res.ok)
    console.error(
      `[thread] Failed to close ${threadId}: ${res.status}`,
    );
}

async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    { method: "PUT", headers: discordHeaders },
  );
}

async function removeReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    { method: "DELETE", headers: discordHeaders },
  );
}

async function getReactionUsers(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<string[]> {
  const encoded = encodeURIComponent(emoji);
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}?limit=100`,
    { headers: discordHeaders },
  );
  if (!res.ok) return [];
  const users: { id: string }[] = await res.json();
  return users.map((u) => u.id).filter((id) => id !== BOT_USER_ID);
}

async function approveSubmission(
  supabase: any,
  sub: any,
  levelNumMap: Map<string, string>,
): Promise<{ action: string; reason?: string }> {
  const msgRes = await discordFetch(
    `${DISCORD_API}/channels/${sub.channel_id}/messages/${sub.channel_id}`,
    { headers: discordHeaders },
  );
  if (!msgRes.ok) {
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
      "❌ **Submission rejected** — Original message is no longer available.",
    );
    await closeThread(sub.channel_id);
    return { action: "rejected", reason: "message_gone" };
  }

  const freshMsg = await msgRes.json();
  const freshAttachment = (freshMsg.attachments ?? []).find(
    (a: any) =>
      a.content_type?.startsWith("image/") ||
      /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? ""),
  );

  if (!freshAttachment) {
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
      "❌ **Submission rejected** — Original image is no longer available.",
    );
    await closeThread(sub.channel_id);
    return { action: "rejected", reason: "image_gone" };
  }

  const imgRes = await fetch(freshAttachment.url);
  if (!imgRes.ok) {
    return { action: "skipped", reason: "download_failed" };
  }

  const imageData = new Uint8Array(await imgRes.arrayBuffer());
  const decoded = await Image.decode(imageData);
  const resized = decoded.resize(TARGET_WIDTH, TARGET_HEIGHT);
  const jpegData = await resized.encodeJPEG(90);

  const levelNumber = levelNumMap.get(sub.level_id);
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
    return { action: "skipped", reason: "upload_failed" };
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
  return { action: "approved" };
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (
    authHeader !==
    `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await req.json();
  const { submissions, force_approve } = body;
  if (!submissions?.length) {
    return Response.json({
      results: [],
      approved: 0,
      rejected: 0,
      expired: 0,
      skipped: 0,
    });
  }

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: levels } = await supabase
    .from("levels")
    .select("id, level_number");

  if (!levels?.length) {
    return Response.json(
      { error: "No levels found" },
      { status: 500 },
    );
  }

  const levelMap = new Map(levels.map((l) => [l.level_number, l.id]));
  const levelNumMap = new Map(
    levels.map((l) => [l.id, l.level_number]),
  );
  const now = Date.now();

  type Result = {
    id: number;
    action: string;
    reason?: string;
  };
  const results: Result[] = [];
  let approved = 0;
  let rejected = 0;
  let expired = 0;
  let skipped = 0;

  for (const sub of submissions) {
    try {
      await new Promise((r) => setTimeout(r, 1000));

      if (force_approve) {
        console.log(`[resolve] ⚡ Force-approving #${sub.id}`);
        const result = await approveSubmission(
          supabase,
          sub,
          levelNumMap,
        );
        results.push({ id: sub.id, ...result });
        if (result.action === "approved") approved++;
        else if (result.action === "rejected") rejected++;
        else skipped++;
        continue;
      }

      // Check if stale (>2 days old)
      const createdAt = new Date(sub.created_at).getTime();
      if (now - createdAt > STALE_MS) {
        await supabase
          .from("image_submissions")
          .update({
            status: "expired",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
        await removeReaction(
          sub.channel_id,
          sub.message_id,
          "👀",
        );
        await sendMessage(
          sub.channel_id,
          "⏰ **Submission expired** — This thread has been open for over 2 days without reaching the vote threshold. Feel free to resubmit!",
        );
        await closeThread(sub.channel_id);
        results.push({ id: sub.id, action: "expired" });
        expired++;
        console.log(`[resolve] ⏰ Expired #${sub.id}`);
        continue;
      }

      // Re-check thread title for edits
      const threadRes = await discordFetch(
        `${DISCORD_API}/channels/${sub.channel_id}`,
        { headers: discordHeaders },
      );
      if (!threadRes.ok) {
        console.warn(
          `[resolve] Thread fetch failed for ${sub.channel_id}: ${threadRes.status}`,
        );
        results.push({
          id: sub.id,
          action: "skipped",
          reason: "thread_fetch_failed",
        });
        skipped++;
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
        await supabase
          .from("image_submissions")
          .update({
            status: "rejected",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);
        await removeReaction(
          sub.channel_id,
          sub.message_id,
          "👀",
        );
        await addReaction(sub.channel_id, sub.message_id, "❌");
        await sendMessage(
          sub.channel_id,
          `❌ **Submission rejected** — Title edited to invalid level: "${currentTitle}"`,
        );
        await closeThread(sub.channel_id);
        results.push({
          id: sub.id,
          action: "rejected",
          reason: "invalid_title_edit",
        });
        rejected++;
        continue;
      }

      // Update level_id if title was changed to a different valid level
      if (levelId !== sub.level_id) {
        await supabase
          .from("image_submissions")
          .update({ level_id: levelId })
          .eq("id", sub.id);
        sub.level_id = levelId;
      }

      // Count reactions
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

      if (up < REACTION_THRESHOLD && down < REACTION_THRESHOLD) {
        results.push({
          id: sub.id,
          action: "skipped",
          reason: `${up}👍 ${down}👎`,
        });
        skipped++;
        console.log(
          `[resolve] #${sub.id} — ${up}👍 ${down}👎, need ${REACTION_THRESHOLD}`,
        );
        continue;
      }

      if (up > down) {
        const result = await approveSubmission(
          supabase,
          sub,
          levelNumMap,
        );
        results.push({ id: sub.id, ...result });
        if (result.action === "approved") {
          approved++;
          console.log(
            `[resolve] ✓ Approved #${sub.id} — ${up}👍 ${down}👎`,
          );
        } else if (result.action === "rejected") {
          rejected++;
        } else {
          skipped++;
        }
      } else {
        // Rejected by vote
        await supabase
          .from("image_submissions")
          .update({
            status: "rejected",
            resolved_at: new Date().toISOString(),
          })
          .eq("id", sub.id);

        await removeReaction(
          sub.channel_id,
          sub.message_id,
          "👀",
        );
        await addReaction(sub.channel_id, sub.message_id, "❌");
        await sendMessage(
          sub.channel_id,
          "❌ **Submission rejected** by vote.",
        );
        await closeThread(sub.channel_id);
        results.push({
          id: sub.id,
          action: "rejected",
          reason: "vote",
        });
        rejected++;
        console.log(
          `[resolve] ✗ Rejected #${sub.id} — ${up}👍 ${down}👎`,
        );
      }
    } catch (e) {
      console.error(`[resolve] Error for #${sub.id}:`, e);
      await supabase
        .from("image_submissions")
        .update({
          status: "rejected",
          resolved_at: new Date().toISOString(),
        })
        .eq("id", sub.id)
        .then(
          () => {},
          () => {},
        );
      await closeThread(sub.channel_id).catch(() => {});
      results.push({
        id: sub.id,
        action: "error",
        reason: String(e),
      });
      rejected++;
    }
  }

  console.log(
    `[resolve] Done — ${approved} approved, ${rejected} rejected, ${expired} expired, ${skipped} skipped`,
  );

  return Response.json({
    results,
    approved,
    rejected,
    expired,
    skipped,
  });
});
