import type { Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
// @ts-ignore: CSS imports require type declarations in this setup
import "./globals.css";

export const metadata: Metadata = {
  title: "NodoCalc",
  description: "Plataforma de cálculo para ingeniería civil",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <ClerkProvider>
      <html lang="es">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
