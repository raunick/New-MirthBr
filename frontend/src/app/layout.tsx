import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "MirthBR - Healthcare Integration Engine",
  description: "High-performance integration engine for healthcare message processing. Process HL7, FHIR, and custom messages with visual flow-based editor.",
  keywords: ["healthcare", "integration", "HL7", "FHIR", "message processing", "mirth"],
  authors: [{ name: "MirthBR Team" }],
  robots: "noindex, nofollow", // Don't index admin tools
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        {children}
      </body>
    </html>
  );
}

