// supabase/functions/sync-discord-profiles/index.ts
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const DISCORD_BOT_TOKEN = Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

Deno.serve(async (req) => {
  const startTime = Date.now();
  console.log("[sync-discord-profiles] Function invoked");

  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`) {
    console.warn("[sync-discord-profiles] Unauthorized request");
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

  console.log("[sync-discord-profiles] Fetching profiles from database...");
  const { data: profiles, error } = await supabase
    .from("submitter_profiles")
    .select("discord_user_id");

  if (error) {
    console.error("[sync-discord-profiles] DB fetch error:", error.message);
    return Response.json({ error: error.message }, { status: 500 });
  }

  console.log(
    `[sync-discord-profiles] Found ${profiles.length} profiles to sync`,
  );

  const results: Record<string, string>[] = [];
  let updated = 0;
  let failed = 0;
  let rateLimited = 0;

  for (let i = 0; i < profiles.length; i++) {
    const { discord_user_id } = profiles[i];
    console.log(
      `[sync-discord-profiles] [${i + 1}/${profiles.length}] Fetching Discord user ${discord_user_id}...`,
    );

    const res = await fetch(
      `https://discord.com/api/v10/users/${discord_user_id}`,
      { headers: { Authorization: `Bot ${DISCORD_BOT_TOKEN}` } },
    );

    if (res.status === 429) {
      const retryAfter =
        Number(res.headers.get("retry-after") ?? 1) * 1000;
      console.warn(
        `[sync-discord-profiles] Rate limited on ${discord_user_id}, retrying after ${retryAfter}ms`,
      );
      rateLimited++;
      await sleep(retryAfter);
      i--; // retry same user
      continue;
    }

    if (!res.ok) {
      const body = await res.text();
      console.error(
        `[sync-discord-profiles] Discord API error for ${discord_user_id}: ${res.status} ${body}`,
      );
      failed++;
      results.push({ discord_user_id, status: `failed: ${res.status}` });
      await sleep(1000);
      continue;
    }

    const user = await res.json();
    const displayName = user.global_name ?? user.username;
    const avatarUrl = user.avatar
      ? `https://cdn.discordapp.com/avatars/${discord_user_id}/${user.avatar}.${user.avatar.startsWith("a_") ? "gif" : "png"}?size=256`
      : null;

    console.log(
      `[sync-discord-profiles] [${i + 1}/${profiles.length}] ${discord_user_id} -> name="${displayName}" avatar=${avatarUrl ? "yes" : "none"}`,
    );

    const { error: upsertError } = await supabase
      .from("submitter_profiles")
      .upsert(
        {
          discord_user_id,
          discord_name: displayName,
          discord_avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "discord_user_id" },
      );

    if (upsertError) {
      console.error(
        `[sync-discord-profiles] Upsert error for ${discord_user_id}:`,
        upsertError.message,
      );
      failed++;
      results.push({
        discord_user_id,
        status: `error: ${upsertError.message}`,
      });
    } else {
      updated++;
      results.push({ discord_user_id, status: "updated" });
    }

    await sleep(1000);
  }

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(1);
  const summary = {
    processed: profiles.length,
    updated,
    failed,
    rateLimited,
    elapsedSeconds: elapsed,
    results,
  };

  console.log(
    `[sync-discord-profiles] Done in ${elapsed}s — updated: ${updated}, failed: ${failed}, rate limited: ${rateLimited}`,
  );

  return Response.json(summary);
});
