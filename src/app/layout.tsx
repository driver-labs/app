import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriverLab RAG Normativo",
  description: "Prueba interna de ingesta documental y RAG normativo.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
