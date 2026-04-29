import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { extname } from "https://deno.land/std@0.208.0/path/mod.ts";
import {
  S3Client,
  PutObjectCommand,
  ListObjectsV2Command,
  DeleteObjectsCommand,
} from "https://esm.sh/@aws-sdk/client-s3@3.484.0";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const r2Client = new S3Client({
  region: "auto",
  endpoint: `https://${Deno.env.get("R2_ACCOUNT_ID")}.r2.cloudflarestorage.com`,
  credentials: {
    accessKeyId: Deno.env.get("R2_ACCESS_KEY_ID")!,
    secretAccessKey: Deno.env.get("R2_SECRET_ACCESS_KEY")!,
  },
});

const DEST_BUCKET = "inferno-daily";
const SOURCE_BUCKET = "level-images";
const DAYS_TO_KEEP = 2;
const MAX_RETRIES = 3;
const RETRY_DELAY_MS = 2000;
const PUBLIC_DOMAIN = "https://bucket.ultrakidle.online";

async function withRetry<T>(fn: () => Promise<T>, label: string): Promise<T> {
  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await fn();
    } catch (err) {
      if (attempt === MAX_RETRIES) throw err;
      console.warn(`${label} failed (attempt ${attempt}/${MAX_RETRIES}): ${err}`);
      await new Promise((r) => setTimeout(r, RETRY_DELAY_MS * attempt));
    }
  }
  throw new Error("unreachable");
}

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { set_id, date } = await req.json();

  try {
    const { data: rounds, error: roundsErr } = await supabase
      .from("inferno_daily_rounds")
      .select(
        `
        id,
        round_number,
        image_submissions (
          storage_path,
          image_url
        )
      `
      )
      .eq("set_id", set_id)
      .order("round_number");

    if (roundsErr) throw roundsErr;
    if (!rounds || rounds.length !== 5) {
      throw new Error(`Expected 5 rounds, got ${rounds?.length}`);
    }

    for (const round of rounds) {
      const sub = round.image_submissions;
      const ext = extname(sub.storage_path || sub.image_url || ".png");
      const destPath = `${date}/${crypto.randomUUID()}${ext}`;

      const fileBuffer = await withRetry(async () => {
        if (sub.storage_path) {
          const res = await fetch(`https://gallery.ultrakidle.online/${sub.storage_path}`);
          if (!res.ok)
            throw new Error(
              `Failed to fetch from R2 Gallery: ${res.statusText} (${sub.storage_path})`
            );
          return res.arrayBuffer();
        } else {
          const res = await fetch(sub.image_url);
          if (!res.ok) throw new Error(`Failed to fetch ${sub.image_url}`);
          return res.arrayBuffer();
        }
      }, `Download round ${round.round_number}`);

      await r2Client.send(
        new PutObjectCommand({
          Bucket: DEST_BUCKET,
          Key: destPath,
          Body: new Uint8Array(fileBuffer),
          ContentType: `image/${ext.replace(".", "")}`,
        })
      );

      const publicUrl = `${PUBLIC_DOMAIN}/${destPath}`;

      const { error: updateErr } = await supabase
        .from("inferno_daily_rounds")
        .update({ public_image_url: publicUrl })
        .eq("id", round.id);

      if (updateErr) throw updateErr;
    }

    await cleanupOldFolders(date);

    return Response.json({ success: true });
  } catch (err) {
    console.error("inferno-daily-setup failed:", err);

    await supabase.from("debug_logs").insert({
      event: "inferno_daily_setup_failed",
      payload: { error: String(err), set_id, date },
    });

    return Response.json({ error: String(err) }, { status: 500 });
  }
});

async function cleanupOldFolders(currentDate: string) {
  const cutoffDate = new Date(currentDate);
  cutoffDate.setDate(cutoffDate.getDate() - DAYS_TO_KEEP);
  const cutoffStr = cutoffDate.toISOString().split("T")[0];

  const listResponse = await r2Client.send(
    new ListObjectsV2Command({
      Bucket: DEST_BUCKET,
      Delimiter: "/",
    })
  );

  if (!listResponse.CommonPrefixes) return;

  for (const prefix of listResponse.CommonPrefixes) {
    const folderName = prefix.Prefix?.replace("/", "");
    if (folderName && folderName < cutoffStr) {
      const folderObjects = await r2Client.send(
        new ListObjectsV2Command({
          Bucket: DEST_BUCKET,
          Prefix: prefix.Prefix,
        })
      );

      if (folderObjects.Contents && folderObjects.Contents.length > 0) {
        await r2Client.send(
          new DeleteObjectsCommand({
            Bucket: DEST_BUCKET,
            Delete: {
              Objects: folderObjects.Contents.map((obj) => ({ Key: obj.Key })),
            },
          })
        );
      }
    }
  }
}
