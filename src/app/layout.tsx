import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "sonner";
import EnvRibbon from "@/components/env-ribbon";
import { parseEnvRibbonLabel } from "@/lib/envRibbon";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Vivance Supervision",
  description: "SuperAdmin portal for Vivance platform",
  icons: {
    icon: "/vivance-logo.png",
    shortcut: "/vivance-logo.png",
    apple: "/vivance-logo.png",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const envRibbonLabel = parseEnvRibbonLabel();
  const ribbonStyle = envRibbonLabel
    ? ({ ["--env-ribbon-height" as string]: "2rem" } as React.CSSProperties)
    : undefined;

  return (
    <html
      lang="en"
      style={ribbonStyle}
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        {envRibbonLabel ? <EnvRibbon label={envRibbonLabel} /> : null}
        {children}
        <Toaster richColors position="top-right" />
      </body>
    </html>
  );
}
