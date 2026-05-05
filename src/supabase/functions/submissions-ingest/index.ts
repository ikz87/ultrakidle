import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const DISCORD_API = "https://discord.com/api/v10";
const LEVEL_PATTERN = /^(\d+-\d+|\d+-[A-Z]\d*|P-\d+)$/i;

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

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { threads } = await req.json();
  if (!threads?.length) return Response.json({ ingested: 0, rejected: 0 });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );

  const { data: levels } = await supabase.from("levels").select("id, level_number");
  const levelMap = new Map(levels?.map((l) => [l.level_number.toUpperCase(), l.id]));

  let ingested = 0;
  let rejected = 0;

  for (const thread of threads) {
    try {
      const msgRes = await discordFetch(
        `${DISCORD_API}/channels/${thread.id}/messages/${thread.id}`,
        { headers: discordHeaders }
      );

      if (!msgRes.ok) {
        rejected++;
        continue;
      }

      const msg = await msgRes.json();
      const hasImage = msg.attachments?.some(
        (a: any) =>
          a.content_type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? "")
      );

      const levelMatch = thread.name.trim().toUpperCase().match(LEVEL_PATTERN);
      const levelId = levelMatch ? levelMap.get(levelMatch[1]) : null;

      if (!hasImage || !levelId) {
        await supabase.from("rejected_threads").insert({
          thread_id: thread.id,
          reason: !hasImage ? "no_image" : "invalid_level",
        });
        rejected++;
        continue;
      }

      const author = msg.author;
      const avatarUrl = author.avatar
        ? `https://cdn.discordapp.com/avatars/${author.id}/${author.avatar}.png`
        : null;

      const attachment = msg.attachments.find(
        (a: any) =>
          a.content_type?.startsWith("image/") ||
          /\.(png|jpe?g|webp|gif)$/i.test(a.filename ?? "")
      );

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

      if (profileErr || !profile) {
        console.error(`[profile] Error for ${author.id}:`, profileErr);
        continue;
      }

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
        console.error(`[insert] Error for thread ${thread.id}:`, insErr);
        continue;
      }

      await discordFetch(
        `${DISCORD_API}/channels/${thread.id}/messages/${thread.id}/reactions/%F0%9F%91%80/@me`,
        { method: "PUT", headers: discordHeaders }
      );
      ingested++;
    } catch (e) {
      console.error(`[ingest] Error processing thread ${thread.id}:`, e);
    }
  }

  return Response.json({ ingested, rejected });
});
