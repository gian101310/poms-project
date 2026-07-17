import { NextResponse } from "next/server";

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { }
  return NextResponse.json({ ok: body.password === "TropangBossGv1@!" });
}
