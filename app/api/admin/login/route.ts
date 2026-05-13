import { NextResponse } from "next/server";
import { env } from "@/lib/env";
import { setSessionCookie } from "@/lib/admin-auth";
import { timingSafeEqual } from "crypto";

export const runtime = "nodejs";

export async function POST(req: Request) {
  let body: { password?: string };
  try { body = await req.json(); } catch {
    return NextResponse.json({ error: "bad_json" }, { status: 400 });
  }
  const got = Buffer.from(body.password ?? "");
  const want = Buffer.from(env.ADMIN_PASSWORD());
  const ok = got.length === want.length && timingSafeEqual(got, want);
  if (!ok) return NextResponse.json({ error: "invalid_password" }, { status: 401 });

  setSessionCookie();
  return NextResponse.json({ ok: true });
}
