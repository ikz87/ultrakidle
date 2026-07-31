import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { Image } from "https://deno.land/x/imagescript@1.3.0/mod.ts";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const DISCORD_API = "https://discord.com/api/v10";
const LEVEL_PATTERN = /^(\d+-\d+|\d+-[A-Z]\d*|P-\d+)$/i;
const ASPECT_TOLERANCE = 0.02;
const MIN_WIDTH = 1280;
const MIN_HEIGHT = 720;

const discordHeaders = {
  Authorization: `Bot ${BOT_TOKEN}`,
  "Content-Type": "application/json",
};

async function discordFetch(url: string, init?: RequestInit): Promise<Response> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || res.status === 404) return res;
    if (res.status === 429) {
      const body = await res.json();
      await new Promise((r) => setTimeout(r, (body.retry_after ?? 1) * 1000));
      continue;
    }
    const backoff = 1000 * 2 ** attempt;
    await new Promise((r) => setTimeout(r, backoff));
  }
  throw new Error(`Failed to fetch ${url}`);
}

async function callMessagingFunction(channelId: string, content: string) {
  try {
    await fetch(`${SUPABASE_URL}/functions/v1/send-message`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${SERVICE_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        channel_id: channelId,
        message: content,
        bot: "automation",
      }),
    });
  } catch (e) {
    console.error(`[messaging-func] Failed:`, e);
  }
}

async function closeThread(threadId: string) {
  await discordFetch(`${DISCORD_API}/channels/${threadId}`, {
    method: "PATCH",
    headers: discordHeaders,
    body: JSON.stringify({ archived: true, locked: true }),
  });
}

async function rejectThread(threadId: string, reason: string) {
  const encodedEmoji = encodeURIComponent("❌");
  await discordFetch(
    `${DISCORD_API}/channels/${threadId}/messages/${threadId}/reactions/${encodedEmoji}/@me`,
    { method: "PUT", headers: discordHeaders }
  );
  await callMessagingFunction(
    threadId,
    `❌ **Submission rejected** — ${reason}`
  );
  await closeThread(threadId);
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");

  if (authHeader !== `Bearer ${SERVICE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { threads } = await req.json().catch(() => ({}));
  if (!threads?.length) return Response.json({ ingested: 0, rejected: 0 });

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: levels } = await supabase
    .from("levels")
    .select("id, level_number");

  const levelMap = new Map(
    levels?.map((l) => [l.level_number.trim().toUpperCase(), l.id])
  );

  let ingested = 0;
  let rejected = 0;

  for (const thread of threads) {
    try {
      const threadName = (thread.name || "").trim().toUpperCase();
      const levelMatch = threadName.match(LEVEL_PATTERN);
      const levelId = levelMatch ? levelMap.get(levelMatch[0]) : null;

      if (!levelId) {
        await rejectThread(
          thread.id,
          `Post title \`${threadName}\` must be a valid level name (e.g. \`2-1\`, \`P-2\`).`
        );
        await supabase
          .from("rejected_threads")
          .upsert({ thread_id: thread.id, reason: "invalid_level" });
        rejected++;
        continue;
      }

      const msgRes = await discordFetch(
        `${DISCORD_API}/channels/${thread.id}/messages/${thread.id}`,
        { headers: discordHeaders }
      );

      if (!msgRes.ok) continue;

      const msg = await msgRes.json();
      const attachment = msg.attachments?.find(
        (a: any) =>
          a.content_type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? "")
      );

      if (!attachment) {
        await rejectThread(
          thread.id,
          "The first message must contain an image attachment."
        );
        await supabase
          .from("rejected_threads")
          .upsert({ thread_id: thread.id, reason: "no_image" });
        rejected++;
        continue;
      }

      const imgRes = await fetch(attachment.url);
      if (!imgRes.ok) continue;

      const imageData = new Uint8Array(await imgRes.arrayBuffer());
      const decoded = await Image.decode(imageData);

      const actualAspect = decoded.width / decoded.height;
      const isBadAspect =
        Math.abs(actualAspect - 16 / 9) >= ASPECT_TOLERANCE;
      const isLowRes = decoded.width < MIN_WIDTH || decoded.height < MIN_HEIGHT;

      if (isBadAspect || isLowRes) {
        let reason = "";
        if (isBadAspect && isLowRes) {
          reason = `Image must be 16:9 aspect ratio and at least ${MIN_WIDTH}x${MIN_HEIGHT}. Got ${decoded.width}x${decoded.height}.`;
        } else if (isBadAspect) {
          reason = `Image must be 16:9 aspect ratio. Got ${decoded.width}x${decoded.height}.`;
        } else {
          reason = `Image resolution is too low. Must be at least ${MIN_WIDTH}x${MIN_HEIGHT}. Got ${decoded.width}x${decoded.height}.`;
        }

        await rejectThread(thread.id, reason);
        await supabase.from("rejected_threads").upsert({
          thread_id: thread.id,
          reason: isBadAspect ? "bad_aspect_ratio" : "low_resolution",
        });
        rejected++;
        continue;
      }

      const author = msg.author;
      const avatarUrl = author.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
        : null;

      const { data: profile, error: profileErr } = await supabase
        .from("submitter_profiles")
        .upsert(
          {
            discord_user_id: author.id,
            discord_name: author.global_name ?? author.username,
            discord_avatar_url: avatarUrl,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "discord_user_id" }
        )
        .select("id")
        .single();

      if (profileErr || !profile) continue;

      const { error: insErr } = await supabase.from("image_submissions").insert({
        level_id: levelId,
        submitter_id: profile.id,
        channel_id: thread.id,
        message_id: thread.id,
        guild_id: thread.guild_id,
        image_url: attachment.url,
        status: "pending",
      });

      if (insErr) {
        if (insErr.code === "23505") continue;
        console.error(`[insert] Error:`, insErr);
        continue;
      }

      await discordFetch(
        `${DISCORD_API}/channels/${thread.id}/messages/${thread.id}/reactions/%F0%9F%91%80/@me`,
        { method: "PUT", headers: discordHeaders }
      );
      ingested++;
    } catch (e) {
      console.error(`[ingest] Exception:`, e);
    }
  }

  return Response.json({ ingested, rejected });
});
