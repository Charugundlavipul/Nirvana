'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { usePathname } from 'next/navigation';
import { supabase } from '../../supabaseClient';
import './ChatWidget.css';

/* ───────────────────────── Icons (inline SVG) ───────────────────────── */

const ChatBubbleIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" className="nlchat-icon">
    <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z" />
  </svg>
);

const CloseIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nlchat-icon-sm">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
);

const SendIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nlchat-icon-sm">
    <line x1="22" y1="2" x2="11" y2="13" />
    <polygon points="22 2 15 22 11 13 2 9 22 2" />
  </svg>
);

const MinimizeIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="nlchat-icon-sm">
    <polyline points="4 14 10 14 10 20" />
    <polyline points="20 10 14 10 14 4" />
    <line x1="14" y1="10" x2="21" y2="3" />
    <line x1="3" y1="21" x2="10" y2="14" />
  </svg>
);

/* ────────────────────────── Main Component ──────────────────────────── */

const STORAGE_KEY = 'nlchat_conversation_id';
const STORAGE_TIMESTAMP_KEY = 'nlchat_last_activity';
const GUEST_INFO_KEY = 'nlchat_guest_info';
const SESSION_MAX_AGE_MS = 24 * 60 * 60 * 1000; // 24 hours — must match server

export default function ChatWidget() {
  const pathname = usePathname();
  const isAdmin = pathname?.startsWith('/admin');

  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [conversationId, setConversationId] = useState(null);
  const [showIntro, setShowIntro] = useState(true);
  const [guestInfo, setGuestInfo] = useState({ name: '', email: '' });
  const [hasNewMessage, setHasNewMessage] = useState(false);
  const [typingDots, setTypingDots] = useState(false);
  const [sessionExpired, setSessionExpired] = useState(false);
  const [validatingSession, setValidatingSession] = useState(false);

  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);
  const subscriptionRef = useRef(null);

  // ── Helper: clear stale session from local storage ────────────────
  const clearSession = useCallback(() => {
    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    } catch { /* */ }
    setConversationId(null);
    setMessages([]);
  }, []);

  // ── Restore from localStorage + validate session ──────────────────
  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        const savedGuest = localStorage.getItem(GUEST_INFO_KEY);
        if (savedGuest) {
          setGuestInfo(JSON.parse(savedGuest));
        }

        const savedConvId = localStorage.getItem(STORAGE_KEY);
        if (!savedConvId) return;

        // Quick client-side TTL check before hitting the server
        const savedTimestamp = localStorage.getItem(STORAGE_TIMESTAMP_KEY);
        if (savedTimestamp) {
          const age = Date.now() - parseInt(savedTimestamp, 10);
          if (age > SESSION_MAX_AGE_MS) {
            console.log('[Chat] Session expired (client-side TTL check)');
            localStorage.removeItem(STORAGE_KEY);
            localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
            if (!cancelled) setSessionExpired(true);
            return;
          }
        }

        // Validate with the server
        if (!cancelled) setValidatingSession(true);

        const res = await fetch(`/api/chat/status?conversationId=${savedConvId}`);
        const data = await res.json();

        if (cancelled) return;

        if (data.valid) {
          // Session is still alive — restore it
          setConversationId(savedConvId);
          setShowIntro(false);
        } else {
          // Session is stale — clear and notify
          console.log(`[Chat] Session invalid: ${data.reason}`);
          localStorage.removeItem(STORAGE_KEY);
          localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
          setSessionExpired(true);
        }
      } catch (err) {
        console.warn('Session validation failed:', err);
        // On network error, still try to restore (offline-friendly)
        try {
          const savedConvId = localStorage.getItem(STORAGE_KEY);
          if (savedConvId && !cancelled) {
            setConversationId(savedConvId);
            setShowIntro(false);
          }
        } catch { /* */ }
      } finally {
        if (!cancelled) setValidatingSession(false);
      }
    })();

    return () => { cancelled = true; };
  }, []);

  // ── Persist conversation ID + timestamp ────────────────────────────
  useEffect(() => {
    if (conversationId) {
      try {
        localStorage.setItem(STORAGE_KEY, conversationId);
        localStorage.setItem(STORAGE_TIMESTAMP_KEY, String(Date.now()));
      } catch { /* */ }
    }
  }, [conversationId]);

  // ── Fetch existing messages when conversation is loaded ────────────
  useEffect(() => {
    if (!conversationId) return;

    (async () => {
      try {
        const res = await fetch(`/api/chat/messages?conversationId=${conversationId}`);
        const data = await res.json();
        if (data.messages) setMessages(data.messages);
      } catch (err) {
        console.warn('Failed to load chat history:', err);
      }
    })();
  }, [conversationId]);

  // ── Supabase Realtime subscription for live updates ────────────────
  useEffect(() => {
    if (!conversationId) return;

    // Clean up previous subscription
    if (subscriptionRef.current) {
      supabase.removeChannel(subscriptionRef.current);
    }

    const channel = supabase
      .channel(`chat-${conversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages',
          filter: `conversation_id=eq.${conversationId}`,
        },
        (payload) => {
          const newMsg = payload.new;
          setMessages((prev) => {
            // Deduplicate
            if (prev.some((m) => m.id === newMsg.id)) return prev;
            return [...prev, newMsg];
          });

          // Notify if host message arrives while closed
          if (newMsg.sender_type === 'host' && !isOpen) {
            setHasNewMessage(true);
          }
        }
      )
      .subscribe();

    subscriptionRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [conversationId, isOpen]);

  // ── Auto-scroll on new messages ────────────────────────────────────
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // ── Focus input when panel opens ───────────────────────────────────
  useEffect(() => {
    if (isOpen && !isMinimized && !showIntro) {
      setTimeout(() => inputRef.current?.focus(), 300);
    }
  }, [isOpen, isMinimized, showIntro]);

  // ── Don't render on admin routes ───────────────────────────────────
  if (isAdmin) return null;

  // ── Handle intro form submit ───────────────────────────────────────
  const handleStartChat = (e) => {
    e.preventDefault();
    const name = guestInfo.name.trim() || 'Guest';
    const info = { ...guestInfo, name };
    setGuestInfo(info);
    try { localStorage.setItem(GUEST_INFO_KEY, JSON.stringify(info)); } catch { /* */ }
    setShowIntro(false);
    setTimeout(() => inputRef.current?.focus(), 300);
  };

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || sending) return;

    setInput('');
    setSending(true);
    setSessionExpired(false);

    // Show typing indicator briefly
    setTypingDots(true);
    setTimeout(() => setTypingDots(false), 2000);

    try {
      const res = await fetch('/api/chat/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          conversationId,
          guestName: guestInfo.name || 'Guest',
          guestEmail: guestInfo.email || null,
          propertySlug: null,
          message: text,
        }),
      });

      const data = await res.json();

      // Server renewed the session (old one was stale)
      if (data.sessionRenewed && data.conversationId) {
        console.log('[Chat] Session was renewed by server, switching to new conversation');
        setMessages([]); // Clear old messages
        setConversationId(data.conversationId);
        // Update the activity timestamp
        try { localStorage.setItem(STORAGE_TIMESTAMP_KEY, String(Date.now())); } catch { /* */ }
      } else if (data.conversationId && !conversationId) {
        setConversationId(data.conversationId);
      }

      // Update activity timestamp on successful send
      if (data.ok) {
        try { localStorage.setItem(STORAGE_TIMESTAMP_KEY, String(Date.now())); } catch { /* */ }
      }

      // Show error if message didn't reach Google Chat
      if (data.ok && !data.gchatOk) {
        setMessages((prev) => [
          ...prev,
          {
            id: `err-${Date.now()}`,
            sender_type: 'system',
            body: '⚠️ Something went wrong — your message may not have reached our team. Please try again or start a new conversation.',
            created_at: new Date().toISOString(),
            isError: true,
          },
        ]);
      }
    } catch (err) {
      console.error('Send failed:', err);
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          sender_type: 'system',
          body: '⚠️ Failed to send message. Please check your connection and try again.',
          created_at: new Date().toISOString(),
          isError: true,
        },
      ]);
      setInput(text); // Restore the text
    } finally {
      setSending(false);
    }
  }, [input, sending, conversationId, guestInfo]);

  // ── Key handler ────────────────────────────────────────────────────
  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  // ── Toggle ─────────────────────────────────────────────────────────
  const toggleChat = () => {
    if (!isOpen) {
      setHasNewMessage(false);
    }
    setIsOpen(!isOpen);
    setIsMinimized(false);
  };

  // ── Format timestamp ──────────────────────────────────────────────
  const formatTime = (dateStr) => {
    try {
      const d = new Date(dateStr);
      return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } catch {
      return '';
    }
  };

  // ── New chat ───────────────────────────────────────────────────────
  const handleNewChat = async () => {
    // Close the old conversation in the database
    if (conversationId) {
      try {
        await fetch('/api/chat/close', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ conversationId }),
        });
      } catch { /* non-fatal */ }
    }

    try {
      localStorage.removeItem(STORAGE_KEY);
      localStorage.removeItem(STORAGE_TIMESTAMP_KEY);
    } catch { /* */ }
    setConversationId(null);
    setMessages([]);
    setShowIntro(true);
    setSessionExpired(false);
  };

  return (
    <>
      {/* ── Floating Action Button ─────────────────────────────────── */}
      <button
        id="nlchat-fab"
        onClick={toggleChat}
        className={`nlchat-fab ${isOpen ? 'nlchat-fab--open' : ''}`}
        aria-label={isOpen ? 'Close chat' : 'Open chat'}
      >
        {isOpen ? <CloseIcon /> : <ChatBubbleIcon />}
        {hasNewMessage && !isOpen && (
          <span className="nlchat-fab-badge" aria-label="New message" />
        )}
      </button>

      {/* ── Chat Panel ─────────────────────────────────────────────── */}
      <div
        className={`nlchat-panel ${isOpen ? 'nlchat-panel--open' : ''} ${isMinimized ? 'nlchat-panel--minimized' : ''}`}
        role="dialog"
        aria-label="Live chat with Nirvana Luxe"
      >
        {/* Header */}
        <div className="nlchat-header">
          <div className="nlchat-header-info">
            <div className="nlchat-avatar">
              <img src="/favicon.png" alt="" width={32} height={32} />
              <span className="nlchat-online-dot" />
            </div>
            <div>
              <p className="nlchat-header-title">Nirvana Luxe</p>
              <p className="nlchat-header-subtitle">
                <span className="nlchat-pulse" />
                Typically replies in minutes
              </p>
            </div>
          </div>
          <div className="nlchat-header-actions">
            <button
              onClick={() => setIsMinimized(!isMinimized)}
              className="nlchat-header-btn"
              aria-label={isMinimized ? 'Expand chat' : 'Minimize chat'}
            >
              <MinimizeIcon />
            </button>
            <button onClick={toggleChat} className="nlchat-header-btn" aria-label="Close chat">
              <CloseIcon />
            </button>
          </div>
        </div>

        {/* Body */}
        {!isMinimized && (
          <>
            {showIntro ? (
              /* ── Intro / Name Form ──────────────────────────────── */
              <div className="nlchat-intro">
                <div className="nlchat-intro-hero">
                  <div className="nlchat-intro-glow" />
                  <h2 className="nlchat-intro-title">
                    Hello! 👋
                  </h2>
                  <p className="nlchat-intro-text">
                    Welcome to Nirvana Luxe. Start a conversation with our guest relations team — we&apos;re here to help with bookings, questions, and special requests.
                  </p>
                </div>
                <form onSubmit={handleStartChat} className="nlchat-intro-form">
                  <div className="nlchat-field">
                    <label htmlFor="nlchat-name" className="nlchat-label">Your Name</label>
                    <input
                      id="nlchat-name"
                      type="text"
                      value={guestInfo.name}
                      onChange={(e) => setGuestInfo((g) => ({ ...g, name: e.target.value }))}
                      placeholder="e.g. Sarah"
                      className="nlchat-input"
                      required
                      autoFocus
                    />
                  </div>
                  <div className="nlchat-field">
                    <label htmlFor="nlchat-email" className="nlchat-label">Email <span className="nlchat-optional">(optional)</span></label>
                    <input
                      id="nlchat-email"
                      type="email"
                      value={guestInfo.email}
                      onChange={(e) => setGuestInfo((g) => ({ ...g, email: e.target.value }))}
                      placeholder="you@example.com"
                      className="nlchat-input"
                    />
                  </div>
                  <button type="submit" className="nlchat-start-btn">
                    Start Chat
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" width="18" height="18">
                      <line x1="5" y1="12" x2="19" y2="12" /><polyline points="12 5 19 12 12 19" />
                    </svg>
                  </button>
                </form>
              </div>
            ) : (
              /* ── Messages Area ──────────────────────────────────── */
              <>
                <div className="nlchat-messages">
                  {/* Session expired banner */}
                  {sessionExpired && (
                    <div className="nlchat-session-banner">
                      <div className="nlchat-session-banner-icon">🔄</div>
                      <p>Your previous session has expired. Start a new conversation to continue chatting with our team.</p>
                      <button onClick={handleNewChat} className="nlchat-session-banner-btn">
                        Start New Chat
                      </button>
                    </div>
                  )}
                  {/* Validating session spinner */}
                  {validatingSession && (
                    <div className="nlchat-session-loading">
                      <div className="nlchat-typing"><span /><span /><span /></div>
                      <p>Reconnecting…</p>
                    </div>
                  )}
                  {messages.length === 0 && !sessionExpired && !validatingSession && (
                    <div className="nlchat-msg nlchat-msg--host">
                      <div className="nlchat-msg-avatar">
                        <img src="/favicon.png" alt="" width={28} height={28} />
                      </div>
                      <div className="nlchat-msg-content">
                        <div className="nlchat-msg-bubble">
                          Hi {guestInfo.name || 'there'}! 👋 How can we help you today?
                        </div>
                        <span className="nlchat-msg-time">Just now</span>
                      </div>
                    </div>
                  )}
                  {messages.map((msg) => (
                    <div
                      key={msg.id}
                      className={`nlchat-msg nlchat-msg--${msg.isError ? 'error' : msg.sender_type}`}
                    >
                      {msg.sender_type === 'host' && (
                        <div className="nlchat-msg-avatar">
                          <img src="/favicon.png" alt="" width={28} height={28} />
                        </div>
                      )}
                      <div className="nlchat-msg-content">
                        <div className="nlchat-msg-bubble">
                          {msg.body}
                        </div>
                        <span className="nlchat-msg-time">
                          {formatTime(msg.created_at)}
                        </span>
                      </div>
                    </div>
                  ))}
                  {typingDots && (
                    <div className="nlchat-msg nlchat-msg--system">
                      <div className="nlchat-msg-content">
                        <div className="nlchat-typing">
                          <span /><span /><span />
                        </div>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Bar */}
                <div className="nlchat-input-bar">
                  <textarea
                    ref={inputRef}
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Type a message…"
                    className="nlchat-textarea"
                    rows={1}
                    disabled={sending}
                  />
                  <button
                    onClick={handleSend}
                    disabled={!input.trim() || sending}
                    className="nlchat-send-btn"
                    aria-label="Send message"
                  >
                    <SendIcon />
                  </button>
                </div>

                {/* Footer */}
                <div className="nlchat-footer">
                  <button onClick={handleNewChat} className="nlchat-new-chat-btn">
                    New conversation
                  </button>
                </div>
              </>
            )}
          </>
        )}
      </div>
    </>
  );
}
