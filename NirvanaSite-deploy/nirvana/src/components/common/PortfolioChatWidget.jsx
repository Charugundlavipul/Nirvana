'use client';

import { useState, useRef, useEffect } from "react";
import { usePathname } from "next/navigation";
import { supabase } from "../../supabaseClient";
import styles from "./PortfolioChatWidget.module.css";

const QUICK_PROMPTS = [
  "What properties do you manage?",
  "Which property is best for a large group?",
  "Give me a quick overview of the portfolio.",
];

export default function PortfolioChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(false);
  const pathname = usePathname();
  const messagesEndRef = useRef(null);
  const textareaRef = useRef(null);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, loading]);

  const handleInput = (e) => {
    setInput(e.target.value);
    if (textareaRef.current) {
      textareaRef.current.style.height = "auto";
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 120)}px`;
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      askPortfolio();
    }
  };

  const toggleSources = (index) => {
    setMessages((prev) => 
      prev.map((msg, i) => i === index ? { ...msg, showSources: !msg.showSources } : msg)
    );
  }

  async function askPortfolio(questionText) {
    const nextQuestion = `${questionText || input}`.trim();
    if (!nextQuestion) return;

    setLoading(true);
    setInput("");
    if (textareaRef.current) textareaRef.current.style.height = "40px";

    setMessages((prev) => [
      ...prev,
      { role: "user", text: nextQuestion }
    ]);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const requestPayload = {
        question: nextQuestion,
        preferredHubId:
          pathname?.startsWith("/admin/knowledge") && typeof window !== "undefined"
            ? window.localStorage.getItem("adminKnowledgeActiveHubId") || ""
            : "",
      };

      const response = await fetch("/api/admin/portfolio-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(session?.access_token
            ? { Authorization: `Bearer ${session.access_token}` }
            : {}),
        },
        body: JSON.stringify(requestPayload),
      });

      const payload = await response.json().catch(() => ({}));
      if (!response.ok) {
        throw new Error(payload?.error || "Unable to answer that question right now.");
      }

      setMessages((prev) => [
        ...prev,
        { 
          role: "assistant", 
          text: payload.answer, 
          citations: payload.citations || [],
          showSources: false,
        }
      ]);
      
    } catch (requestError) {
      setMessages((prev) => [
        ...prev,
        { role: "error", text: requestError.message }
      ]);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen) {
    return (
      <button type="button" className={styles.launcher} onClick={() => setIsOpen(true)}>
        <strong>Portfolio AI</strong>
      </button>
    );
  }

  return (
    <section className={styles.panel} aria-label="Portfolio chat assistant">
      <div className={styles.header}>
        <div className={styles.headerTitle}>
          <h3>Portfolio Assistant</h3>
          <p>Admin-only portfolio chat grounded in your stored knowledge and sources.</p>
        </div>
        <button
          type="button"
          className={styles.closeButton}
          onClick={() => setIsOpen(false)}
          aria-label="Close portfolio chat"
        >
          ✕
        </button>
      </div>

      <div className={styles.body}>
        <div className={styles.messages}>
          {messages.length === 0 && !loading ? (
            <div className={styles.introCard}>
              <p>
                Ask about the full portfolio, compare properties, or get answers grounded in
                the stored knowledge across all managed homes.
              </p>
              <div className={styles.quickPrompts}>
                {QUICK_PROMPTS.map((item) => (
                  <button
                    key={item}
                    type="button"
                    className={styles.quickPrompt}
                    onClick={() => askPortfolio(item)}
                    disabled={loading}
                  >
                    {item}
                  </button>
                ))}
              </div>
            </div>
          ) : null}

          {messages.map((msg, index) => {
            if (msg.role === "user") {
              return (
                <div key={index} className={styles.userBubble}>
                  <span className={styles.messageLabel}>You asked</span>
                  <p className={styles.messageText}>{msg.text}</p>
                </div>
              );
            }
            if (msg.role === "assistant") {
              return (
                <div key={index} style={{display: 'flex', flexDirection: 'column', gap: '8px'}}>
                  <div className={styles.assistantBubble}>
                    <span className={styles.messageLabel}>Assistant</span>
                    <p className={styles.messageText}>{msg.text}</p>
                  </div>
                  {Array.isArray(msg.citations) && msg.citations.length > 0 && (
                    <div className={styles.sourcesCard}>
                      <button
                        type="button"
                        className={styles.sourceToggle}
                        onClick={() => toggleSources(index)}
                      >
                        {msg.showSources
                          ? "Hide sources"
                          : `Show sources (${msg.citations.length})`}
                      </button>

                      {msg.showSources && (
                        <div className={styles.sourceList}>
                          {msg.citations.map((item) => (
                            <article key={item.key || item.id || Math.random()} className={styles.sourceItem}>
                              <strong>{item.title || item.detailTitle || "Knowledge source"}</strong>
                              {item.excerpt && <p>{item.excerpt}</p>}
                            </article>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            }
            if (msg.role === "error") {
              return (
                <div key={index} className={styles.assistantBubble}>
                  <span className={styles.messageLabel}>Error</span>
                  <p className={styles.messageText} style={{color: 'red'}}>{msg.text}</p>
                </div>
              );
            }
            return null;
          })}

          {loading ? (
            <div className={styles.assistantBubble}>
              <span className={styles.messageLabel}>Assistant</span>
              <p className={`${styles.messageText} ${styles.thinking}`}>Searching all sources & portfolio knowledge...</p>
            </div>
          ) : null}

          <div ref={messagesEndRef} />
        </div>

        <div className={styles.composerContainer}>
          <div className={styles.composer}>
            <textarea
              ref={textareaRef}
              className={styles.input}
              value={input}
              onChange={handleInput}
              onKeyDown={handleKeyDown}
              placeholder="Ask about the portfolio..."
              rows={1}
            />
            <button
              type="button"
              className={styles.sendButton}
              onClick={() => askPortfolio()}
              disabled={loading || !input.trim()}
              aria-label="Send message"
            >
              <svg className={styles.sendIcon} viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
              </svg>
            </button>
          </div>
          <p className={styles.hint}>Searches across portfolio knowledge and stored embeddings.</p>
        </div>
      </div>
    </section>
  );
}
