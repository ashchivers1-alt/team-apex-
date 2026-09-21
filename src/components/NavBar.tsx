"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";

export default function NavBar({ coachEmail }: { coachEmail?: string }) {
  const pathname = usePathname();
  const router = useRouter();

  const links = [
    { href: "/dashboard", label: "Dashboard" },
    { href: "/clients", label: "Clients" },
    { href: "/data", label: "Data" }
  ];

  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  }

  return (
    <nav className="no-print border-b border-ink-100 bg-white">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3 sm:px-6 lg:px-8">
        <div className="flex items-center gap-6">
          <Link href="/dashboard" className="text-lg font-bold text-apex-700">
            Team Apexx
          </Link>
          <div className="hidden gap-1 sm:flex">
            {links.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className={`rounded-md px-3 py-1.5 text-sm font-medium ${
                  pathname.startsWith(l.href)
                    ? "bg-apex-50 text-apex-700"
                    : "text-ink-600 hover:bg-ink-50"
                }`}
              >
                {l.label}
              </Link>
            ))}
          </div>
        </div>
        <div className="flex items-center gap-3">
          {coachEmail && <span className="hidden text-xs text-ink-500 sm:inline">{coachEmail}</span>}
          <button onClick={handleLogout} className="btn-secondary">
            Log out
          </button>
        </div>
      </div>
      <div className="flex gap-1 border-t border-ink-100 px-4 py-1.5 sm:hidden">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className={`rounded-md px-2 py-1 text-xs font-medium ${
              pathname.startsWith(l.href) ? "bg-apex-50 text-apex-700" : "text-ink-600"
            }`}
          >
            {l.label}
          </Link>
        ))}
      </div>
    </nav>
  );
}
