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
    if (payload.data.type === 4) {
      return Response.json({ type: 12 });
    }

    if (payload.data.name === "channel-unsubscribe") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { error, count } = await supabase
        .from("daily_notification_channels")
        .delete({ count: "exact" })
        .eq("guild_id", payload.guild_id)
        .eq("channel_id", payload.channel_id);

      if (error || count === 0) {
        return Response.json({
          type: 4,
          data: {
            content:
              "This channel doesn't have daily notifications enabled.",
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

    if (payload.data.name === "stats") {
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  const { data: stats, error } = await supabase.rpc("get_daily_stats");

    if (error || !stats) {
      return Response.json({
        type: 4,
        data: { content: "Failed to fetch stats.", flags: 64 },
      });
    }

    // Next reset: midnight Nicaragua (UTC-6)
    const now = new Date();
    const nicaraguaNow = new Date(
      now.toLocaleString("en-US", { timeZone: "America/Managua" }),
    );
    const nextMidnight = new Date(nicaraguaNow);
    nextMidnight.setDate(nextMidnight.getDate() + 1);
    nextMidnight.setHours(0, 0, 0, 0);
    const msLeft = nextMidnight.getTime() - nicaraguaNow.getTime();

    const hours = Math.floor(msLeft / 3_600_000);
    const minutes = Math.floor((msLeft % 3_600_000) / 60_000);

    const winPct =
      stats.total_players > 0
        ? Math.round((stats.total_wins / stats.total_players) * 100)
        : 0;

    const lossPct =
      stats.total_players > 0
        ? Math.round((stats.total_losses / stats.total_players) * 100)
        : 0;

    return Response.json({
      type: 4,
      data: {
          embeds: [
            {
              title: "📊 Today's ULTRAKIDLE",
              color: 0xff0000,
              description: [
                "```",
                `Players    ${stats.total_players}`,
                `Wins       ${stats.total_wins} (${winPct}%)`,
                `Losses     ${stats.total_losses} (${lossPct}%)`,
                "```",
                `Next enemy in **${hours}h ${minutes}m**`,
              ].join("\n"),
            },
          ],
        components: PLAY_BUTTONS,
      },
    });
  }

    if (payload.data.name === "random-level") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

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
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { data: enemies } = await supabase
        .from("ultrakill_enemies")
        .select("name, icon_urls, wiki_link");

      if (!enemies || enemies.length === 0) {
        return Response.json({
          type: 4,
          data: { content: "No enemies found.", flags: 64 },
        });
      }

      const enemy = enemies[Math.floor(Math.random() * enemies.length)];
      const urls: string[] = enemy.icon_urls ?? [];
      const wikiUrl = enemy.wiki_link ?? "https://ultrakidle.online";

      // First embed has the title, rest are image-only (Discord renders them as a gallery)
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
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      // Ensure guild exists before linking notification channel
      const { error: guildError } = await supabase.from("guilds").upsert(
        { guild_id: payload.guild_id },
        { onConflict: "guild_id" },
      );

      if (guildError) {
        console.error("Error upserting guild:", guildError);
        return Response.json({
          type: 4,
          data: {
            content: "Failed to initialize guild data.",
            flags: 64,
          },
        });
      }

      const { error } = await supabase.from("daily_notification_channels").upsert({
        guild_id: payload.guild_id,
        channel_id: payload.channel_id,
        configured_by: payload.member.user.id,
      });

      if (error) {
        console.error("Error upserting notification channel:", error);
        return Response.json({
          type: 4,
          data: {
            content: "Failed to set notification channel.",
            flags: 64,
          },
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
            "🟨 Partial property match",
            "🟥 Incorrect property match",
            "",
            "### Properties Tracked",
            "- **Type:** ???, Demon, Machine, Husk, Angel, or Prime Soul",
            "- **Weight:** Light, Medium, Heavy, or Superheavy",
            "- **Health:** Numeric comparison. Target can be higher ▲ or lower ▼. Yellow means the value is within 10 HP of the target. For enemies with multiple variants, the highest variant's health is used. For enemies with multiple phases, health is the sum of all phases.",
            "- **Total Levels:** Number of levels the enemy appears in. Target can be higher ▲ or lower ▼. Yellow indicates value is within 3 levels of target",
            "- **Registered At:** Level of first encounter. Target can be later ▲ or earlier ▼ (ordered according to [speedrun.com](https://www.speedrun.com/ultrakill/levels)). Yellow means the target enemy also appears in this level.",
          ].join("\n"),
          components: PLAY_BUTTONS,
        },
      });
    }

    if (payload.data.name === "share") {
      const discordId = payload.member.user.id;
      const displayName =
        payload.member.nick ||
        payload.member.user.global_name ||
        payload.member.user.username;

      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { data, error } = await supabase.rpc("get_daily_share", {
        p_discord_id: discordId,
      });

      if (error || !data) {
        return Response.json({
          type: 4,
          data: {
            content: "You haven't completed today's ULTRAKIDLE yet!",
            flags: 64,
            components: PLAY_BUTTONS,
          },
        });
      }

      const result = data.is_win ? `${data.attempts}/5` : "X/5";

      return Response.json({
        type: 4,
        data: {
          content: `**${displayName}** — ULTRAKIDLE #${data.day_number} ${result}\n\n${data.grid}\n\u200b`,
          components: PLAY_BUTTONS,
        },
      });
    }
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
