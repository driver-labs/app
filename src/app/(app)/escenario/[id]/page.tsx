import { redirect } from "next/navigation";
import { getScenarioIds } from "@/core/scenarios";

type EscenarioRedirectProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getScenarioIds().map((id) => ({ id }));
}

export default async function EscenarioRedirectPage({
  params,
}: EscenarioRedirectProps) {
  const { id } = await params;
  redirect(`/practica/${id}`);
}
