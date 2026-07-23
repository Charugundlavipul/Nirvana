'use client';

import React, { useEffect, useRef } from "react";
import { FaEnvelope, FaPhone, FaInstagram, FaFacebook, FaYoutube, FaMapMarkerAlt } from "react-icons/fa";
import ContactForm from "./ContactForm";

const ContactUs = () => {


    return (
        <div className="min-h-screen bg-gray-50 font-sans text-gray-800 pb-20">
            <section className="hero-section relative overflow-hidden bg-white px-4 pb-4 pt-28 sm:px-6 sm:pb-4 sm:pt-28 md:pb-6 md:pt-28 border-b border-slate-100">
                <div className="absolute inset-0 overflow-hidden">
                    <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/5 sm:h-96 sm:w-96"></div>
                    <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-50 sm:h-[420px] sm:w-[420px]"></div>
                    <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-amber-50/70 blur-2xl"></div>
                </div>

                <div className="relative z-10 mx-auto max-w-4xl text-center">
                    <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
                        <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Get In Touch</span>
                    </div>
                    <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
                        Contact Us
                    </h1>
                    <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
                        Have a question about our properties, or need help with a booking? We&rsquo;d love to hear from you.
                    </p>
                </div>
            </section>

            <div className="max-w-6xl mx-auto px-6 py-16 space-y-20">
                <div className="grid gap-6 sm:gap-8 grid-cols-1 md:grid-cols-2">
                    {/* Email Tile */}
                    <a
                        href="mailto:reservations@vkr-ventures.com"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaEnvelope className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-[#EA4335]/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-[#EA4335]/10 text-[#EA4335] text-2xl transition-transform duration-300 group-hover:scale-110">
                            <FaEnvelope />
                        </div>
                        <div className="relative z-10 space-y-1.5">
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">Email Us</h3>
                            <p className="text-base text-gray-500 font-medium">reservations@vkr-ventures.com</p>
                        </div>
                    </a>

                    {/* Phone Tile */}
                    <a
                        href="tel:704-780-1368"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaPhone className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-[#25D366]/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-[#25D366]/10 text-[#25D366] text-2xl transition-transform duration-300 group-hover:scale-110">
                            <FaPhone />
                        </div>
                        <div className="relative z-10 space-y-1.5">
                            <h3 className="font-bold text-gray-900 text-xl tracking-tight">Call Us</h3>
                            <p className="text-base text-gray-500 font-medium">704-780-1368</p>
                        </div>
                    </a>

                    {/* Instagram Tile */}
                    <a
                        href="https://www.instagram.com/nirvanaluxevacations/"
                        target="_blank"
                        rel="noopener noreferrer"
                        className="group relative overflow-hidden flex flex-col items-center justify-center gap-4 rounded-[2rem] border border-gray-200 bg-white p-10 sm:p-12 text-center shadow-sm transition-all duration-300 hover:-translate-y-1 hover:border-accent/40 hover:shadow-xl hover:shadow-accent/5"
                    >
                        <FaInstagram className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-[#E1306C]/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-[#E1306C]/10 text-[#E1306C] text-2xl transition-transform duration-300 group-hover:scale-110">
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
                        <FaFacebook className="absolute -bottom-6 -right-6 text-[140px] text-gray-50 opacity-80 transition-transform duration-700 group-hover:-translate-y-3 group-hover:-translate-x-3 group-hover:text-[#1877F2]/5 rotate-[-15deg] pointer-events-none" />
                        <div className="relative z-10 grid h-16 w-16 place-items-center rounded-full bg-[#1877F2]/10 text-[#1877F2] text-2xl transition-transform duration-300 group-hover:scale-110">
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
                            Our luxury properties are located in the heart of the Smoky Mountains and on the beautiful shores of Lake Norman and Lake Wylie.
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
                                <h4 className="font-bold text-gray-900">Lake Norman & Lake Wylie, North Carolina</h4>
                                <p className="text-sm text-gray-500 mt-1">Lakeside luxury with stunning waterfront views and endless water activities.</p>
                            </div>
                        </div>
                    </div>

                    <div className="rounded-xl border border-gray-200 bg-white p-6 shadow-sm text-center">
                        <h4 className="font-bold text-gray-900 mb-3">Follow Us</h4>
                        <div className="flex justify-center gap-3">
                            <a href="https://www.youtube.com/@nirvanaluxevacations" target="_blank" rel="noopener noreferrer" aria-label="YouTube" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
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
