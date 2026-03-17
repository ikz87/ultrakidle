import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const BATCH_SIZE = 10;

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (authHeader !== `Bearer ${SERVICE_KEY}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const testChannel = url.searchParams.get("channel");

  const supabase = createClient(SUPABASE_URL, SERVICE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  let query = supabase
    .from("daily_notification_channels")
    .select("guild_id, channel_id");

  if (testChannel) query = query.eq("channel_id", testChannel);

  const { data: channels } = await query;

  if (!channels?.length) {
    return Response.json({ ok: true, sent: 0 });
  }

  const workerUrl = `${SUPABASE_URL}/functions/v1/send-daily-result`;
  let succeeded = 0;
  let failed = 0;

  // Process in batches to avoid overwhelming things
  for (let i = 0; i < channels.length; i += BATCH_SIZE) {
    const batch = channels.slice(i, i + BATCH_SIZE);

    const results = await Promise.allSettled(
      batch.map((row) =>
        fetch(workerUrl, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${SERVICE_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            guild_id: row.guild_id,
            channel_id: row.channel_id,
          }),
        })
      ),
    );

    for (const r of results) {
      if (r.status === "fulfilled" && r.value.ok) succeeded++;
      else failed++;
    }
  }

  return Response.json({ ok: true, succeeded, failed });
});
