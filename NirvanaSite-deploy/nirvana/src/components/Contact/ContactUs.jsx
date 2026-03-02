import React, { useEffect, useRef } from "react";
import { FaEnvelope, FaPhone, FaInstagram, FaFacebook, FaMapMarkerAlt } from "react-icons/fa";

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

                {/* Locations */}
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
                                <p className="text-sm text-gray-500 mt-1">Gateway to the Great Smoky Mountains — perfect for nature lovers and adventure seekers.</p>
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
                            <a href="https://www.instagram.com/nirvanaaluxe/" target="_blank" rel="noopener noreferrer" aria-label="Instagram" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
                                <FaInstagram size={18} />
                            </a>
                            <a href="https://www.facebook.com/NirvanaaLuxe" target="_blank" rel="noopener noreferrer" aria-label="Facebook" className="grid h-11 w-11 place-items-center rounded-full border border-gray-200 text-gray-500 transition hover:border-accent hover:text-accent hover:shadow-md">
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
