import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "RAP UNIVERSE - Billetterie",
  description: "Achetez votre ticket pour RAP UNIVERSE",
  icons: {
    icon: "/logo-rap-universe.jpeg",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" suppressHydrationWarning>
      <body className={`${inter.className} antialiased bg-black text-white`} suppressHydrationWarning>
        {children}
        <Toaster />
      </body>
    </html>
  );
}
