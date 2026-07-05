import { redirect } from "next/navigation";

type PracticasScenarioAliasProps = {
  params: Promise<{ id: string }>;
};

export default async function PracticasScenarioAliasPage({
  params,
}: PracticasScenarioAliasProps) {
  const { id } = await params;
  redirect(`/practicar/${id}`);
}
