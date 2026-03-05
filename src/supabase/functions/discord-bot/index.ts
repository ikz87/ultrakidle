import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_PUBLIC_KEY")!;

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
        .eq("guild_id", payload.guild_id);

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
          content: "🛑 Daily ULTRAKIDLE notifications have been disabled for this channel.",
        },
      });
    }

    if (payload.data.name === "channel-subscribe") {
      const supabase = createClient(
        Deno.env.get("SUPABASE_URL")!,
        Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
        { auth: { autoRefreshToken: false, persistSession: false } },
      );

      const { error } = await supabase
        .from("daily_notification_channels")
        .upsert({
          guild_id: payload.guild_id,
          channel_id: payload.channel_id,
          configured_by: payload.member.user.id,
        });

      if (error) {
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
          },
        });
      }

      const result = data.is_win ? `${data.attempts}/5` : "X/5";

      return Response.json({
        type: 4,
        data: {
              content: `**${displayName}** — ULTRAKIDLE #${data.day_number} ${result}\n\n${data.grid}\n\nPlay at https://ultrakidle.online/ or use \`/ultrakidle\` to compete in this server's leaderboard`,
        },
      });
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
