import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import {
  checkAuth,
  getActiveForumThreads,
  sendMessage,
  discordFetch,
  discordHeaders,
  DISCORD_API,
} from "../_shared/discord.ts";

const BATCH_SIZE = 20;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
const REPORT_CHANNEL_ID = "1481872631144775680";
const TWO_DAYS_MS = 2 * 24 * 60 * 60 * 1000;

function batch<T>(items: T[], size: number): T[][] {
  const batches: T[][] = [];
  for (let i = 0; i < items.length; i += size) {
    batches.push(items.slice(i, i + size));
  }
  return batches;
}

async function invokeWorker(
  fnName: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const res = await fetch(`${SUPABASE_URL}/functions/v1/${fnName}`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${SERVICE_ROLE_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(payload),
  });
  if (!res.ok) {
    const text = await res.text();
    console.error(
      `[dispatch] ${fnName} returned ${res.status}: ${text}`,
    );
    return null;
  }
  return res.json();
}

serve(async (req) => {
  const start = performance.now();
  console.log("[dispatch] Starting run");

  if (!checkAuth(req)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
    auth: { autoRefreshToken: false, persistSession: false },
  });

  const { data: levels } = await supabase
    .from("levels")
    .select("id, level_number, level_name");

  if (!levels?.length) {
    return Response.json(
      { error: "No levels found" },
      { status: 500 },
    );
  }

  const { data: forums } = await supabase
    .from("submission_forums")
    .select("channel_id, guild_id");

  if (!forums?.length) {
    return Response.json({ ok: true, ingested: 0, resolved: 0 });
  }

  let totalIngested = 0;
  let totalResolved = 0;
  let totalApproved = 0;
  let totalStale = 0;

  // --- Discover threads to ingest ---
  for (const forum of forums) {
    const activeThreads = await getActiveForumThreads(
      forum.guild_id,
      forum.channel_id,
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
      `[dispatch] Forum ${forum.channel_id}: ${newThreads.length} new thread(s)`,
    );

    const batches = batch(newThreads, BATCH_SIZE);
    for (const b of batches) {
      const result = await invokeWorker("ingest-worker", {
        threads: b.map((t) => ({ id: t.id, name: t.name })),
        guild_id: forum.guild_id,
      });
      if (result) {
        totalIngested += result.ingested ?? 0;
      }
    }
  }

  // --- Discover pending submissions to resolve ---
  const { data: pending } = await supabase
    .from("image_submissions")
    .select("id")
    .eq("status", "pending")
    .order("created_at", { ascending: true });

  if (pending?.length) {
    console.log(
      `[dispatch] ${pending.length} pending submission(s) to resolve`,
    );

    const batches = batch(
      pending.map((p) => p.id),
      BATCH_SIZE,
    );

    for (const b of batches) {
      const result = await invokeWorker("resolve-worker", {
        submission_ids: b,
        mode: "resolve",
      });
      if (result) {
        totalResolved += result.resolved ?? 0;
        totalApproved += result.approved ?? 0;
      }
    }
  }

  // --- Discover stale submissions to expire ---
  const cutoff = new Date(Date.now() - TWO_DAYS_MS).toISOString();

  const { data: stale } = await supabase
    .from("image_submissions")
    .select("id")
    .eq("status", "pending")
    .lt("created_at", cutoff)
    .order("created_at", { ascending: true });

  if (stale?.length) {
    console.log(
      `[dispatch] ${stale.length} stale submission(s) to expire`,
    );

    const batches = batch(
      stale.map((s) => s.id),
      BATCH_SIZE,
    );

    for (const b of batches) {
      const result = await invokeWorker("resolve-worker", {
        submission_ids: b,
        mode: "stale",
      });
      if (result) {
        totalStale += result.resolved ?? 0;
        totalResolved += result.resolved ?? 0;
      }
    }
  }

  // --- Summary report ---
  const { data: approvedSubs } = await supabase
    .from("image_submissions")
    .select("id, level_id, discord_user_id")
    .eq("status", "approved");

  if (approvedSubs?.length) {
    const levelCounts = new Map<string, number>();
    const userCounts = new Map<string, number>();

    for (const s of approvedSubs) {
      levelCounts.set(
        s.level_id,
        (levelCounts.get(s.level_id) ?? 0) + 1,
      );
      userCounts.set(
        s.discord_user_id,
        (userCounts.get(s.discord_user_id) ?? 0) + 1,
      );
    }

    const levelStats = levels.map((l) => ({
      level_number: l.level_number,
      name: l.level_name,
      count: levelCounts.get(l.id) ?? 0,
    }));

    const least10 = [...levelStats]
      .sort((a, b) => a.count - b.count)
      .slice(0, 10);
    const most10 = [...levelStats]
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);

    const topUsers = [...userCounts.entries()]
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5);

    const userNames = new Map<string, string>();
    for (const [userId] of topUsers) {
      try {
        const res = await discordFetch(
          `${DISCORD_API}/users/${userId}`,
          { headers: discordHeaders },
        );
        if (res.ok) {
          const user = await res.json();
          userNames.set(userId, user.global_name || user.username);
        } else {
          userNames.set(userId, `Unknown User (${userId})`);
        }
      } catch {
        userNames.set(userId, `Unknown User (${userId})`);
      }
    }

    const fmt = (
      list: { level_number: string; name: string; count: number }[],
    ) =>
      list
        .map(
          (l, i) =>
            `${i + 1}. **${l.level_number}** — ${l.name} (${l.count})`,
        )
        .join("\n");

    const fmtUsers = topUsers
      .map(
        ([uid, count], i) =>
          `${i + 1}. **${userNames.get(uid)}** — ${count} approved submission${count !== 1 ? "s" : ""}`,
      )
      .join("\n");

    const summary = [
      `📊 **Submission Summary**`,
      ``,
      `**Approved this cycle:** ${totalApproved}`,
      `**Total approved:** ${approvedSubs.length}`,
      ``,
      `📉 **Levels with fewest submissions:**`,
      fmt(least10),
      ``,
      `📈 **Levels with most submissions:**`,
      fmt(most10),
      ``,
      `🏆 **Top contributors:**`,
      fmtUsers,
    ].join("\n");

    await sendMessage(REPORT_CHANNEL_ID, summary);
  } else {
    await sendMessage(
      REPORT_CHANNEL_ID,
      "📊 **Submission Summary** — No approved submissions yet.",
    );
  }

  const elapsed = (performance.now() - start).toFixed(0);
  console.log(
    `[dispatch] Done in ${elapsed}ms — ingested: ${totalIngested}, resolved: ${totalResolved}, stale: ${totalStale}`,
  );

  return Response.json({
    ok: true,
    ingested: totalIngested,
    resolved: totalResolved,
    approved: totalApproved,
    stale: totalStale,
  });
});
