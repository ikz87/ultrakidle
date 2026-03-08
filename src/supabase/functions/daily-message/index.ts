import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.45.4";
import { initWasm, Resvg } from "https://esm.sh/@resvg/resvg-wasm@2.6.2";
import resvgWasm from "https://esm.sh/@resvg/resvg-wasm@2.6.2/index_bg.wasm?module";

const BOT_TOKEN = Deno.env.get("DISCORD_BOT_TOKEN")!;

let wasmInitialized = false;
async function ensureWasm() {
  if (!wasmInitialized) {
    await initWasm(resvgWasm);
    wasmInitialized = true;
  }
}

async function fetchAvatarBase64(url: string): Promise<string> {
  try {
    const res = await fetch(url);
    const buf = await res.arrayBuffer();
    const bytes = new Uint8Array(buf);
    let binary = "";
    for (let i = 0; i < bytes.length; i++) {
      binary += String.fromCharCode(bytes[i]);
    }
    const b64 = btoa(binary);
    const mime = res.headers.get("content-type") || "image/png";
    return `data:${mime};base64,${b64}`;
  } catch {
    return "";
  }
}

const COLOR_MAP: Record<string, string> = {
  GREEN: "#00C950",
  YELLOW: "#F0B100",
  RED: "#FB2C36",
};

async function generateResultsImage(
  results: {
    name: string;
    is_win: boolean;
    attempts: number;
    avatar_url?: string;
    colors?: string[][];
  }[],
): Promise<Uint8Array> {
  await ensureWasm();

  const CELL = 16;
  const GAP = 3;
  const GRID_COLS = 6;
  const GRID_ROWS = 5;
  const GRID_W = GRID_COLS * (CELL + GAP) - GAP;
  const GRID_H = GRID_ROWS * (CELL + GAP) - GAP;

  const AVATAR_R = 24;
  const CARD_PAD = 12;
  const CARD_W = AVATAR_R * 2 + CARD_PAD + GRID_W + CARD_PAD * 2;
  const CARD_H = GRID_H + CARD_PAD * 2;
  const CARD_GAP = 16;

  const COLS = 3;
  const totalRows = Math.ceil(results.length / COLS);

  const PAD = 24;
  const totalW = PAD * 2 + COLS * CARD_W + (COLS - 1) * CARD_GAP;
  const totalH =
    PAD * 2 + totalRows * CARD_H + (totalRows - 1) * CARD_GAP;

  const avatars = await Promise.all(
    results.map((r) =>
      r.avatar_url
        ? fetchAvatarBase64(r.avatar_url)
        : Promise.resolve("")
    ),
  );

  let defs = "";
  let cards = "";

  results.forEach((r, i) => {
    const col = i % COLS;
    const row = Math.floor(i / COLS);

    const cx = PAD + col * (CARD_W + CARD_GAP);
    const cy = PAD + row * (CARD_H + CARD_GAP);

    cards += `<rect x="${cx}" y="${cy}" width="${CARD_W}" height="${CARD_H}" fill="#0D0D0D" stroke="#ffffff" stroke-width="1"/>`;

    const ax = cx + CARD_PAD + AVATAR_R;
    const ay = cy + CARD_H / 2;

    if (avatars[i]) {
      defs += `<clipPath id="clip-${i}"><circle cx="${ax}" cy="${ay}" r="${AVATAR_R}"/></clipPath>`;
      cards += `<image href="${avatars[i]}" x="${ax - AVATAR_R}" y="${ay - AVATAR_R}" width="${AVATAR_R * 2}" height="${AVATAR_R * 2}" clip-path="url(#clip-${i})"/>`;
    } else {
      cards += `<circle cx="${ax}" cy="${ay}" r="${AVATAR_R}" fill="#444"/>`;
    }

    cards += `<circle cx="${ax}" cy="${ay}" r="${AVATAR_R}" fill="none" stroke="#ffffff" stroke-width="2"/>`;

    const gridX = cx + CARD_PAD * 2 + AVATAR_R * 2;
    const gridY = cy + CARD_PAD;

    for (let gr = 0; gr < GRID_ROWS; gr++) {
      for (let gc = 0; gc < GRID_COLS; gc++) {
        const x = gridX + gc * (CELL + GAP);
        const y = gridY + gr * (CELL + GAP);

        let fill = "#3a3a3c";
        if (r.colors && r.colors[gr]) {
          const hint = r.colors[gr][gc];
          if (hint && COLOR_MAP[hint]) fill = COLOR_MAP[hint];
        }

        cards += `<rect x="${x}" y="${y}" width="${CELL}" height="${CELL}" fill="${fill}"/>`;
      }
    }
  });

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${totalW}" height="${totalH}">
    <defs>${defs}</defs>
    ${cards}
  </svg>`;

  const resvg = new Resvg(svg, {
    fitTo: { mode: "width", value: totalW * 2 },
  });
  return resvg.render().asPng();
}

function formatMessage(
  data: {
    results: {
      name: string;
      is_win: boolean;
      attempts: number;
    }[];
    streak: number;
    day_number: number;
  },
): string {
  const grouped = new Map<string, string[]>();

  for (const r of data.results) {
    const key = r.is_win ? `${r.attempts}/5` : "X/5";
    if (!grouped.has(key)) grouped.set(key, []);
    grouped.get(key)!.push(r.name);
  }

  const sorted = [...grouped.entries()].sort((a, b) => {
    const aVal = a[0] === "X/5" ? 99 : parseInt(a[0]);
    const bVal = b[0] === "X/5" ? 99 : parseInt(b[0]);
    return aVal - bVal;
  });

  const bestKey = sorted[0][0];
  const lines = sorted.map(([key, names]) => {
    const prefix = key === bestKey && key !== "X/5" ? "👑 " : "";
    return `${prefix}${key}: ${names.join("  ")}`;
  });

  let streakLine = "";
  if (data.streak === 1) {
    streakLine = "The streak begins... 👀 ";
  } else if (data.streak > 1) {
    streakLine = `This server is on a ${data.streak} day streak! 🔥`;
  }

  return (
    `🔴 ULTRAKIDLE #${data.day_number} has ended!\n${streakLine}\nHere are yesterday's results:\n` +
    lines.join("\n") +
    `\n\nA new enemy is waiting!`
  );
}

serve(async (req) => {
  const authHeader = req.headers.get("Authorization");
  if (
    authHeader !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`
  ) {
    return new Response("Unauthorized", { status: 401 });
  }

  const url = new URL(req.url);
  const testChannel = url.searchParams.get("channel");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

  let channels: { guild_id: string; channel_id: string }[];

  if (testChannel) {
    const { data } = await supabase
      .from("daily_notification_channels")
      .select("guild_id, channel_id")
      .eq("channel_id", testChannel);
    channels = data ?? [];
  } else {
    const { data } = await supabase
      .from("daily_notification_channels")
      .select("guild_id, channel_id");
    channels = data ?? [];
  }

  if (!channels?.length) {
    return Response.json({ ok: true, sent: 0 });
  }

  const results = await Promise.allSettled(
    channels.map(async (row) => {
      const { data } = await supabase.rpc("get_guild_daily_summary", {
        p_guild_id: row.guild_id,
      });

      if (!data?.results?.length) return;

      const message = formatMessage(data);
      const png = await generateResultsImage(data.results);

      const form = new FormData();
      form.append(
        "payload_json",
        JSON.stringify({
          content: message,
          attachments: [{ id: 0, filename: "results.png" }],
          components: [
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
          ],
        }),
      );
      form.append(
        "files[0]",
        new Blob([png], { type: "image/png" }),
        "results.png",
      );

      const res = await fetch(
        `https://discord.com/api/v10/channels/${row.channel_id}/messages`,
        {
          method: "POST",
          headers: { Authorization: `Bot ${BOT_TOKEN}` },
          body: form,
        },
      );

      const text = await res.text();
      console.log(
        `[${row.channel_id}] ${res.status}: ${text}`,
      );

      return res;
    }),
  );

  return Response.json({
    ok: true,
    sent: results.filter((r) => r.status === "fulfilled").length,
  });
});
