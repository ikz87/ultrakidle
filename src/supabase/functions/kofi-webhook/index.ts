import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

serve(async (req) => {
  try {
    const formData = await req.formData();
    const payload = JSON.parse(formData.get("data") as string);

    if (payload.verification_token !== Deno.env.get("KOFI_VERIFICATION_TOKEN")) {
      return new Response("Unauthorized", { status: 401 });
    }

    // 1. Handle Name (Webhook usually has the UI name, but fallback just in case)
    let displayName = payload.from_name;
    if (!displayName || displayName === "Ko-fi Supporter") {
      displayName = "Anonymous Supporter";
    }

    // 2. Calculate the Expiry Date (Current time + 7 days)
    const boardExpiry = new Date();
    boardExpiry.setDate(boardExpiry.getDate() + 7);

    // 3. Upsert into Supabase
    const { error } = await supabase.from("supporters").upsert(
      {
        kofi_transaction_id: payload.kofi_transaction_id,
        name: displayName,
        email: payload.email,
        amount: parseFloat(payload.amount),
        currency: payload.currency,
        board_expiry: boardExpiry.toISOString(), // <--- THIS IS WHERE IT'S ADDED
        created_at: new Date().toISOString(),
      },
      { onConflict: "kofi_transaction_id" }
    );

    if (error) throw error;

    return new Response("Success", { status: 200 });
  } catch (err) {
    return new Response(err.message, { status: 500 });
  }
});
