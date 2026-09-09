import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Terra Astra — Earth, Constellated",
  description: "An Earth drawn in stars. Explore the planet, descend into Singapore, and discover that the constellation was us all along.",
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
