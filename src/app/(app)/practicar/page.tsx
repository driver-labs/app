import { redirect } from "next/navigation";
import { scenarios } from "@/core/scenarios";

export default function PracticarIndexPage() {
  redirect(`/practicar/${scenarios[0]?.id ?? "stop-01"}`);
}
