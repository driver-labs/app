import { readFile } from "node:fs/promises";
import path from "node:path";

export const dynamic = "force-static";
export const runtime = "nodejs";

export async function GET() {
  const filePath = path.join(process.cwd(), "assets", "Manual_de_Senales.pdf");
  const file = await readFile(filePath);

  return new Response(file, {
    headers: {
      "Content-Disposition": 'inline; filename="Manual_de_Senales.pdf"',
      "Content-Type": "application/pdf",
    },
  });
}
