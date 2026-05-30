import type { Metadata } from "next";
import "./globals.css";
import SkeletonCursor from "@/components/SkeletonCursor";

export const metadata: Metadata = {
  title: "ARXEVO",
  description: "Your origin story starts here.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap" rel="stylesheet" />
      </head>
      <body className="min-h-full flex flex-col">
        <SkeletonCursor />
        {children}
      </body>
    </html>
  );
}
