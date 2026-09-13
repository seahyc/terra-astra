import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Astra — Earth, Constellated",
  description: "Ask Earth questions by voice, explore geography at every scale, and follow sourced answers with live visual explanations.",
  icons: {
    icon: "/favicon.svg",
    shortcut: "/favicon.svg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
