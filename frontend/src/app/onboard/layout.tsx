import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Submit Your Origin — ARXEVO",
  description:
    "Submit your college essay, SOP, or personal statement. The system will analyze your writing and assign your archetype.",
  openGraph: {
    title: "Submit Your Origin — ARXEVO",
    description:
      "Submit your college essay, SOP, or personal statement. The system will analyze your writing and assign your archetype.",
    url: "https://arxevo.filtree.in/onboard",
  },
  twitter: {
    card: "summary_large_image",
    title: "Submit Your Origin — ARXEVO",
    description:
      "Submit your college essay, SOP, or personal statement. The system will analyze your writing and assign your archetype.",
  },
};

export default function OnboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
