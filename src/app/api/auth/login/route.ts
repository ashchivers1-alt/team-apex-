import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getAppSession } from "@/lib/session";
import { verifyCoachCredentials } from "@/lib/authenticate";

const bodySchema = z.object({
  email: z.string().email(),
  password: z.string().min(1)
});

export async function POST(request: NextRequest) {
  const json = await request.json().catch(() => null);
  const parsed = bodySchema.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json({ error: "Enter a valid email and password." }, { status: 400 });
  }

  const ok = await verifyCoachCredentials(parsed.data.email, parsed.data.password);
  if (!ok) {
    return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
  }

  const session = await getAppSession();
  session.isLoggedIn = true;
  session.coachEmail = parsed.data.email;
  await session.save();

  return NextResponse.json({ ok: true });
}
