"use client";

import { useRef, useState } from "react";

export default function DataPage() {
  const [importing, setImporting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  async function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (
      !confirm(
        "Restoring a backup REPLACES ALL current data in this app with the contents of the file. This cannot be undone. Continue?"
      )
    ) {
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    setImporting(true);
    setMessage(null);
    try {
      const text = await file.text();
      const json = JSON.parse(text);
      const res = await fetch("/api/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(json)
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        setMessage(`Import failed: ${data.error ?? "unknown error"}`);
      } else {
        setMessage("Import complete. All data has been replaced with the backup file.");
      }
    } catch {
      setMessage("That file could not be read as JSON.");
    }
    setImporting(false);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <h1 className="text-2xl font-bold">Data: export, backup &amp; restore</h1>

      <section className="card space-y-3">
        <h2 className="section-title">Export / backup</h2>
        <p className="text-sm text-ink-500">
          Downloads a single JSON file containing every client, plan and check-in currently stored. Keep this
          somewhere safe — it is the only way to recover data if something goes wrong.
        </p>
        <a href="/api/export" className="btn-primary inline-block">
          Download backup (JSON)
        </a>
      </section>

      <section className="card space-y-3">
        <h2 className="section-title">Restore from backup</h2>
        <p className="text-sm text-ink-500">
          Uploading a backup file <strong>replaces all current data</strong> in this app with the contents of
          the file. This is irreversible from within the app — make sure you have a current export of anything
          you don&apos;t want to lose first.
        </p>
        <input ref={fileInputRef} type="file" accept="application/json" onChange={handleImport} disabled={importing} />
        {importing && <p className="text-sm text-ink-500">Restoring...</p>}
        {message && <p className="text-sm text-ink-700">{message}</p>}
      </section>

      <section className="card space-y-2 text-sm text-ink-500">
        <h2 className="section-title text-ink-900">About this app&apos;s data</h2>
        <p>
          Data is stored in a local SQLite database file on the server this app runs on. See the README for
          this deployment&apos;s specific scope (local single-user vs. hosted) and its authentication and
          backup arrangements.
        </p>
      </section>
    </div>
  );
}
