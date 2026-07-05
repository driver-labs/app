export async function POST() {
  return Response.json(
    {
      error:
        "La generacion de escenarios no esta incluida en esta prueba documental RAG.",
    },
    { status: 501 },
  );
}
