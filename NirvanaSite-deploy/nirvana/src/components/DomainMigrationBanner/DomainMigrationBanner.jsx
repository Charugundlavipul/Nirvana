"use client";

import { useState, useEffect } from "react";

const OLD_DOMAINS = [
  "nirvanaluxe.co",
  "www.nirvanaluxe.co",
  "nirvanaluxe.com",
  "www.nirvanaluxe.com",
];

/**
 * Shows a brief, elegant banner when a visitor arrives via a redirect from the
 * old domain. Auto-dismisses after 5 seconds. Only shows once per session.
 *
 * Remove this component after the transition period (~6 months).
 */
export default function DomainMigrationBanner() {
  const [visible, setVisible] = useState(false);
  const [exiting, setExiting] = useState(false);

  useEffect(() => {
    // Only show once per session
    if (sessionStorage.getItem("domain_banner_shown")) return;

    // Check if the visitor was redirected from an old domain
    const referrer = document.referrer;
    const cameFromOldDomain = OLD_DOMAINS.some(
      (d) => referrer.includes(d)
    );

    if (!cameFromOldDomain) return;

    sessionStorage.setItem("domain_banner_shown", "1");
    setVisible(true);

    // Auto-dismiss after 5 seconds
    const timer = setTimeout(() => dismiss(), 5000);
    return () => clearTimeout(timer);
  }, []);

  function dismiss() {
    setExiting(true);
    setTimeout(() => setVisible(false), 400);
  }

  if (!visible) return null;

  return (
    <div
      id="domain-migration-banner"
      onClick={dismiss}
      style={{
        position: "fixed",
        top: 0,
        left: 0,
        right: 0,
        zIndex: 99999,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "12px",
        padding: "12px 20px",
        background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)",
        borderBottom: "2px solid #f7c963",
        color: "#fff",
        fontFamily: "'Inter', Arial, sans-serif",
        fontSize: "14px",
        cursor: "pointer",
        animation: exiting
          ? "bannerSlideUp 0.4s ease-in forwards"
          : "bannerSlideDown 0.4s ease-out forwards",
        boxShadow: "0 4px 20px rgba(0, 0, 0, 0.3)",
      }}
    >
      <style>{`
        @keyframes bannerSlideDown {
          from { transform: translateY(-100%); opacity: 0; }
          to   { transform: translateY(0);     opacity: 1; }
        }
        @keyframes bannerSlideUp {
          from { transform: translateY(0);     opacity: 1; }
          to   { transform: translateY(-100%); opacity: 0; }
        }
      `}</style>

      {/* Gold accent icon */}
      <span
        style={{
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          width: 28,
          height: 28,
          borderRadius: "50%",
          background: "rgba(247, 201, 99, 0.15)",
          border: "1.5px solid #f7c963",
          fontSize: "14px",
          flexShrink: 0,
        }}
      >
        ✨
      </span>

      <span>
        <strong style={{ color: "#f7c963" }}>We&apos;ve moved!</strong>{" "}
        nirvanaluxe.co is now{" "}
        <strong style={{ color: "#f7c963" }}>nirvanaluxevacations.com</strong>
        {" "}&mdash; same luxury, new address.
      </span>

      {/* Close button */}
      <button
        onClick={(e) => {
          e.stopPropagation();
          dismiss();
        }}
        aria-label="Dismiss banner"
        style={{
          background: "none",
          border: "none",
          color: "rgba(255, 255, 255, 0.6)",
          fontSize: "18px",
          cursor: "pointer",
          padding: "0 4px",
          lineHeight: 1,
          flexShrink: 0,
          transition: "color 0.2s",
        }}
        onMouseEnter={(e) => (e.target.style.color = "#fff")}
        onMouseLeave={(e) =>
          (e.target.style.color = "rgba(255, 255, 255, 0.6)")
        }
      >
        ✕
      </button>
    </div>
  );
}
