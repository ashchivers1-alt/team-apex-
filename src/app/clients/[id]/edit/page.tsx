"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import ClientForm, { ClientFormValues } from "@/components/ClientForm";

export default function EditClientPage() {
  const params = useParams<{ id: string }>();
  const [initial, setInitial] = useState<ClientFormValues | null>(null);

  useEffect(() => {
    fetch(`/api/clients/${params.id}`)
      .then((r) => r.json())
      .then((d) => {
        const c = d.client;
        setInitial({
          ...c,
          bodyFatDate: c.bodyFatDate ? c.bodyFatDate.slice(0, 10) : null,
          targetDate: c.targetDate ? c.targetDate.slice(0, 10) : null,
          showDate: c.showDate ? c.showDate.slice(0, 10) : null
        });
      });
  }, [params.id]);

  if (!initial) return <p className="text-ink-400">Loading...</p>;

  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">Edit {initial.name}</h1>
      <ClientForm initial={initial} />
    </div>
  );
}
