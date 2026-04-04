import { DiscordSDK } from "@discord/embedded-app-sdk";
import { useEffect } from "react";
import { supabase } from "./supabaseClient";

const DISCORD_URL = "https://discord.com/oauth2/authorize?client_id=1478255175926808696&permissions=51200&scope=bot";
export const DiscordRedirect = () => {
    useEffect(() => {
        window.location.replace(DISCORD_URL);
    }, []);

    return null;
};

// Initialize Discord SDK lazily to avoid errors outside of Discord
export let discordSdk: DiscordSDK | null = null;
let currentGuildId: string | null = null;

export function isRunningInDiscord() {
    return typeof window !== "undefined" && window.parent !== window;
}

export function getGuildId() {
    if (discordSdk) return discordSdk.guildId;
    return currentGuildId;
}

export async function setupDiscord() {
    if (!discordSdk) {
        discordSdk = new DiscordSDK(import.meta.env.VITE_DISCORD_CLIENT_ID);
    }

    await discordSdk.ready();
    currentGuildId = discordSdk.guildId;

    const clientId = import.meta.env.VITE_DISCORD_CLIENT_ID;

    // 1. Authorize: Get the OAuth2 code from the Discord Client
    const { code } = await discordSdk.commands.authorize({
        client_id: clientId,
        response_type: "code",
        state: "",
        prompt: "none",
        scope: ["identify", "guilds"],
    });

    // 2. Token Exchange: Call Supabase Edge Function
    const { data, error } = await supabase.functions.invoke("discord-token", {
        body: {
            code,
            client_id: clientId,
            guild_id: discordSdk.guildId,
            channel_id: discordSdk.channelId,
        },
    });

    if (error) throw error;

    // 3. Supabase Auth: Sync the session returned by the Edge Function
    await supabase.auth.setSession({
        access_token: data.supabase_session.access_token,
        refresh_token: data.supabase_session.refresh_token,
    });

    // 4. SDK Auth: Authenticate the SDK with the Discord access token
    await discordSdk.commands.authenticate({
        access_token: data.access_token,
    });

    return {
        sdk: discordSdk,
        user: data.discord_user,
        guildId: discordSdk.guildId,
    };
}
