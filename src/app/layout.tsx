import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

export const viewport: Viewport = {
  themeColor: "#0f0f1a",
};

export const metadata: Metadata = {
  title: "To-Do List App",
  description: "Aplikasi To-Do List Mobile - Kelola tugas harian Anda dengan mudah",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.png",
    apple: "/icon.png",
  },
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "To-Do App",
  },
};


export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="id" className={`${inter.variable} antialiased`} suppressHydrationWarning>
      <body className="bg-[#0f0f1a] text-white min-h-screen" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
