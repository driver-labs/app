import { redirect } from "next/navigation";
import { getLearningModuleIds } from "@/lib/content/modules";

type LegacyModulePageProps = {
  params: Promise<{ id: string }>;
};

export function generateStaticParams() {
  return getLearningModuleIds().map((id) => ({ id }));
}

export default async function LegacyModulePage({
  params,
}: LegacyModulePageProps) {
  const { id } = await params;
  redirect(`/modulos/${id}`);
}
