import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import nacl from "https://esm.sh/tweetnacl@1.0.3";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

const DISCORD_PUBLIC_KEY = Deno.env.get("DISCORD_AUTOMATION_PUBLIC_KEY")!;

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
    if (payload.data.name === "my-submission-stats") {
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

      const { data, error } = await supabase
        .from("image_submissions")
        .select("status, submitter_profiles!inner(discord_user_id)")
        .eq("submitter_profiles.discord_user_id", discordId);

      if (error) {
        console.error("Error fetching submissions:", error);
        return Response.json({
          type: 4,
          data: { content: "Failed to fetch submission stats.", flags: 64 },
        });
      }

      const total = data.length;

      if (total === 0) {
        return Response.json({
          type: 4,
          data: {
            content: "You haven't submitted any images yet.",
            flags: 64,
          },
        });
      }

      const accepted = data.filter(
        (r: { status: string }) => r.status === "approved",
      ).length;
      const rejected = data.filter(
        (r: { status: string }) => r.status === "rejected",
      ).length;
      const pending = data.filter(
        (r: { status: string }) => r.status === "pending",
      ).length;
      const expired = data.filter(
        (r: { status: string }) => r.status === "expired",
      ).length;

      return Response.json({
        type: 4,
        data: {
          embeds: [
            {
              title: `📸 Submission Stats for ${displayName}`,
              color: 0xff0000,
              description: [
                "```",
                `Total      ${total}`,
                `Accepted   ${accepted}`,
                `Rejected   ${rejected}`,
                `Pending    ${pending}`,
                `Expired    ${expired}`,
                "```",
              ].join("\n"),
            },
          ],
          flags: 64,
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
