import AiGenerator from "./AiGenerator";

export const metadata = {
  title: "Generar escenario | Driver Labs",
};

export default function GeneratePage() {
  return (
    <main className="min-h-screen bg-[#f8fafc] px-5 py-10">
      <AiGenerator />
    </main>
  );
}
