import React, { useState } from "react";
import { Link } from "react-router-dom";
import { FaYoutube, FaInstagram, FaFacebook, FaArrowRight } from 'react-icons/fa';

const Footer = () => {
    const [email, setEmail] = useState("");
    const [subscribed, setSubscribed] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (event) => {
        event.preventDefault();
        if (!email) return;
        setIsSubmitting(true);
        try {
            await fetch("https://sheetdb.io/api/v1/no4ub34t8pujw", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ data: [{ mail: email }] }),
            });
            setSubscribed(true);
            setEmail("");
        } catch (err) {
            alert("There was an error subscribing. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <footer className="mt-16 font-sans">
            <div className="bg-gradient-to-r from-[#0b1324] via-[#0f1b33] to-[#10243f] text-white">
                <div className="mx-auto flex w-full max-w-7xl flex-col items-start justify-between gap-4 px-6 py-8 md:flex-row md:items-center">
                    <div>
                        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-accent">Plan Your Escape</p>
                        <h3 className="mt-1 text-2xl font-bold tracking-tight md:text-3xl">
                            Ready to book your next luxury stay?
                        </h3>
                    </div>
                    <Link
                        to="/book"
                        className="inline-flex items-center gap-2 rounded-full bg-accent px-6 py-3 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-accent/80"
                    >
                        Book Now
                        <FaArrowRight size={12} />
                    </Link>
                </div>
            </div>

            <div className="bg-[#0a1222] text-white">
                <div className="mx-auto grid w-full max-w-7xl gap-12 px-6 py-14 md:grid-cols-2 lg:grid-cols-4">
                    <section className="space-y-4">
                        <img src="/assets/nirvana_logo.png" alt="Nirvana Logo" className="h-12 w-auto object-contain brightness-0 invert opacity-95" />
                        <p className="max-w-xs text-sm leading-relaxed text-slate-300">
                            Luxury homes, curated locations, and elevated hospitality designed for unforgettable stays.
                        </p>
                        <p className="text-xs uppercase tracking-[0.18em] text-slate-400">Sevierville, TN and Lake Norman, NC</p>
                    </section>

                    <section>
                        <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Explore</h4>
                        <ul className="space-y-2 text-sm text-slate-300">
                            <li><Link to="/" className="transition hover:text-accent">Home</Link></li>
                            <li><Link to="/properties" className="transition hover:text-accent">Properties</Link></li>
                            <li><Link to="/review" className="transition hover:text-accent">Reviews</Link></li>
                            <li><Link to="/faq" className="transition hover:text-accent">FAQ</Link></li>
                            <li><Link to="/about" className="transition hover:text-accent">About Us</Link></li>
                        </ul>
                    </section>

                    <section>
                        <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Stay In Touch</h4>
                        <form className="space-y-3" onSubmit={handleSubmit}>
                            <input type="email" placeholder="Email address" required value={email} onChange={(e) => setEmail(e.target.value)} disabled={subscribed || isSubmitting} className="w-full rounded-xl border border-slate-600 bg-slate-900/80 px-4 py-3 text-sm text-white placeholder-slate-400 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/30 disabled:cursor-not-allowed disabled:opacity-60" />
                            <button type="submit" disabled={subscribed || isSubmitting} className="w-full rounded-xl bg-accent px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white transition hover:bg-accent/80 disabled:cursor-not-allowed disabled:opacity-60">
                                {subscribed ? "Subscribed" : isSubmitting ? "Subscribing..." : "Subscribe"}
                            </button>
                        </form>
                        {subscribed && <p className="mt-3 text-xs font-medium text-accent">Thanks, you are on the list.</p>}
                    </section>

                    <section>
                        <h4 className="mb-4 text-sm font-bold uppercase tracking-[0.18em] text-slate-200">Follow</h4>
                        <p className="mb-4 text-sm text-slate-300">Get updates and behind-the-scenes content.</p>
                        <div className="flex gap-3">
                            <a href="https://www.youtube.com/@nirvanaaluxe" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="grid h-10 w-10 place-items-center rounded-full border border-slate-500 text-slate-300 transition hover:border-accent hover:text-accent"><FaYoutube /></a>
                            <a href="https://www.instagram.com/nirvanaaluxe/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-10 w-10 place-items-center rounded-full border border-slate-500 text-slate-300 transition hover:border-accent hover:text-accent"><FaInstagram /></a>
                            <a href="https://www.facebook.com/NirvanaaLuxe" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-10 w-10 place-items-center rounded-full border border-slate-500 text-slate-300 transition hover:border-accent hover:text-accent"><FaFacebook /></a>
                        </div>
                    </section>
                </div>

                <div className="border-t border-slate-700">
                    <div className="mx-auto flex w-full max-w-7xl flex-wrap items-center justify-between gap-3 px-6 py-5 text-xs text-slate-400">
                        <span>© 2024 Nirvana Luxe. All rights reserved.</span>
                        <div className="flex items-center gap-4">
                            <Link to="/faq" className="transition hover:text-accent">FAQ</Link>
                            <span className="text-slate-600">|</span>
                            <Link to="/about" className="transition hover:text-accent">About</Link>
                            <span className="text-slate-600">|</span>
                            <Link to="/book" className="transition hover:text-accent">Book</Link>
                        </div>
                    </div>
                </div>
            </div>
        </footer>
    );
};

export default Footer;
