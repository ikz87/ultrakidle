import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { crypto } from "https://deno.land/std@0.208.0/crypto/mod.ts";
import { extname } from "https://deno.land/std@0.208.0/path/mod.ts";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const DEST_BUCKET = "inferno-daily";
const SOURCE_BUCKET = "level-images"; // <-- Hardcoded source bucket
const DAYS_TO_KEEP = 2;

Deno.serve(async (req) => {
  const auth = req.headers.get("Authorization");
  if (auth !== `Bearer ${Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")}`) {
    return new Response("Unauthorized", { status: 401 });
  }

  const { set_id, date } = await req.json();

  try {
    // 1. Fetch rounds with their source image info
    const { data: rounds, error: roundsErr } = await supabase
      .from("inferno_daily_rounds")
      .select(`
        id,
        round_number,
        image_submissions (
          storage_path,
          image_url
        )
      `)
      .eq("set_id", set_id)
      .order("round_number");

    if (roundsErr) throw roundsErr;
    if (!rounds || rounds.length !== 5) {
      throw new Error(`Expected 5 rounds, got ${rounds?.length}`);
    }

    // 2. Copy each image to the public bucket
    for (const round of rounds) {
      const sub = round.image_submissions;
      const ext = extname(sub.storage_path || sub.image_url || ".png");
      const destPath = `${date}/${crypto.randomUUID()}${ext}`;

      let fileBuffer: ArrayBuffer;

      if (sub.storage_path) {
        // Download from the known source bucket using the exact path
        const { data, error } = await supabase.storage
          .from(SOURCE_BUCKET)
          .download(sub.storage_path);

        if (error) throw new Error(`Failed to download from ${SOURCE_BUCKET}/${sub.storage_path}: ${error.message}`);
        fileBuffer = await data.arrayBuffer();
      } else {
        // Fallback: fetch from external URL (Discord CDN etc.)
        const res = await fetch(sub.image_url);
        if (!res.ok) throw new Error(`Failed to fetch ${sub.image_url}`);
        fileBuffer = await res.arrayBuffer();
      }

      // Upload to public bucket
      const { error: uploadErr } = await supabase.storage
        .from(DEST_BUCKET)
        .upload(destPath, fileBuffer, {
          contentType: `image/${ext.replace(".", "")}`,
          upsert: false,
        });

      if (uploadErr) throw uploadErr;

      // Build the public URL
      const { data: { publicUrl } } = supabase.storage.from(DEST_BUCKET).getPublicUrl(destPath);

      // Update the round row
      const { error: updateErr } = await supabase
        .from("inferno_daily_rounds")
        .update({ public_image_url: publicUrl })
        .eq("id", round.id);

      if (updateErr) throw updateErr;
    }

    // 3. Clean up old folders
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
  const cutoff = new Date(currentDate);
  cutoff.setDate(cutoff.getDate() - DAYS_TO_KEEP);

  const { data: folders } = await supabase.storage.from(DEST_BUCKET).list("", { limit: 100 });
  if (!folders) return;

  for (const folder of folders) {
    if (folder.name < cutoff.toISOString().split("T")[0]) {
      const { data: files } = await supabase.storage.from(DEST_BUCKET).list(folder.name);
      if (files?.length) {
        const paths = files.map((f) => `${folder.name}/${f.name}`);
        await supabase.storage.from(DEST_BUCKET).remove(paths);
      }
    }
  }
}
