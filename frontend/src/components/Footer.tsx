"use client";

import Link from "next/link";

export default function Footer() {
  return (
    <footer
      style={{
        borderTop: "1px solid #1a1a16",
        padding: "32px 60px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        backgroundColor: "#0a0a08",
        flexShrink: 0,
      }}
    >
      {/* Left: Logo */}
      <span
        style={{
          fontFamily: "'Cormorant Garamond', serif",
          fontWeight: 600,
          fontSize: "16px",
          color: "#e8e0d0",
          letterSpacing: "0.05em",
        }}
      >
        ARXEVO
      </span>

      {/* Center: Links */}
      <nav
        style={{
          display: "flex",
          gap: "24px",
          alignItems: "center",
        }}
      >
        {[
          { href: "/faq", label: "FAQ" },
          { href: "/privacy", label: "Privacy" },
        ].map((link, i) => (
          <span key={link.href} style={{ display: "flex", alignItems: "center", gap: "24px" }}>
            {i > 0 && (
              <span style={{ color: "#2a2820", fontSize: "9px" }}>·</span>
            )}
            <Link
              href={link.href}
              style={{
                fontFamily: "'DM Mono', monospace",
                fontSize: "9px",
                letterSpacing: "0.15em",
                color: "#8a7e6e",
                textDecoration: "none",
                textTransform: "uppercase",
                transition: "color 0.3s",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.color = "#e8e0d0";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.color = "#8a7e6e";
              }}
            >
              {link.label}
            </Link>
          </span>
        ))}
      </nav>

      {/* Right: Copyright */}
      <span
        style={{
          fontFamily: "'DM Mono', monospace",
          fontSize: "9px",
          color: "#4a4438",
          letterSpacing: "0.1em",
        }}
      >
        © {new Date().getFullYear()} ARXEVO
      </span>
    </footer>
  );
}
