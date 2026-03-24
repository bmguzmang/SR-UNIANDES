import type { Metadata } from "next";
import { Plus_Jakarta_Sans } from "next/font/google";
import { AppProviders } from "@/providers/app-providers";
import "@/app/globals.css";

const jakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-jakarta",
});

export const metadata: Metadata = {
  title: "CineMatch Intelligence",
  description:
    "Frontend premium para explicaciones y evaluaciones del recomendador MovieLens.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es" className="dark">
      <body className={jakarta.className}>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
