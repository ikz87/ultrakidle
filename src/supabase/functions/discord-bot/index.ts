import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;

const PLAY_BUTTONS = [
  {
    type: 1,
    components: [
      {
        type: 2,
        style: 2,
        label: "Play on Discord",
        custom_id: "launch_activity",
        emoji: { name: "🎮" },
      },
      {
        type: 2,
        style: 5,
        label: "Open in browser",
        url: "https://ultrakidle.online/",
        emoji: { name: "🌐" },
      },
    ],
  },
];

serve(async (req) => {
  const signature = req.headers.get("x-signature-ed25519");
  const timestamp = req.headers.get("x-signature-timestamp");
  const body = await req.text();

  if (!signature || !timestamp || !DISCORD_PUBLIC_KEY) {
    return new Response("Missing signature headers or public key", {
      status: 401,
    });
  }

  const isValid = nacl.sign.detached.verify(
    new TextEncoder().encode(timestamp + body),
    hexToUint8Array(signature),
    hexToUint8Array(DISCORD_PUBLIC_KEY),
  );

  if (!isValid) {
    return new Response("Invalid signature", { status: 401 });
  }

  const payload = JSON.parse(body);

  if (payload.type === 1) {
    return Response.json({ type: 1 });
  }

  if (payload.type === 2) {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } },
    );

    if (payload.data.type === 4) {
      return Response.json({ type: 12 });
    }

    if (payload.data.name === "channel-unsubscribe") {
      const { error, count } = await supabase
        .from("daily_notification_channels")
        .delete({ count: "exact" })
        .eq("guild_id", payload.guild_id)
        .eq("channel_id", payload.channel_id);

      if (error || count === 0) {
        return Response.json({
          type: 4,
          data: {
            content: "This channel doesn't have daily notifications enabled.",
            flags: 64,
          },
        });
      }

      return Response.json({
        type: 4,
        data: {
          content:
            "🛑 Daily ULTRAKIDLE notifications have been disabled for this channel.",
        },
      });
    }

    if (payload.data.name === "ping-me") {
      const discordId = payload.member.user.id;
      const { error, count } = await supabase
        .from("profiles")
        .update({ pings_opted_in: true }, { count: "exact" })
        .eq("discord_id", discordId);

      if (error || count === 0) {
        return Response.json({
          type: 4,
          data: {
            content:
              "Couldn't update your preference. Make sure you have opened ULTRAKIDLE on discord before.",
            flags: 64,
          },
        });
      }

      return Response.json({
        type: 4,
        data: {
          content: "✅ You'll be pinged in daily notifications from now on.",
          flags: 64,
        },
      });
    }

    if (payload.data.name === "dont-ping-me") {
      const discordId = payload.member.user.id;
      const { error, count } = await supabase
        .from("profiles")
        .update({ pings_opted_in: false }, { count: "exact" })
        .eq("discord_id", discordId);

      if (error || count === 0) {
        return Response.json({
          type: 4,
          data: {
            content:
              "Couldn't update your preference. Make sure you have opened ULTRAKIDLE on discord before.",
            flags: 64,
          },
        });
      }

      return Response.json({
        type: 4,
        data: {
          content: "🛑 You'll no longer be pinged in daily notifications.",
          flags: 64,
        },
      });
    }

    if (payload.data.name === "stats") {
      const { data: stats, error } = await supabase.rpc("get_daily_stats");

      const now = new Date();
      const nicaraguaNow = new Date(
        now.toLocaleString("en-US", { timeZone: "America/Managua" }),
      );
      const todayStr = nicaraguaNow.toISOString().split("T")[0];

      const { data: infernoSet } = await supabase
        .from("inferno_daily_sets")
        .select("id")
        .eq("game_date", todayStr)
        .single();

      let infernoLines: string[] = [];

      if (infernoSet) {
        const { data: infernoCache } = await supabase
          .from("inferno_daily_stats_cache")
          .select("total_score_sum, total_completed")
          .eq("set_id", infernoSet.id)
          .single();

        const { data: timeData } = await supabase
          .from("inferno_results")
          .select("total_time_seconds")
          .eq("set_id", infernoSet.id)
          .not("completed_at", "is", null);

        const completed = infernoCache?.total_completed ?? 0;
        const avgScore =
          completed > 0
            ? Math.round(infernoCache!.total_score_sum / completed)
            : 0;

        let avgTimeStr = "—";
        if (timeData && timeData.length > 0) {
          const totalSecs =
            timeData.reduce(
              (sum: number, r: { total_time_seconds: number }) =>
                sum + (r.total_time_seconds ?? 0),
              0,
            ) / timeData.length;
          const m = Math.floor(totalSecs / 60);
          const s = Math.floor(totalSecs % 60);
          avgTimeStr = `${m}m ${s}s`;
        }

        infernoLines = [
          "",
          "**INFERNOGUESSR**",
          "```",
          `Players    ${completed}`,
          `Avg Score  ${avgScore}/500`,
          `Avg Time   ${avgTimeStr}`,
          "```",
        ];
      }

      const nextMidnight = new Date(nicaraguaNow);
      nextMidnight.setDate(nextMidnight.getDate() + 1);
      nextMidnight.setHours(0, 0, 0, 0);
      const msLeft = nextMidnight.getTime() - nicaraguaNow.getTime();

      const hours = Math.floor(msLeft / 3_600_000);
      const minutes = Math.floor((msLeft % 3_600_000) / 60_000);

      const classicLines: string[] = [];
      if (stats) {
        const winPct =
          stats.total_players > 0
            ? Math.round((stats.total_wins / stats.total_players) * 100)
            : 0;
        const lossPct =
          stats.total_players > 0
            ? Math.round((stats.total_losses / stats.total_players) * 100)
            : 0;

        classicLines.push(
          "**CLASSIC**",
          "```",
          `Players    ${stats.total_players}`,
          `Wins       ${stats.total_wins} (${winPct}%)`,
          `Losses     ${stats.total_losses} (${lossPct}%)`,
          "```",
        );
      }

      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: "📊 Today's Stats",
              color: 0xff0000,
              description: [
                ...classicLines,
                ...infernoLines,
                `Next daily in **${hours}h ${minutes}m**`,
              ].join("\n"),
            },
          ],
          components: PLAY_BUTTONS,
        },
      });
    }

    if (payload.data.name === "random-level") {
      const { data: levels } = await supabase
        .from("levels")
        .select("level_number, level_name, thumbnail_url, wiki_url");

      if (!levels || levels.length === 0) {
        return Response.json({
          type: 4,
          data: { content: "No levels found.", flags: 64 },
        });
      }

      const level = levels[Math.floor(Math.random() * levels.length)];
      const title = `${level.level_number}: ${level.level_name}`;
      const wikiUrl = level.wiki_url ?? "https://ultrakidle.online";

      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: title,
              color: 0xff0000,
              url: wikiUrl,
              image: level.thumbnail_url
                ? { url: level.thumbnail_url }
                : undefined,
            },
          ],
        },
      });
    }

    if (payload.data.name === "random-enemy") {
      const { data: enemies } = await supabase
        .from("ultrakill_enemies")
        .select("name, icon_urls, wiki_link")
        .eq("active", true);

      if (!enemies || enemies.length === 0) {
        return Response.json({
          type: 4,
          data: { content: "No enemies found.", flags: 64 },
        });
      }

      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const urls: string[] = enemy.icon_urls ?? [];
      const wikiUrl = enemy.wiki_link ?? "https://ultrakidle.online";

      const embeds = urls.map((url: string, i: number) => ({
        ...(i === 0 ? { title: enemy.name, color: 0xff0000 } : {}),
        image: { url },
        url: wikiUrl,
      }));

      return Response.json({
        type: 4,
        data: {
          embeds: embeds.length > 0 ? embeds : undefined,
          content: embeds.length === 0 ? `**${enemy.name}**` : "",
        },
      });
    }

    if (payload.data.name === "channel-subscribe") {
      const { error: guildError } = await supabase.from("guilds").upsert(
        { guild_id: payload.guild_id },
        { onConflict: "guild_id" },
      );

      if (guildError) {
        return Response.json({
          type: 4,
          data: { content: "Failed to initialize guild data.", flags: 64 },
        });
      }

      const { error } = await supabase.from("daily_notification_channels").upsert({
        guild_id: payload.guild_id,
        channel_id: payload.channel_id,
        configured_by: payload.member.user.id,
      });

      if (error) {
        return Response.json({
          type: 4,
          data: { content: "Failed to set notification channel.", flags: 64 },
        });
      }

      return Response.json({
        type: 4,
        data: {
          content: `✅ Daily ULTRAKIDLE notifications will be posted in <#${payload.channel_id}>`,
        },
      });
    }

    if (payload.data.name === "ultrakidle") {
      return Response.json({ type: 12 });
    }

    if (payload.data.name === "how-to-play") {
      return Response.json({
        type: 4,
        data: {
          content: [
            "## How to Play",
            "Identify the target enemy in **5 attempts**.",
            "",
            "### Color Indicators",
            "🟩 Correct property match",
            "🟨 Approx. property match",
            "🟥 Incorrect property match",
            "",
            "### Properties Tracked",
            "- **Type:** ???, Demon, Machine, Husk, Angel, or Prime Soul",
            "- **Weight:** Light, Medium, Heavy, or Superheavy",
            "- **Health:** Numeric comparison. Target can be higher ▲ or lower ▼. Yellow means the value is within 10 HP of the target. For enemies with multiple variants, the highest variant's health is used. For enemies with multiple phases, health is the sum of all phases.",
            "- **Total Levels:** Number of levels the enemy appears in. Target can be higher ▲ or lower ▼. Yellow indicates value is within 3 levels of target",
            "- **Registered At:** Level of first encounter. Target can be ◄ earlier or later ► (ordered according to [our level list](https://ultrakidle.online/levels)). Yellow indicates the target is within 10 positions in the level list.",
          ].join("\n"),
          components: PLAY_BUTTONS,
        },
      });
    }

    if (payload.data.name === "cg-top") {
      const { data, error } = await supabase
        .from("cybergrind_leaderboard")
        .select("rank, discord_name, best_wave, avg_accuracy")
        .order("rank", { ascending: true })
        .limit(10);

      if (error || !data) {
        return Response.json({
          type: 4,
          data: { content: "Failed to fetch leaderboard.", flags: 64 },
        });
      }

      const rows = data
        .map(
          (r) =>
            `${r.rank.toString().padEnd(3)} ${r.discord_name.slice(0, 16).padEnd(17)} Wave ${r.best_wave.toString().padEnd(3)} (${Math.round(r.avg_accuracy * 20)}%)`,
        )
        .join("\n");

      return Response.json({
        type: 4,
        data: {
          content: `### 🏆 Cybergrind Top 10\n\`\`\`\nRank Name              Wave     Acc\n${rows}\n\`\`\``,
        },
      });
    }

    if (payload.data.name === "cg-rank") {
      const discordId = payload.member.user.id;
      const { data: profile } = await supabase
        .from("profiles")
        .select("id")
        .eq("discord_id", discordId)
        .maybeSingle();

      if (!profile) {
        return Response.json({
          type: 4,
          data: { content: "Profile not found.", flags: 64 },
        });
      }

      const { data, error } = await supabase
        .from("cybergrind_leaderboard")
        .select("*")
        .eq("user_id", profile.id)
        .maybeSingle();

      if (error || !data) {
        return Response.json({
          type: 4,
          data: {
            content: "You don't have a Cybergrind record yet!",
            flags: 64,
          },
        });
      }

      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: `Cybergrind Stats: ${data.discord_name}`,
              color: 0xff0000,
              fields: [
                { name: "Rank", value: `#${data.rank}`, inline: true },
                { name: "Best Wave", value: `${data.best_wave}`, inline: true },
                {
                  name: "Accuracy",
                  value: `${Math.round(data.avg_accuracy * 20)}%`,
                  inline: true,
                },
                {
                  name: "Total Guesses",
                  value: `${data.total_guesses}`,
                  inline: true,
                },
              ],
            },
          ],
        },
      });
    }

    if (payload.data.name === "share") {
      const discordId = payload.member.user.id;
      const displayName =
        payload.member.nick ||
        payload.member.user.global_name ||
        payload.member.user.username;

      const [dailyRes, infernoRes, profileRes] = await Promise.all([
        supabase.rpc("get_daily_share", { p_discord_id: discordId }),
        supabase.rpc("get_daily_inferno_share", { p_discord_id: discordId }),
        supabase
          .from("profiles")
          .select("id")
          .eq("discord_id", discordId)
          .maybeSingle(),
      ]);

      const { data, error } = dailyRes;
      const { data: infernoData } = infernoRes;
      let streak = 0;

      if (profileRes.data?.id) {
        const { data: streakData } = await supabase
          .from("streak_cache")
          .select("current_streak")
          .eq("user_id", profileRes.data.id)
          .maybeSingle();

        streak = streakData?.current_streak ?? 0;
      }

      if ((error || !data) && !infernoData) {
        return Response.json({
          type: 4,
          data: {
            content: "You haven't completed today's ULTRAKIDLE yet!",
            flags: 64,
            components: PLAY_BUTTONS,
          },
        });
      }

      const parts: string[] = [];

      if (data) {
        const result = data.is_win ? `${data.attempts}/5` : "X/5";
        const streakText = streak > 0 ? ` | 🔥STREAK: ${streak}` : "";
        parts.push(
          `**${displayName}** — ULTRAKIDLE #${data.day_number} ${result}${streakText}\n\n${data.grid}`,
        );
      }

      if (infernoData) {
        parts.push(
          [
            `**${displayName}** — INFERNOGUESSR #${infernoData.day_number}`,
            `PTS: ${infernoData.total_score}/${infernoData.max_score}`,
            `TIME: ${infernoData.time_text}`,
            "",
            infernoData.grid,
          ].join("\n"),
        );
      }

      return Response.json({
        type: 4,
        data: {
          content: parts.join("\n\n") + "\n\u200b",
          components: PLAY_BUTTONS,
        },
      });
    }
  }

  if (payload.data.name === "help") {
      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: "ULTRAKIDLE Bot Commands",
              color: 0xff0000,
              description: [
                "**/ultrakidle**: Open ULTRAKIDLE in Discord.",
                "**/how-to-play**: Show game rules and mechanics.",
                "**/share**: Share your results for today.",
                "**/stats**: Show global stats for today's player activity.",
                "**/cg-top**: View Cybergrind top 10 leaderboard.",
                "**/cg-rank**: View your personal Cybergrind stats.",
                "**/random-level**: Roll a random main level.",
                "**/random-enemy**: Roll a random enemy from the roster.",
                "**/channel-subscribe**: Enable daily notifications for this channel.",
                "**/channel-unsubscribe**: Stop notifications in this channel.",
                "**/ping-me**: Opt-in to being pinged by notifications.",
                "**/dont-ping-me**: Opt-out of notification pings.",
              ].join("\n"),
            },
          ],
        },
      });
    }

  if (payload.type === 3) {
    if (payload.data.custom_id === "launch_activity") {
      return Response.json({ type: 12 });
    }
  }

  return Response.json({ error: "Unknown interaction" }, { status: 400 });
});

function hexToUint8Array(hex: string): Uint8Array {
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < hex.length; i += 2) {
    bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
  }
  return bytes;
}
