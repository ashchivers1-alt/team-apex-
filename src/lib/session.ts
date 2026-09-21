import { getIronSession, IronSession, SessionOptions } from "iron-session";
import { cookies } from "next/headers";

export interface SessionData {
  isLoggedIn: boolean;
  coachEmail?: string;
}

const sessionPassword = process.env.SESSION_SECRET;
if (!sessionPassword || sessionPassword.length < 32) {
  // Fails loudly at startup rather than silently issuing insecure cookies.
  throw new Error(
    "SESSION_SECRET must be set to a random string of at least 32 characters. See .env.example."
  );
}

export const sessionOptions: SessionOptions = {
  cookieName: "team-apexx-session",
  password: sessionPassword,
  ttl: 60 * 60 * 24 * 14, // 14 days
  cookieOptions: {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production"
  }
};

export async function getAppSession(): Promise<IronSession<SessionData>> {
  return getIronSession<SessionData>(await cookies(), sessionOptions);
}
