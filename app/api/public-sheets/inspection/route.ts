import { NextResponse } from "next/server";
import { isInspectionPassword } from "@/lib/public-sheets-auth";

export async function POST(req: Request) {
  let body: any = {};
  try { body = await req.json(); } catch { }
  return NextResponse.json({ ok: isInspectionPassword(body.password) });
}
