// Usage: node scripts/hash-password.mjs "your-password"
// Prints a bcrypt hash to paste into COACH_PASSWORD_HASH in .env.
import bcrypt from "bcryptjs";

const password = process.argv[2];
if (!password) {
  console.error('Usage: node scripts/hash-password.mjs "your-password"');
  process.exit(1);
}

const hash = bcrypt.hashSync(password, 12);
console.log(hash);
