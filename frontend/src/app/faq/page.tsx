"use client";

import { useState, useEffect, useRef } from "react";
import Footer from "@/components/Footer";

interface FAQItem {
  question: string;
  answer: string;
}

const FAQ_ITEMS: FAQItem[] = [
  {
    question: "Am I really just one of four types?",
    answer:
      "No. Your archetype is the primary lens through which you engage with the world — not a complete description of who you are. Two people with the same archetype may have nothing else in common. A construction worker who builds for survival and a software engineer who codes for passion might both analyze as Operators. The archetype captures orientation, not biography. Your full character card, including your origin story and trait map, is unique to you.",
  },
  {
    question: "What happens to my essay after I submit it?",
    answer:
      "It is analyzed and immediately discarded. We store a cryptographic hash of your text — a mathematical fingerprint — so we can detect duplicates, but we cannot reverse this hash to recover your original words. Your essay never enters a database. This is an architectural commitment, not just a policy.",
  },
  {
    question: "Can I trust an AI to understand who I am?",
    answer:
      "You should be skeptical of any system that claims to fully understand a person. ARXEVO does not claim that. We claim to identify patterns in your writing that reveal how you think, what you value, and how you engage with problems. Three independent agents analyze your text and reconcile their findings. The result is more rigorous than a single model, but it is still a map — not the territory.",
  },
  {
    question: "What if I disagree with my archetype?",
    answer:
      "That disagreement is worth examining. Sometimes the system is wrong — if you submitted a very short or unrepresentative piece of writing, the analysis will reflect that limitation. Sometimes the system surfaces something true that we resist in ourselves. We recommend submitting again with a longer, more personal piece of writing if the result feels significantly off.",
  },
  {
    question: "Is this a personality test?",
    answer:
      "No. Personality tests ask you questions and map your answers to predetermined categories. ARXEVO reads something you wrote before you knew you were being analyzed — your college essay, your personal statement, your own words about your life. The difference is significant. You cannot optimize for a result you did not know was being measured.",
  },
  {
    question: "Who can see my character card?",
    answer:
      "Only you, unless you choose to share it. Your card is stored under your account and is not visible to other users by default. When you use the share feature, you control what is shared and where. We do not display your card publicly without your explicit action.",
  },
  {
    question: "What is squad matching and when is it coming?",
    answer:
      "Squad matching pairs you with three people whose archetypes complement yours — one Architect, one Catalyst, one Anchor, one Operator — matched by city, energy level, and compatibility score. This feature is currently in development. Join the waitlist on your card page to be notified when matching opens in your city.",
  },
  {
    question: "Do you sell my data?",
    answer:
      "No. We do not sell data to third parties, share it with advertisers, or use it to train AI models. Our business model is the product. If that ever changes, we will notify users directly and provide a full data export and deletion option before any change takes effect.",
  },
  {
    question: "Can I delete my account and all my data?",
    answer:
      "Yes. From your profile settings, you can permanently delete your account and all associated data. This action is irreversible. We do not retain backups of deleted user data after 30 days.",
  },
  {
    question: "Is ARXEVO free?",
    answer:
      "The core experience — essay analysis, character card generation, and archetype assignment — is free permanently. Squad features, advanced analytics, and future premium tools may be offered at a cost. We will always maintain a meaningful free tier.",
  },
  {
    question: "What if I want to update my card?",
    answer:
      "You can resubmit at any time. Each submission generates a new analysis. Your previous cards are saved in your profile history. People change. Your arc should be allowed to evolve.",
  },
  {
    question: "Why does this exist?",
    answer:
      "Because identity on the internet is currently built from behavior data — what you clicked, what you bought, how long you watched. ARXEVO is an attempt to build identity from something more honest: what you wrote when you were trying to explain yourself to someone who mattered. We think that data is more accurate, more human, and more worthy of protection than anything an algorithm infers from your scroll patterns.",
  },
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const itemRefs = useRef<(HTMLDivElement | null)[]>([]);

  const toggleItem = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  // IntersectionObserver entrance animation
  useEffect(() => {
    const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (prefersReducedMotion) return;

    const items = itemRefs.current.filter(Boolean) as HTMLDivElement[];
    items.forEach((el) => {
      el.style.opacity = "0";
      el.style.transform = "translateY(16px)";
      el.style.transition = "none";
    });

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            const el = entry.target as HTMLDivElement;
            const index = parseInt(el.dataset.index ?? "0", 10);
            setTimeout(() => {
              el.style.transition = "opacity 0.5s ease, transform 0.5s ease";
              el.style.opacity = "1";
              el.style.transform = "translateY(0)";
            }, index * 80);
            observer.unobserve(el);
          }
        });
      },
      { threshold: 0.1 }
    );

    items.forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, []);

  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        minHeight: "100vh",
        backgroundColor: "#0a0a08",
        color: "#e8e0d0",
      }}
    >
      <main
        style={{
          flex: 1,
          maxWidth: "800px",
          margin: "0 auto",
          padding: "120px 24px 80px",
          width: "100%",
        }}
      >
        {/* Header */}
        <div style={{ marginBottom: "80px" }}>
          <span
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "10px",
              letterSpacing: "0.2em",
              color: "#8a7e6e",
              textTransform: "uppercase",
              display: "block",
              marginBottom: "20px",
            }}
          >
            QUESTIONS
          </span>
          <h1
            style={{
              fontFamily: "var(--font-cormorant)",
              fontWeight: 400,
              fontStyle: "italic",
              fontSize: "var(--text-hero)",
              color: "var(--cream)",
              lineHeight: 1.1,
              marginBottom: "20px",
            }}
          >
            The honest answers.
          </h1>
          <p
            style={{
              fontFamily: "var(--font-dm-mono)",
              fontSize: "var(--text-small)",
              color: "#b0a390",
              lineHeight: 1.8,
              maxWidth: "480px",
            }}
          >
            Everything people actually ask.
            Nothing we are afraid to answer.
          </p>
        </div>

        {/* FAQ Accordion */}
        <div>
          {FAQ_ITEMS.map((item, index) => {
            const isOpen = openIndex === index;
            return (
              <div
                key={index}
                ref={(el) => { itemRefs.current[index] = el; }}
                data-index={index}
                style={{
                  borderBottom: "1px solid #1a1a16",
                }}
              >
                <button
                  onClick={() => toggleItem(index)}
                  style={{
                    width: "100%",
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "28px 0",
                    background: "none",
                    border: "none",
                    cursor: "pointer",
                    textAlign: "left",
                  }}
                >
                  <span
                    style={{
                      fontFamily: "var(--font-dm-mono)",
                      fontWeight: 500,
                      fontSize: "var(--text-small)",
                      letterSpacing: "0.08em",
                      color: "var(--cream)",
                      lineHeight: 1.6,
                      paddingRight: "24px",
                      textTransform: "uppercase",
                    }}
                  >
                    {item.question}
                  </span>
                  <span
                    style={{
                      fontFamily: "'DM Mono', monospace",
                      fontSize: "18px",
                      color: "#8a7e6e",
                      flexShrink: 0,
                      transition: "transform 0.3s ease",
                      transform: isOpen ? "rotate(45deg)" : "rotate(0deg)",
                      width: "24px",
                      textAlign: "center",
                    }}
                  >
                    +
                  </span>
                </button>

                <div
                  style={{
                    maxHeight: isOpen ? "500px" : "0",
                    opacity: isOpen ? 1 : 0,
                    overflow: "hidden",
                    transition: "max-height 0.4s ease, opacity 0.3s ease",
                  }}
                >
                  <p
                    style={{
                      fontFamily: "var(--font-cormorant)",
                      fontWeight: 400,
                      fontStyle: "italic",
                      fontSize: "var(--text-lead)",
                      color: "#b0a390",
                      lineHeight: 1.9,
                      paddingBottom: "28px",
                      maxWidth: "680px",
                    }}
                  >
                    {item.answer}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Page-level footer text */}
        <div style={{ marginTop: "80px" }}>
          <p
            style={{
              fontFamily: "'DM Mono', monospace",
              fontSize: "9px",
              color: "#4a4438",
              lineHeight: 2,
            }}
          >
            Still have questions? hello@arxevo.app
          </p>
        </div>
      </main>

      <Footer />
    </div>
  );
}
