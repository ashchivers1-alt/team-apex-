import ClientDetailShell from "@/components/client-detail/ClientDetailShell";

export default async function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <ClientDetailShell clientId={id} />;
}
