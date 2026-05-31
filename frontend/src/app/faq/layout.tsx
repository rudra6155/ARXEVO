import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Questions — ARXEVO",
  description:
    "Everything people actually ask. Nothing we are afraid to answer. Honest answers about archetypes, privacy, and ARXEVO.",
  openGraph: {
    title: "Questions — ARXEVO",
    description:
      "Everything people actually ask. Nothing we are afraid to answer. Honest answers about archetypes, privacy, and ARXEVO.",
    url: "https://arxevo.filtree.in/faq",
  },
  twitter: {
    card: "summary_large_image",
    title: "Questions — ARXEVO",
    description:
      "Everything people actually ask. Nothing we are afraid to answer. Honest answers about archetypes, privacy, and ARXEVO.",
  },
};

export default function FAQLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
