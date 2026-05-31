import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Your Arc Profile — ARXEVO",
  description:
    "Your archetype has been detected. View your trait radar, origin story, and character card.",
  openGraph: {
    title: "Your Arc Profile — ARXEVO",
    description:
      "Your archetype has been detected. View your trait radar, origin story, and character card.",
    url: "https://arxevo.filtree.in/card",
  },
  twitter: {
    card: "summary_large_image",
    title: "Your Arc Profile — ARXEVO",
    description:
      "Your archetype has been detected. View your trait radar, origin story, and character card.",
  },
};

export default function CardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
