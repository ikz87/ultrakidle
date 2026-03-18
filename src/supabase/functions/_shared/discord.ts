export const BOT_USER_ID = Deno.env.get("DISCORD_AUTOMATION_BOT_ID")!;
export const DISCORD_API = "https://discord.com/api/v10";
export const LEVEL_PATTERN = /^(\d+-\d+|\d+-[A-Z]\d*|P-\d+)$/i;
export const REACTION_THRESHOLD = 3;

export const discordHeaders = {
  Authorization: `Bot ${Deno.env.get("DISCORD_AUTOMATION_BOT_TOKEN")!}`,
  "Content-Type": "application/json",
};

export async function discordFetch(
  url: string,
  init?: RequestInit,
): Promise<Response> {
  for (let attempt = 0; attempt < 5; attempt++) {
    const res = await fetch(url, init);
    if (res.ok || res.status === 404) return res;

    if (res.status === 429) {
      const body = await res.json();
      const retryAfter = (body.retry_after ?? 1) * 1000;
      console.warn(`[discord] 429, retrying in ${retryAfter}ms`);
      await new Promise((r) => setTimeout(r, retryAfter));
      continue;
    }

    if (res.status >= 500) {
      const backoff = 1000 * 2 ** attempt;
      console.warn(
        `[discord] ${res.status} on ${url}, retrying in ${backoff}ms`,
      );
      await new Promise((r) => setTimeout(r, backoff));
      continue;
    }

    return res;
  }

  throw new Error(`[discord] All retries exhausted for ${url}`);
}

export async function sendMessage(channelId: string, content: string) {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages`,
    {
      method: "POST",
      headers: discordHeaders,
      body: JSON.stringify({ content }),
    },
  );
  if (!res.ok)
    console.error(`[msg] Failed in ${channelId}: ${res.status}`);
}

export async function closeThread(threadId: string) {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${threadId}`,
    {
      method: "PATCH",
      headers: discordHeaders,
      body: JSON.stringify({ archived: true, locked: true }),
    },
  );
  if (!res.ok)
    console.error(
      `[thread] Failed to close ${threadId}: ${res.status}`,
    );
}

export async function addReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    { method: "PUT", headers: discordHeaders },
  );
  if (!res.ok)
    console.error(
      `[react] Failed to add ${emoji} to ${messageId}: ${res.status}`,
    );
}

export async function removeReaction(
  channelId: string,
  messageId: string,
  emoji: string,
) {
  const encoded = encodeURIComponent(emoji);
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}/@me`,
    { method: "DELETE", headers: discordHeaders },
  );
  if (!res.ok && res.status !== 404)
    console.error(
      `[react] Failed to remove ${emoji} from ${messageId}: ${res.status}`,
    );
}

export async function getReactionUsers(
  channelId: string,
  messageId: string,
  emoji: string,
): Promise<string[]> {
  const encoded = encodeURIComponent(emoji);
  const res = await discordFetch(
    `${DISCORD_API}/channels/${channelId}/messages/${messageId}/reactions/${encoded}?limit=100`,
    { headers: discordHeaders },
  );
  if (!res.ok) return [];
  const users: { id: string }[] = await res.json();
  return users.map((u) => u.id).filter((id) => id !== BOT_USER_ID);
}

export async function getActiveForumThreads(
  guildId: string,
  forumChannelId: string,
): Promise<any[]> {
  const res = await discordFetch(
    `${DISCORD_API}/guilds/${guildId}/threads/active`,
    { headers: discordHeaders },
  );
  if (!res.ok) return [];
  const body = await res.json();
  return body.threads.filter(
    (t: any) =>
      t.parent_id === forumChannelId && !t.thread_metadata?.archived,
  );
}

export async function getStarterMessage(
  threadId: string,
): Promise<any | null> {
  const res = await discordFetch(
    `${DISCORD_API}/channels/${threadId}/messages/${threadId}`,
    { headers: discordHeaders },
  );
  if (!res.ok) return null;
  return res.json();
}

export async function rejectThread(
  threadId: string,
  messageId: string,
  reason: string,
) {
  await addReaction(threadId, messageId, "❌");
  await sendMessage(
    threadId,
    `❌ **Submission rejected** — ${reason}`,
  );
  await closeThread(threadId);
}

export function discordAvatarUrl(
  userId: string,
  avatarHash: string | null,
): string {
  if (!avatarHash) {
    const index = (BigInt(userId) >> 22n) % 6n;
    return `https://cdn.discordapp.com/embed/avatars/${index}.png`;
  }
  const ext = avatarHash.startsWith("a_") ? "gif" : "png";
  return `https://cdn.discordapp.com/avatars/${userId}/${avatarHash}.${ext}`;
}

export function checkAuth(req: Request): boolean {
  return (
    req.headers.get("Authorization") ===
    `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  );
}
