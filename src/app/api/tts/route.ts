import { NextResponse } from "next/server";
import { z } from "zod";

const requestSchema = z.object({
  text: z.string().min(1).max(1200),
});

const ELEVENLABS_MODEL = "eleven_multilingual_v2";
// Voz por defecto de ElevenLabs con buen soporte de español latino.
const DEFAULT_VOICE_ID = "EXAVITQu4vr4xnSDxMaL";

// Narración TTS de escenarios. Con ELEVENLABS_API_KEY responde audio MP3;
// sin clave responde 501 y el cliente cae a speechSynthesis del navegador.
export async function POST(request: Request) {
  const parsed = requestSchema.safeParse(
    await request.json().catch(() => null),
  );
  if (!parsed.success) {
    return NextResponse.json({ error: "invalid_text" }, { status: 400 });
  }

  const apiKey = process.env.ELEVENLABS_API_KEY;
  if (!apiKey) {
    return NextResponse.json({ error: "tts_not_configured" }, { status: 501 });
  }

  const voiceId = process.env.ELEVENLABS_VOICE_ID ?? DEFAULT_VOICE_ID;
  const response = await fetch(
    `https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`,
    {
      body: JSON.stringify({
        model_id: ELEVENLABS_MODEL,
        text: parsed.data.text,
      }),
      headers: {
        "Content-Type": "application/json",
        "xi-api-key": apiKey,
      },
      method: "POST",
    },
  );

  if (!response.ok || !response.body) {
    return NextResponse.json({ error: "tts_failed" }, { status: 502 });
  }

  return new Response(response.body, {
    headers: {
      "Cache-Control": "no-store",
      "Content-Type": "audio/mpeg",
    },
  });
}
