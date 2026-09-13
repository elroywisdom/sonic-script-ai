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
  title: "Sonic AI — Multi-Modal Creative & Media Studio",
  description: "Next-generation AI studio for audio transcription, viral short clips, and generative AI filmmaking.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable} dark`} suppressHydrationWarning>
      <body className="min-h-screen bg-[#0D0D0D] text-white antialiased font-sans selection:bg-[#00D4B4]/30 selection:text-[#00D4B4]" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
