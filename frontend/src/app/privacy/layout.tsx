import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy — ARXEVO",
  description:
    "Your essay is never stored. Only a cryptographic hash is kept. Privacy is an architectural commitment, not a policy.",
  openGraph: {
    title: "Privacy — ARXEVO",
    description:
      "Your essay is never stored. Only a cryptographic hash is kept. Privacy is an architectural commitment, not a policy.",
    url: "https://arxevo.filtree.in/privacy",
  },
  twitter: {
    card: "summary_large_image",
    title: "Privacy — ARXEVO",
    description:
      "Your essay is never stored. Only a cryptographic hash is kept. Privacy is an architectural commitment, not a policy.",
  },
};

export default function PrivacyLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <>{children}</>;
}
