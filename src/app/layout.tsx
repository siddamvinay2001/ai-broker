import type { Metadata } from "next";
import { Fraunces, Inter } from "next/font/google";
import "./globals.css";

const fraunces = Fraunces({
  variable: "--font-fraunces",
  subsets: ["latin"],
});

const inter = Inter({
  variable: "--font-inter",
  subsets: ["latin"],
});

const DESCRIPTION =
  "AI-guided discovery for Dubai's finest addresses - describe your brief and we match the areas, homes and brokers built for how you want to live.";

export const metadata: Metadata = {
  // TODO: repoint to the production domain once deployed (see CLAUDE.md).
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL ?? "http://localhost:3000"),
  title: "Majlis",
  description: DESCRIPTION,
  openGraph: {
    title: "Majlis",
    description: DESCRIPTION,
    type: "website",
  },
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="en"
      className={`${fraunces.variable} ${inter.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-ground text-ink font-sans">
        {children}
      </body>
    </html>
  );
}
