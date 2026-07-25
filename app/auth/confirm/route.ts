import type { EmailOtpType } from "@supabase/supabase-js";
import { type NextRequest, NextResponse } from "next/server";
import { createClient } from "@/utils/supabase/server";

export async function GET(request: NextRequest) {
  const tokenHash = request.nextUrl.searchParams.get("token_hash");
  const type = request.nextUrl.searchParams.get("type") as EmailOtpType | null;
  const next = request.nextUrl.searchParams.get("next");
  const safeNext = next?.startsWith("/") && !next.startsWith("//") ? next : "/";

  if (tokenHash && type) {
    const supabase = await createClient();
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type,
    });

    if (!error) {
      const successUrl = new URL(safeNext, request.url);
      successUrl.searchParams.set("auth", "confirmed");
      return NextResponse.redirect(successUrl, {
        headers: { "Cache-Control": "private, no-store" },
      });
    }

    console.error("Supabase email confirmation failed:", error.message);
  }

  return NextResponse.redirect(new URL("/?auth=error", request.url), {
    headers: { "Cache-Control": "private, no-store" },
  });
}
