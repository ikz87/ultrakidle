import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const BOT_USER_ID = Deno.env.get("DISCORD_AUTOMATION_BOT_ID")!;
const REACTION_THRESHOLD = 5;

const DISCORD_API = "https://discord.com/api/v10";

const TARGET_WIDTH = 1920;
const TARGET_HEIGHT = 1080;
const ASPECT_TOLERANCE = 0.02;

const LEVEL_PATTERN = /^(\d+-\d+|\d+-[A-Z]\d*|P-\d+)$/i;

const headers = {
  Authorization: `Bot ${BOT_TOKEN}`,
  "Content-Type": "application/json",
};


async function sendMessage(channelId: string, content: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(
      `${DISCORD_API}/channels/${channelId}/messages`,
      {
        method: "POST",
        headers,
        body: JSON.stringify({ content }),
      },
    );
    if (res.ok) return;

    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      console.warn(
        `[msg] Rate limited in ${channelId}, retrying in ${retryAfter}ms`,
      );
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }

    console.error(
      `[msg] Failed to send message in ${channelId}: ${res.status}`,
    );
    return;
  }
}

async function closeThread(threadId: string) {
  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(`${DISCORD_API}/channels/${threadId}`, {
      method: "PATCH",
      headers,
      body: JSON.stringify({ archived: true, locked: true }),
    });
    if (res.ok) return;

    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }

    console.error(
      `[thread] Failed to close thread ${threadId}: ${res.status}`,
    );
    return;
  }
}

async function rejectThread(
  threadId: string,
  messageId: string,
  reason: string,
) {
  await addReaction(threadId, messageId, "❌");
  await sendMessage(threadId, `❌ **Submission rejected** — ${reason}`);
  await closeThread(threadId);
}

async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  const url = `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: "PUT", headers });
    if (res.ok) return;

    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      console.warn(
        `[react] Rate limited adding ${emoji} to ${messageId}, retrying in ${retryAfter}ms`,
      );
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }

    console.error(
      `[react] Failed to add ${emoji} to ${messageId}: ${res.status}`,
    );
    return;
  }
}

async function removeReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  const url = `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`;

  for (let attempt = 0; attempt < 3; attempt++) {
    const res = await fetch(url, { method: "DELETE", headers });
    if (res.ok || res.status === 404) return;

    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      console.warn(
        `[react] Rate limited removing ${emoji} from ${messageId}, retrying in ${retryAfter}ms`,
      );
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }

    console.error(
      `[react] Failed to remove ${emoji} from ${messageId}: ${res.status}`,
    );
    return;
  }
}

async function getReactionUsers(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<string[]> {
  const encoded = encodeURIComponent(emoji);
  const res = await fetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}?limit=100`,
    { headers },
  );
  if (!res.ok) {
    console.warn(
      `[reactions] Failed to fetch ${emoji} for ${messageId}: ${res.status}`,
    );
    return [];
  }
  const users: { id: string }[] = await res.json();
  return users.map((u) => u.id).filter((id) => id !== BOT_USER_ID);
}

async function getActiveForumThreads(
  guildId: string,
  forumChannelId: string,
): Promise<any[]> {
  const res = await fetch(
    `${DISCORD_API}/guilds/${guildId}/threads/active`,
    { headers },
  );
  if (!res.ok) {
    console.error(
      `[threads] Failed to fetch active threads: ${res.status}`,
    );
    return [];
  }
  const body = await res.json();
  return body.threads.filter(
    (t: any) =>
      t.parent_id === forumChannelId &&
      !t.thread_metadata?.archived,
  );
}

async function getStarterMessage(
  threadId: string,
): Promise<any | null> {
  const res = await fetch(
    `${DISCORD_API}/channels/${threadId}/messages/${threadId}`,
    { headers },
  );
  if (!res.ok) {
    console.warn(
      `[threads] Failed to fetch starter message for ${threadId}: ${res.status}`,
    );
    return null;
  }
  return res.json();
}

async function downloadImage(url: string): Promise<Uint8Array> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Failed to download image: ${res.status}`);
  return new Uint8Array(await res.arrayBuffer());
}

function isAspectRatio16x9(width: number, height: number): boolean {
  return Math.abs(width / height - 16 / 9) < ASPECT_TOLERANCE;
}

function discordAvatarUrl(userId: string, avatarHash: string | null): string {
  if (!avatarHash) {
    const index = (BigInt(userId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}`;
}

serve(async (req) => {
  const start = performance.now();
  console.log("[poll-submissions] Starting run");

  const authHeader = req.headers.get("Authorization");
  if (
    authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  ) {
    console.error("[auth] Unauthorized request");
    return new Response("Unauthorized", { status: 401 });
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
    console.error("[init] No levels found in database");
    return Response.json({ error: "No levels found" }, { status: 500 });
  }

  console.log(`[init] Loaded ${levels.length} levels`);
  const levelMap = new Map(levels.map((l) => [l.level_number, l.id]));

  const { data: forums } = await supabase
    .from("submission_forums")
    .select("channel_id, guild_id");

  if (!forums?.length) {
    console.log("[init] No tracked forums, nothing to do");
    return Response.json({ ok: true, ingested: 0, resolved: 0 });
  }

  console.log(`[init] Tracking ${forums.length} forum(s)`);

  let totalIngested = 0;
  let totalResolved = 0;

  // --- PHASE 1: Ingest new forum posts ---
  for (const forum of forums) {
    console.log(
      `[ingest] Discovering threads in forum ${forum.channel_id}`,
    );

    const activeThreads = await getActiveForumThreads(
      forum.guild_id,
      forum.channel_id,
    );

    console.log(
      `[ingest] Found ${activeThreads.length} active non-archived thread(s)`,
    );

    const threadIds = activeThreads.map((t) => t.id);

    const { data: existing } = await supabase
      .from("image_submissions")
      .select("message_id")
      .in("message_id", threadIds);

    const { data: rejected } = await supabase
      .from("rejected_threads")
      .select("thread_id")
      .in("thread_id", threadIds);

    const existingIds = new Set(
      existing?.map((e) => e.message_id) ?? [],
    );
    const rejectedIds = new Set(
      rejected?.map((r) => r.thread_id) ?? [],
    );

    const newThreads = activeThreads.filter(
      (t) => !existingIds.has(t.id) && !rejectedIds.has(t.id),
    );
    console.log(
      `[ingest] ${newThreads.length} new thread(s) to process`,
    );

    for (const thread of newThreads) {
      const title = (thread.name ?? "").trim();
      const levelMatch = title.match(LEVEL_PATTERN);
      if (!levelMatch) {
        console.log(
          `[ingest] Rejecting thread ${thread.id} — invalid title: "${title}"`,
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
          `[ingest] Rejecting thread ${thread.id} — unknown level "${levelNumber}"`,
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
          `[ingest] Skipping thread ${thread.id} — no starter message`,
        );
        continue;
      }

      const imageAttachments = (msg.attachments ?? []).filter(
        (a: any) => {
          if (a.content_type?.startsWith("image/")) return true;
          return /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? "");
        },
      );
      if (imageAttachments.length === 0) {
        console.log(
          `[ingest] Rejecting thread ${thread.id} — no image attached`,
        );
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
        console.log(
          `[ingest] Rejecting thread ${thread.id} — ${imageAttachments.length} images attached`,
        );
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

      try {
        const imageData = await downloadImage(attachment.url);
        const decoded = await Image.decode(imageData);
        if (!isAspectRatio16x9(decoded.width, decoded.height)) {
          console.log(
            `[ingest] Rejecting thread ${thread.id} — not 16:9 (${decoded.width}x${decoded.height})`,
          );
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
      } catch (e) {
        console.error(
          `[ingest] Failed to decode image for thread ${thread.id}:`,
          e,
        );
        await rejectThread(
          thread.id,
          thread.id,
          "Could not decode the image. Make sure it's a valid PNG, JPEG, WebP, or GIF.",
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
          guild_id: forum.guild_id,
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
          console.log(
            `[ingest] Duplicate thread ${thread.id}, skipping`,
          );
        } else {
          console.error(
            `[ingest] DB insert error for thread ${thread.id}:`,
            error,
          );
        }
        continue;
      }

      console.log(
        `[ingest] ✓ Ingested thread ${thread.id} — level ${levelNumber} by ${displayName}`,
      );
      await addReaction(thread.id, thread.id, "👀");
      totalIngested++;
    }
  }

  // --- PHASE 2: Resolve pending submissions ---
  const { data: pending } = await supabase
    .from("image_submissions")
    .select("*")
    .eq("status", "pending");

  console.log(
    `[resolve] ${pending?.length ?? 0} pending submission(s) to check`,
  );

  if (pending?.length) {
  for (const sub of pending) {
    // Re-verify title in case it was edited
    const threadRes = await fetch(`${DISCORD_API}/channels/${sub.channel_id}`, {
      headers,
    });

    if (!threadRes.ok) {
      console.warn(`[resolve] Failed thread fetch ${sub.channel_id}`);
      continue;
    }

    const threadData = await threadRes.json();
    const currentTitle = (threadData.name ?? "").trim().toUpperCase();
    const levelMatch = currentTitle.match(LEVEL_PATTERN);
    const levelId = levelMatch ? levelMap.get(levelMatch[1]) : null;

    if (!levelId) {
      console.log(`[resolve] Rejecting #${sub.id} - title edited to invalid`);
      await rejectThread(
        sub.channel_id,
        sub.message_id,
        `Title edited to invalid level: "${currentTitle}"`,
      );
      await supabase
        .from("image_submissions")
        .update({ status: "rejected", resolved_at: new Date().toISOString() })
        .eq("id", sub.id);
      totalResolved++;
      continue;
    }

    // Sync level_id if title changed
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
    const total = up + down;

    await supabase
      .from("image_submissions")
      .update({ thumbs_up: up, thumbs_down: down })
      .eq("id", sub.id);

    if (total < REACTION_THRESHOLD) continue;

    if (up > down) {
      try {
        const imageData = await downloadImage(sub.image_url);
        const decoded = await Image.decode(imageData);
        const resized = decoded.resize(TARGET_WIDTH, TARGET_HEIGHT);
        const jpegData = await resized.encodeJPEG(90);

        const levelNumber = levels.find((l) => l.id === sub.level_id)
          ?.level_number;
        const storagePath = `${levelNumber}/${sub.id}.jpg`;

        const { error: uploadError } = await supabase.storage
          .from("level-images")
          .upload(storagePath, jpegData, {
            contentType: "image/jpeg",
            upsert: false,
          });

        if (uploadError) {
          console.error(`[resolve] Upload error #${sub.id}:`, uploadError);
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
        totalResolved++;
      } catch (e) {
        console.error(`[resolve] Processing error #${sub.id}:`, e);
      }
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
      await sendMessage(sub.channel_id, "❌ **Submission rejected** by vote.");
      await closeThread(sub.channel_id);
      totalResolved++;
    }
  }
}

  const elapsed = (performance.now() - start).toFixed(0);
  console.log(
    `[poll-submissions] Done in ${elapsed}ms — ingested: ${totalIngested}, resolved: ${totalResolved}`,
  );

  return Response.json({
    ok: true,
    ingested: totalIngested,
    resolved: totalResolved,
  });
});
