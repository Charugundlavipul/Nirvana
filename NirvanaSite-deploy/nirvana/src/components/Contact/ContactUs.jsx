'use client';

import React, { useEffect, useRef } from "react";
import { FaEnvelope, FaPhone, FaInstagram, FaFacebook, FaYoutube, FaMapMarkerAlt } from "react-icons/fa";
import ContactForm from "./ContactForm";

const ContactUs = () => {
    const heroRef = useRef(null);

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

    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
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
                <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
                    {/* Email Tile */}
                    <a
                        href="mailto:reservations@vkr-ventures.com"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaEnvelope className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-accent/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent text-2xl transition-transform duration-300 group-hover:scale-110">
                            <FaEnvelope />
                        </div>
                        <div className="relative z-10 space-y-1.5">
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">Email Us</h3>
                            <p className="text-base text-gray-500 font-medium">reservations@vkr-ventures.com</p>
                        </div>
                    </a>

                    {/* Phone Tile */}
                    <a
                        href="tel:704-780-1369"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaPhone className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-accent/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent text-2xl transition-transform duration-300 group-hover:scale-110">
                            <FaPhone />
                        </div>
                        <div className="relative z-10 space-y-1.5">
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">Call Us</h3>
                            <p className="text-base text-gray-500 font-medium">704-780-1369</p>
                        </div>
                    </a>

                    {/* Instagram Tile */}
                    <a
                        href="https://www.instagram.com/nirvanaluxevacations/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaInstagram className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-accent/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent text-2xl transition-transform duration-300 group-hover:scale-110">
                            <FaInstagram />
                        </div>
                        <div className="relative z-10 space-y-1.5">
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">Instagram</h3>
                            <p className="text-base text-gray-500 font-medium">@nirvanaluxevacations</p>
                        </div>
                    </a>

                    {/* Facebook Tile */}
                    <a
                        href="https://www.facebook.com/NirvanaLuxe"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaFacebook className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-accent/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-accent/10 text-accent text-2xl transition-transform duration-300 group-hover:scale-110">
                            <FaFacebook />
                        </div>
                        <div className="relative z-10 space-y-1.5">
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">Facebook</h3>
                            <p className="text-base text-gray-500 font-medium">Nirvana Luxe</p>
                        </div>
                    </a>
                </div>

                {/* Form Section injected right below the quick links */}
                <div className="py-8">
                    <ContactForm />
                </div>

                <div className="max-w-3xl mx-auto space-y-8">
                    <div className="text-center">
                        <h2 className="text-3xl font-bold text-gray-900">Our Locations</h2>
                        <p className="mt-3 text-gray-600 leading-relaxed">
                            Our luxury properties are located in the heart of the Smoky Mountains and on the beautiful shores of Lake Norman.
                        </p>
                    </div>

                    <div className="grid gap-6 md:grid-cols-2">
                        <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                                <FaMapMarkerAlt />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Sevierville, Tennessee</h4>
                                <p className="text-sm text-gray-500 mt-1">Gateway to the Great Smoky Mountains, perfect for nature lovers and adventure seekers.</p>
                            </div>
                        </div>

                        <div className="flex items-start gap-4 rounded-xl border border-gray-200 bg-white p-6 shadow-sm">
                            <div className="grid h-10 w-10 flex-shrink-0 place-items-center rounded-full bg-accent/10 text-accent">
                                <FaMapMarkerAlt />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">Lake Norman, North Carolina</h4>
                                <p className="text-sm text-gray-500 mt-1">Lakeside luxury with stunning waterfront views and endless water activities.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
                        <h4 className="font-bold text-gray-900 mb-3">Follow Us</h4>
                        <div className="flex justify-center gap-3">
                            <a href="https://www.youtube.com/@nirvanaaluxe" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                <FaYoutube size={18} />
                            </a>
                            <a href="https://www.instagram.com/nirvanaluxevacations/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                <FaInstagram size={18} />
                            </a>
                            <a href="https://www.facebook.com/NirvanaLuxe" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                <FaFacebook size={18} />
                            </a>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ContactUs;
