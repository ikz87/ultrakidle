import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";

Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, Authorization",
  };

  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { code, client_id } = await req.json();

    let clientSecret = "";
    if (client_id === Deno.env.get("DISCORD_CLIENT_ID_PROD")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET_PROD")!;
    } else if (client_id === Deno.env.get("DISCORD_CLIENT_ID_DEV")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET_DEV")!;
    }

    if (!clientSecret) {
      throw new Error("Invalid or missing Client ID configuration");
    }

    // 1. Exchange code for Discord Access Token & Metadata
    const tokenResponse = await fetch("https://discord.com/api/oauth2/token", {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        client_id,
        client_secret: clientSecret,
        grant_type: "authorization_code",
        code,
      }),
    });

    const tokenData = await tokenResponse.json();
    if (!tokenResponse.ok) throw new Error(tokenData.error_description || "Token exchange failed");

    // Extract guild_id provided by Discord if launched from a server
    const launchedGuildId = tokenData.guild_id || null;

    // 2. Get Discord User Profile
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();

    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: { autoRefreshToken: false, persistSession: false },
      }
    );

    const email = `${discordUser.id}@discord.internal`;
    const password = `discord_${discordUser.id}_${Deno.env.get("USER_PASSWORD_SALT")}`;

    // 3. Sign in or Sign up logic
    const { data: signInData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    let authData = signInData;

    if (authError) {
      const { error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          discord_id: discordUser.id,
          full_name: discordUser.global_name || discordUser.username,
        },
      });

      if (signUpError) {
        // If user exists but password changed/stale, update it
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users?.users?.find((u) => u.email === email);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, { password });
        } else {
          throw signUpError;
        }
      }

      const login = await supabaseAdmin.auth.signInWithPassword({ email, password });
      if (login.error) throw login.error;
      authData = login.data;
    }

    if (!authData?.user) throw new Error("Could not establish a user session");

    // 4. Sync Profile and Guild Membership
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    await supabaseAdmin.from("profiles").upsert({
      id: authData.user.id,
      discord_name: discordUser.global_name || discordUser.username,
      avatar_url: avatarUrl,
      updated_at: new Date().toISOString(),
    });

    if (launchedGuildId) {
      await supabaseAdmin.from("user_guilds").upsert({
        user_id: authData.user.id,
        guild_id: launchedGuildId,
        last_seen_at: new Date().toISOString(),
      });
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        supabase_session: authData.session,
        discord_user: discordUser,
        guild_id: launchedGuildId,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      }
    );
  } catch (err) {
    const error = err as Error;
    console.error("discord-token error:", error.message);
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
