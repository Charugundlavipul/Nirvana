import React, { useEffect, useRef, useState } from "react";
import { FaEnvelope, FaPhone, FaInstagram, FaFacebook, FaYoutube, FaMapMarkerAlt, FaPaperPlane } from "react-icons/fa";

const ContactUs = () => {
    const heroRef = useRef(null);
    const [formData, setFormData] = useState({ name: "", email: "", subject: "", message: "" });
    const [submitted, setSubmitted] = useState(false);
    const [sending, setSending] = useState(false);

    useEffect(() => {
        const handleScroll = () => {
            const scrollPosition = window.pageYOffset;
            if (heroRef.current) {
                heroRef.current.style.backgroundPositionY = `calc(50% + ${scrollPosition / 2}px)`;
            }
        };
        window.addEventListener("scroll", handleScroll);
        return () => window.removeEventListener("scroll", handleScroll);
    }, []);

    const handleChange = (e) => {
        setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setSending(true);
        // Send via mailto as a fallback
        const mailtoLink = `mailto:vkrvacations@gmail.com?subject=${encodeURIComponent(formData.subject || "Contact from Website")}&body=${encodeURIComponent(`Name: ${formData.name}\nEmail: ${formData.email}\n\n${formData.message}`)}`;
        window.location.href = mailtoLink;
        setSending(false);
        setSubmitted(true);
        setFormData({ name: "", email: "", subject: "", message: "" });
    };

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
            {/* Hero Section */}
            <div
                ref={heroRef}
                className="relative h-[50vh] w-full overflow-hidden bg-cover bg-center -mt-[50px]"
                style={{ backgroundImage: `url(/assets/aboutUs-hero.avif)` }}
            >
                <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center text-center px-6">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-accent mb-4">Get In Touch</p>
                    <h1 className="text-4xl md:text-6xl font-bold text-white drop-shadow-lg">Contact Us</h1>
                    <p className="mt-4 text-lg text-gray-300 max-w-xl">
                        Have a question about our properties, or need help with a booking? We&rsquo;d love to hear from you.
                    </p>
                </div>
            </div>

            <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">

                {/* Contact Cards */}
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
                    {/* Email */}
                    <a
                        href="mailto:vkrvacations@gmail.com"
                        className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-accent/40 hover:shadow-lg"
                    >
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent text-xl transition-transform group-hover:scale-110">
                            <FaEnvelope />
                        </div>
                        <h3 className="font-bold text-gray-900">Email Us</h3>
                        <p className="text-sm text-gray-500 break-all">vkrvacations@gmail.com</p>
                    </a>

                    {/* Phone */}
                    <a
                        href="tel:+1-972-835-9376"
                        className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-accent/40 hover:shadow-lg"
                    >
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent text-xl transition-transform group-hover:scale-110">
                            <FaPhone />
                        </div>
                        <h3 className="font-bold text-gray-900">Call Us</h3>
                        <p className="text-sm text-gray-500">972-835-9376</p>
                    </a>

                    {/* Instagram */}
                    <a
                        href="https://www.instagram.com/nirvanaaluxe/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-accent/40 hover:shadow-lg"
                    >
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent text-xl transition-transform group-hover:scale-110">
                            <FaInstagram />
                        </div>
                        <h3 className="font-bold text-gray-900">Instagram</h3>
                        <p className="text-sm text-gray-500">@nirvanaaluxe</p>
                    </a>

                    {/* Facebook */}
                    <a
                        href="https://www.facebook.com/NirvanaaLuxe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group flex flex-col items-center gap-3 rounded-2xl border border-gray-200 bg-white p-8 text-center shadow-sm transition-all hover:border-accent/40 hover:shadow-lg"
                    >
                        <div className="grid h-14 w-14 place-items-center rounded-full bg-accent/10 text-accent text-xl transition-transform group-hover:scale-110">
                            <FaFacebook />
                        </div>
                        <h3 className="font-bold text-gray-900">Facebook</h3>
                        <p className="text-sm text-gray-500">Nirvana Luxe</p>
                    </a>
                </div>

                {/* Locations + Form */}
                <div className="grid gap-12 lg:grid-cols-2">

                    {/* Left: Locations & Info */}
                    <div className="space-y-8">
                        <div>
                            <h2 className="text-3xl font-bold text-gray-900 border-l-4 border-accent pl-4">Our Locations</h2>
                            <p className="mt-3 text-gray-600 leading-relaxed">
                                Our luxury properties are located in the heart of the Smoky Mountains and on the beautiful shores of Lake Norman.
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                                    <FaMapMarkerAlt />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Sevierville, Tennessee</h4>
                                    <p className="text-sm text-gray-500 mt-1">Gateway to the Great Smoky Mountains — perfect for nature lovers and adventure seekers.</p>
                                </div>
                            </div>

                            <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-5 shadow-sm">
                                <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                                    <FaMapMarkerAlt />
                                </div>
                                <div>
                                    <h4 className="font-bold text-gray-900">Lake Norman, North Carolina</h4>
                                    <p className="text-sm text-gray-500 mt-1">Lakeside luxury with stunning waterfront views and endless water activities.</p>
                                </div>
                            </div>
                        </div>

                        <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <h4 className="font-bold text-gray-900 mb-3">Follow Us</h4>
                            <div className="flex gap-3">
                                <a href="https://www.youtube.com/@nirvanaaluxe" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                    <FaYoutube size={18} />
                                </a>
                                <a href="https://www.instagram.com/nirvanaaluxe/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                    <FaInstagram size={18} />
                                </a>
                                <a href="https://www.facebook.com/NirvanaaLuxe" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                    <FaFacebook size={18} />
                                </a>
                            </div>
                        </div>
                    </div>

                    {/* Right: Contact Form */}
                    <div className="rounded-2xl border border-gray-200 bg-white p-8 shadow-sm">
                        <h2 className="text-2xl font-bold text-gray-900 mb-2">Send Us a Message</h2>
                        <p className="text-sm text-gray-500 mb-6">Fill out the form below and we&rsquo;ll get back to you as soon as possible.</p>

                        {submitted ? (
                            <div className="flex flex-col items-center justify-center py-12 text-center">
                                <div className="grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent text-2xl mb-4">
                                    <FaPaperPlane />
                                </div>
                                <h3 className="text-xl font-bold text-gray-900">Message Ready!</h3>
                                <p className="text-sm text-gray-500 mt-2">Your email client should have opened. If not, please email us directly at vkrvacations@gmail.com.</p>
                                <button
                                    onClick={() => setSubmitted(false)}
                                    className="mt-6 rounded-xl bg-accent px-6 py-3 text-sm font-bold text-white transition hover:bg-accent/90"
                                >
                                    Send Another Message
                                </button>
                            </div>
                        ) : (
                            <form onSubmit={handleSubmit} className="space-y-4">
                                <div className="grid gap-4 sm:grid-cols-2">
                                    <div>
                                        <label htmlFor="contact-name" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Name
                                        </label>
                                        <input
                                            id="contact-name"
                                            name="name"
                                            type="text"
                                            required
                                            value={formData.name}
                                            onChange={handleChange}
                                            placeholder="Your name"
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                        />
                                    </div>
                                    <div>
                                        <label htmlFor="contact-email" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                            Email
                                        </label>
                                        <input
                                            id="contact-email"
                                            name="email"
                                            type="email"
                                            required
                                            value={formData.email}
                                            onChange={handleChange}
                                            placeholder="you@example.com"
                                            className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                        />
                                    </div>
                                </div>

                                <div>
                                    <label htmlFor="contact-subject" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Subject
                                    </label>
                                    <input
                                        id="contact-subject"
                                        name="subject"
                                        type="text"
                                        value={formData.subject}
                                        onChange={handleChange}
                                        placeholder="Booking inquiry, general question, etc."
                                        className="w-full rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>

                                <div>
                                    <label htmlFor="contact-message" className="block text-xs font-semibold uppercase tracking-wider text-gray-500 mb-1.5">
                                        Message
                                    </label>
                                    <textarea
                                        id="contact-message"
                                        name="message"
                                        required
                                        rows={5}
                                        value={formData.message}
                                        onChange={handleChange}
                                        placeholder="Tell us how we can help..."
                                        className="w-full resize-none rounded-xl border border-gray-200 bg-gray-50 px-4 py-3 text-sm text-gray-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20"
                                    />
                                </div>

                                <button
                                    type="submit"
                                    disabled={sending}
                                    className="flex w-full items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3.5 text-sm font-bold uppercase tracking-wider text-white transition hover:bg-accent/90 disabled:opacity-60"
                                >
                                    <FaPaperPlane size={13} />
                                    {sending ? "Opening..." : "Send Message"}
                                </button>
                            </form>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
