import ClientForm from "@/components/ClientForm";

export default function NewClientPage() {
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="mb-6 text-2xl font-bold">New client</h1>
      <ClientForm />
    </div>
  );
}
