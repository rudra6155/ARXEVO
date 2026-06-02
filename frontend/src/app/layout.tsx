import type { Metadata } from "next";
import "./globals.css";
import SkeletonCursor from "@/components/SkeletonCursor";
import AuthProvider from "@/components/AuthProvider";
import ArcIcon from "@/components/ArcIcon";

export const metadata: Metadata = {
  title: {
    default: "ARXEVO — Your origin story starts here",
    template: "%s",
  },
  description:
    "Submit your essay. Discover your archetype. The AI reads what you wrote when no one was watching.",
  metadataBase: new URL("https://arxevo.filtree.in"),
  openGraph: {
    type: "website",
    siteName: "ARXEVO",
    title: "ARXEVO — Your origin story starts here",
    description:
      "Submit your essay. Discover your archetype. The AI reads what you wrote when no one was watching.",
    url: "https://arxevo.filtree.in",
  },
  twitter: {
    card: "summary_large_image",
    title: "ARXEVO — Your origin story starts here",
    description:
      "Submit your essay. Discover your archetype. The AI reads what you wrote when no one was watching.",
  },
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
        <link
          href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;0,700;1,300;1,400;1,500;1,600;1,700&family=DM+Mono:ital,wght@0,300;0,400;0,500;1,300;1,400;1,500&display=swap"
          rel="stylesheet"
        />
        <link rel="icon" href="/icon.svg" type="image/svg+xml" />
      </head>
      <body className="min-h-full flex flex-col">
        <AuthProvider>
          <ArcIcon />
          <SkeletonCursor />
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
