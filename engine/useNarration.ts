"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// Narración de escenarios: intenta /api/tts (ElevenLabs) y, si el servidor no
// tiene clave configurada, cae a speechSynthesis del navegador en español.
export function useNarration() {
  const [enabled, setEnabled] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const objectUrlRef = useRef<string | null>(null);
  const requestIdRef = useRef(0);

  const stop = useCallback(() => {
    requestIdRef.current += 1;
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current = null;
    }
    if (objectUrlRef.current) {
      URL.revokeObjectURL(objectUrlRef.current);
      objectUrlRef.current = null;
    }
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      window.speechSynthesis.cancel();
    }
  }, []);

  const speak = useCallback(
    async (text: string) => {
      if (!enabled || !text) return;
      stop();
      const requestId = requestIdRef.current;

      try {
        const response = await fetch("/api/tts", {
          body: JSON.stringify({ text }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });
        if (requestId !== requestIdRef.current) return;

        if (response.ok) {
          const blob = await response.blob();
          if (requestId !== requestIdRef.current) return;
          const url = URL.createObjectURL(blob);
          objectUrlRef.current = url;
          const audio = new Audio(url);
          audioRef.current = audio;
          await audio.play();
          return;
        }
      } catch {
        // Sin red o bloqueado: probar con la voz del navegador.
      }

      if (
        requestId === requestIdRef.current &&
        typeof window !== "undefined" &&
        "speechSynthesis" in window
      ) {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = "es-419";
        utterance.rate = 1.02;
        window.speechSynthesis.speak(utterance);
      }
    },
    [enabled, stop],
  );

  useEffect(() => stop, [stop]);

  useEffect(() => {
    if (!enabled) stop();
  }, [enabled, stop]);

  return { enabled, setEnabled, speak, stop };
}
