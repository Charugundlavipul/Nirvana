'use client';

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { FaYoutube, FaInstagram, FaFacebook } from 'react-icons/fa';

const Footer = () => {
    const [email, setEmail] = useState("");
    const [privacyAccepted, setPrivacyAccepted] = useState(false);
    const [status, setStatus] = useState(null);
    const [statusMsg, setStatusMsg] = useState("");
    const currentYear = new Date().getFullYear();

    const isValidEmail = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
    const canSubmit = isValidEmail && privacyAccepted && status !== "loading";

    const handleSubscribe = async (e) => {
        e.preventDefault();
        if (!canSubmit) return;

        setStatus("loading");
        setStatusMsg("");

        let response;
        let payload = {};

        try {
            response = await fetch("/api/subscribe", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    email: email.trim().toLowerCase(),
                    privacyAccepted,
                }),
            });
            payload = await response.json().catch(() => ({}));
        } catch (error) {
            setStatus("error");
            setStatusMsg("Something went wrong. Please try again.");
            return;
        }

        if (!response.ok) {
            if (response.status === 409) {
                setStatus("duplicate");
                setStatusMsg(payload?.error || "This email is already subscribed.");
            } else {
                setStatus("error");
                setStatusMsg(payload?.error || "Something went wrong. Please try again.");
            }
        } else {
            setStatus("success");
            setStatusMsg("You're subscribed! We'll keep you posted.");
            setEmail("");
            setPrivacyAccepted(false);
        }
    };

    return (
        <footer className="mt-16 font-sans">
            <div className="bg-[#0a1222] text-white">
                <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
                    <section className="space-y-4">
                        <div className="bg-white/95 inline-block p-3 rounded-2xl shadow-sm">
                            <Image
                                src="/assets/nirvana_logo_transparent.png"
                                alt="Nirvana Luxe — Luxury Vacation Rentals in the Smoky Mountains and Lake Norman"
                                width={240}
                                height={60}
                                className="object-contain"
                            />
                        </div>
                        <p className="max-w-xs text-sm leading-relaxed text-slate-300">
                            Luxury homes, curated locations, and elevated hospitality designed for unforgettable stays.
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sevierville, TN and Lake Norman, NC</p>
                    </section>

                    <section>
                        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Explore</h2>
                        <ul className="space-y-2 text-sm text-slate-300">
                            <li><Link href="/" className="transition hover:text-accent">Home</Link></li>
                            <li><Link href="/properties" className="transition hover:text-accent">Properties</Link></li>
                            <li><Link href="/blog" className="transition hover:text-accent">Journal</Link></li>
                            <li><Link href="/review" className="transition hover:text-accent">Reviews</Link></li>
                            <li><Link href="/faq" className="transition hover:text-accent">FAQ</Link></li>
                            <li><Link href="/about" className="transition hover:text-accent">About Us</Link></li>
                            <li><Link href="/contact" className="transition hover:text-accent">Contact Us</Link></li>
                        </ul>
                    </section>

                    <section>
                        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Follow</h2>
                        <p className="mb-4 text-sm text-slate-300">Get updates and behind-the-scenes content.</p>
                        <div className="flex gap-3">
                            <a href="https://www.youtube.com/@nirvanaaluxe" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full border border-slate-500 text-slate-300 transition hover:border-accent hover:text-accent"><FaYoutube /></a>
                            <a href="https://www.instagram.com/nirvanaluxevacations/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-slate-500 text-slate-300 transition hover:border-accent hover:text-accent"><FaInstagram /></a>
                            <a href="https://www.facebook.com/NirvanaLuxe" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-slate-500 text-slate-300 transition hover:border-accent hover:text-accent"><FaFacebook /></a>
                        </div>
                    </section>

                    <section>
                        <h2 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Stay Updated</h2>
                        <p className="mb-4 text-sm text-slate-300">Subscribe to get alerts on new properties and exclusive deals.</p>
                        <form onSubmit={handleSubscribe} className="space-y-3">
                            <label htmlFor="footer-subscribe-email" className="sr-only">Email address</label>
                            <input
                                id="footer-subscribe-email"
                                type="email"
                                placeholder="Enter your email"
                                value={email}
                                onChange={(e) => { setEmail(e.target.value); setStatus(null); }}
                                className="w-full rounded-lg border border-slate-600 bg-slate-800/60 px-4 py-2.5 text-sm text-white placeholder-slate-400 outline-none transition focus:border-accent focus:ring-1 focus:ring-accent"
                                required
                            />
                            <label className="flex items-start gap-2 cursor-pointer select-none">
                                <input
                                    id="footer-subscribe-privacy"
                                    type="checkbox"
                                    checked={privacyAccepted}
                                    onChange={(e) => setPrivacyAccepted(e.target.checked)}
                                    className="mt-0.5 h-4 w-4 rounded border-slate-500 accent-accent"
                                />
                                <span className="text-xs leading-relaxed text-slate-400">
                                    I agree to the{" "}
                                    <Link href="/privacy" className="text-accent underline underline-offset-2 hover:text-accent/80">
                                        Privacy Policy
                                    </Link>
                                </span>
                            </label>
                            <button
                                id="footer-subscribe-submit"
                                type="submit"
                                disabled={!canSubmit}
                                className={`w-full rounded-lg px-4 py-2.5 text-sm font-semibold uppercase tracking-wider transition ${canSubmit
                                        ? "bg-accent text-white hover:bg-accent/80 cursor-pointer"
                                        : "bg-slate-700 text-slate-500 cursor-not-allowed"
                                    }`}
                            >
                                {status === "loading" ? "Subscribing..." : "Subscribe"}
                            </button>
                            {statusMsg && (
                                <p className={`text-xs ${status === "success" ? "text-emerald-400" : "text-red-400"}`}>
                                    {statusMsg}
                                </p>
                            )}
                        </form>
                    </section>
                </div>

                <div className="border-t border-slate-700">
                    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-slate-400">
                        <span>© {currentYear} Nirvana Luxe. All rights reserved.</span>
                        <div className="flex items-center gap-4">
                            <Link href="/faq" className="transition hover:text-accent">FAQ</Link>
                            <span className="text-slate-600">|</span>
                            <Link href="/about" className="transition hover:text-accent">About</Link>
                            <span className="text-slate-600">|</span>
                            <Link href="/book" className="transition hover:text-accent">Book</Link>
                            <span className="text-slate-600">|</span>
                            <Link href="/contact" className="transition hover:text-accent">Contact</Link>
                            <span className="text-slate-600">|</span>
                            <Link href="/terms" className="transition hover:text-accent">Terms</Link>
                            <span className="text-slate-600">|</span>
                            <Link href="/privacy" className="transition hover:text-accent">Privacy</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
