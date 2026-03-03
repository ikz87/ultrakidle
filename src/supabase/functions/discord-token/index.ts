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
    const { code, client_id, guild_id } = await req.json();

    // 1. Resolve which Client Secret to use based on the incoming Client ID
    let clientSecret = "";
    if (client_id === Deno.env.get("DISCORD_CLIENT_ID_PROD")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET_PROD")!;
    } else if (client_id === Deno.env.get("DISCORD_CLIENT_ID_DEV")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET_DEV")!;
    }

    if (!clientSecret) {
      throw new Error("Invalid or missing Client ID configuration");
    }

    // 2. Exchange code for Discord Access Token
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

    // 3. Get Discord User Profile
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();

    // 4. Initialize Supabase Admin Client
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      },
    );

    // Create a deterministic internal identity
    const email = `${discordUser.id}@discord.internal`;
    const password = `discord_${discordUser.id}_${clientSecret.substring(0, 10)}`;

    // 5. Sign in or Sign up the user in Supabase Auth
    let { data: authData, error: authError } = await supabaseAdmin.auth.signInWithPassword({
      email,
      password,
    });

    if (authError) {
      const { data: signUpData, error: signUpError } = await supabaseAdmin.auth.admin.createUser({
        email,
        password,
        email_confirm: true,
        user_metadata: {
          discord_id: discordUser.id,
          full_name: discordUser.global_name || discordUser.username,
          avatar_url: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
        },
      });

      if (signUpError) throw signUpError;

      // Log in after creating
      const login = await supabaseAdmin.auth.signInWithPassword({ email, password });
      authData = login.data;
    }

    if (!authData?.user) {
      throw new Error("Could not establish a user session");
    }

    console.log("About to upsert profile for:", authData.user.id);

    const { data: profileData, error: profileError } = await supabaseAdmin
      .from("profiles")
      .upsert({
        id: authData.user.id,
        discord_name: discordUser.global_name || discordUser.username,
        avatar_url: `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`,
      })
      .select();

    console.log("Profile result:", JSON.stringify({ profileData, profileError }));


    if (profileError) {
      console.error("Profile upsert failed:", profileError.message);
    }

    // 2. Sync server membership (using the guild_id passed from frontend)
    if (guild_id) {
      await supabaseAdmin.from('user_guilds').upsert({
        user_id: authData.user.id,
        guild_id: guild_id
      });
    }

    return new Response(
      JSON.stringify({
        access_token: tokenData.access_token,
        supabase_session: authData.session,
        discord_user: discordUser,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (err) {
    return new Response(JSON.stringify({ error: err.message }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
      status: 400,
    });
  }
});
