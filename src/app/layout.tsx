import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "DriverLab | Aprende. Practica. Conduce mejor.",
  description:
    "Plataforma de cultura vial para El Salvador con ley clara, practica guiada y conduccion defensiva.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es" className="h-full antialiased">
      <body className="flex min-h-full flex-col">{children}</body>
    </html>
  );
}
