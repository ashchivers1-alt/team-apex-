import bcrypt from "bcryptjs";

/**
 * Single-coach credential check. Supports either a bcrypt hash
 * (COACH_PASSWORD_HASH, recommended) or a plaintext password
 * (COACH_PASSWORD, simplest for a first local run). If both are unset,
 * login is refused outright rather than falling back to a default
 * password.
 */
export async function verifyCoachCredentials(email: string, password: string): Promise<boolean> {
  const expectedEmail = process.env.COACH_EMAIL;
  if (!expectedEmail || email.trim().toLowerCase() !== expectedEmail.trim().toLowerCase()) {
    return false;
  }

  const hash = process.env.COACH_PASSWORD_HASH;
  if (hash) {
    return bcrypt.compare(password, hash);
  }

  const plain = process.env.COACH_PASSWORD;
  if (plain) {
    return timingSafeEqual(password, plain);
  }

  return false;
}

function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    // Still do a comparison of equal length to keep timing roughly constant.
    const padded = a.padEnd(b.length, "\0");
    let mismatch = 1;
    for (let i = 0; i < b.length; i++) {
      mismatch |= padded.charCodeAt(i) ^ b.charCodeAt(i);
    }
    return false;
  }
  let mismatch = 0;
  for (let i = 0; i < a.length; i++) {
    mismatch |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return mismatch === 0;
}
