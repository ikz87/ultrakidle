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
    const { code, client_id, guild_id, channel_id } = await req.json();

    let clientSecret = "";
    if (client_id === Deno.env.get("DISCORD_CLIENT_ID")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET")!;
    } else if (client_id === Deno.env.get("DISCORD_CLIENT_ID_DEV")) {
      clientSecret = Deno.env.get("DISCORD_CLIENT_SECRET_DEV")!;
    }

    if (!clientSecret) {
      throw new Error("Invalid or missing Client ID configuration");
    }

    // 1. Exchange Code for Discord Token
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
    if (!tokenResponse.ok)
      throw new Error(tokenData.error_description || "Token exchange failed");

    console.log(
      `Token exchange scopes for code: ${tokenData.scope || "none"}`
    );

    const launchedGuildId = guild_id || tokenData.guild_id || null;

    // 2. Get Discord User Data
    const userResponse = await fetch("https://discord.com/api/users/@me", {
      headers: { Authorization: `Bearer ${tokenData.access_token}` },
    });
    const discordUser = await userResponse.json();

    // 3. Setup Supabase Clients
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const dbClient = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { autoRefreshToken: false, persistSession: false } }
    );

    const email = `${discordUser.id}@discord.internal`;
    const password = `discord_${discordUser.id}_${Deno.env.get("USER_PASSWORD_SALT")}`;

    // 4. Authenticate / Create User
    let { data: authData, error: authError } =
      await supabaseAdmin.auth.signInWithPassword({ email, password });

    if (authError) {
      const { error: signUpError } =
        await supabaseAdmin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            discord_id: discordUser.id,
            full_name: discordUser.global_name || discordUser.username,
          },
        });

      if (signUpError) {
        const { data: users } = await supabaseAdmin.auth.admin.listUsers();
        const existing = users?.users?.find((u) => u.email === email);
        if (existing) {
          await supabaseAdmin.auth.admin.updateUserById(existing.id, {
            password,
          });
        } else {
          throw signUpError;
        }
      }

      const login = await supabaseAdmin.auth.signInWithPassword({
        email,
        password,
      });
      if (login.error) throw login.error;
      authData = login.data;
    }

    if (!authData?.user) throw new Error("Could not establish a user session");

    // 5. Sync user guilds
    const userGuildsRes = await fetch(
      "https://discord.com/api/users/@me/guilds",
      { headers: { Authorization: `Bearer ${tokenData.access_token}` } }
    );

    if (!userGuildsRes.ok) {
      const body = await userGuildsRes.text();
      console.error(
        `Guild fetch failed for ${discordUser.id}: ${userGuildsRes.status} ${body}`
      );
    } else {
      const currentGuilds: { id: string }[] = await userGuildsRes.json();
      const currentGuildIds = currentGuilds.map((g) => g.id);

      console.log(
        `User ${discordUser.id}: found ${currentGuildIds.length} guilds from Discord`
      );

      const { data: savedGuilds, error: selectError } = await dbClient
        .from("user_guilds")
        .select("guild_id")
        .eq("user_id", authData.user.id);

      if (selectError) {
        console.error(
          `user_guilds select error for ${discordUser.id}:`,
          selectError
        );
      }

      // Only sync guilds that actually exist in our guilds table
      const { data: knownGuilds, error: knownError } = await dbClient
        .from("guilds")
        .select("guild_id")
        .in("guild_id", currentGuildIds);

      if (knownError) {
        console.error(
          `guilds lookup error for ${discordUser.id}:`,
          knownError
        );
      }

      const knownGuildIds = new Set(knownGuilds?.map((g) => g.guild_id) ?? []);
      const savedIds = savedGuilds?.map((g) => g.guild_id) ?? [];

      const toInsert = currentGuildIds
        .filter((id) => knownGuildIds.has(id) && !savedIds.includes(id))
        .map((id) => ({
          user_id: authData.user!.id,
          guild_id: id,
          last_seen_at: new Date().toISOString(),
        }));

      const toDelete = savedIds.filter(
        (id) => !currentGuildIds.includes(id)
      );

      console.log(
        `User ${discordUser.id}: known=${knownGuildIds.size}, toInsert=${toInsert.length}, toDelete=${toDelete.length}, saved=${savedIds.length}`
      );

      if (toInsert.length > 0) {
        const { error: upsertError } = await dbClient
          .from("user_guilds")
          .upsert(toInsert);
        if (upsertError) {
          console.error(
            `user_guilds upsert error for ${discordUser.id}:`,
            upsertError
          );
        }
      }

      if (toDelete.length > 0) {
        const { error: deleteError } = await dbClient
          .from("user_guilds")
          .delete()
          .eq("user_id", authData.user.id)
          .in("guild_id", toDelete);
        if (deleteError) {
          console.error(
            `user_guilds delete error for ${discordUser.id}:`,
            deleteError
          );
        }
      }
    }

    // 6. Update Profile
    const avatarUrl = discordUser.avatar
      ? `https://cdn.discordapp.com/avatars/${discordUser.id}/${discordUser.avatar}.png`
      : null;

    const { error: profileError } = await dbClient.from("profiles").upsert({
      id: authData.user.id,
      discord_id: discordUser.id,
      discord_name: discordUser.global_name || discordUser.username,
      avatar_url: avatarUrl,
      channel_id: channel_id || null,
      updated_at: new Date().toISOString(),
    });

    if (profileError) {
      console.error(
        `Profile upsert error for ${discordUser.id}:`,
        profileError
      );
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
