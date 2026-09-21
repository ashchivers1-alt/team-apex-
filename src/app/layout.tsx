import type { Metadata } from "next";
import "./globals.css";
import { getAppSession } from "@/lib/session";
import NavBar from "@/components/NavBar";

export const metadata: Metadata = {
  title: "Team Apexx Coaching",
  description: "Client management, TDEE/calorie planning and check-in tracking for Team Apexx coaching."
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const session = await getAppSession();

  return (
    <html lang="en-GB">
      <body>
        {session.isLoggedIn && <NavBar coachEmail={session.coachEmail} />}
        <main className="mx-auto max-w-6xl px-4 py-6 sm:px-6 lg:px-8">{children}</main>
      </body>
    </html>
  );
}
