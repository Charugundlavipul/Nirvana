'use client';

import React, { useEffect, useRef } from "react";
import { FaEnvelope, FaInstagram, FaFacebook, FaPhone } from 'react-icons/fa';

const AboutUs = () => {


  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 pb-20">
      <section className="hero-section relative overflow-hidden bg-white px-4 pb-4 pt-28 sm:px-6 sm:pb-4 sm:pt-28 md:pb-6 md:pt-28 border-b border-slate-100">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/5 sm:h-96 sm:w-96"></div>
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-50 sm:h-[420px] sm:w-[420px]"></div>
          <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-amber-50/70 blur-2xl"></div>
        </div>
        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Who We Are</span>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            About Us
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
            Driven by a passion for creating extraordinary getaway experiences.
          </p>
        </div>
      </section>

      <div className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Our Story</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              Founded in 2020, Nirvana Vacations emerged from a passion for creating extraordinary
              getaway experiences. What started as a single luxury cabin has grown into a
              collection of carefully curated properties, each offering a unique blend of comfort
              and natural beauty. Our journey is driven by the belief that everyone deserves a
              perfect escape from the everyday.
            </p>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-outdoor.avif" alt="Our beautiful property" className="w-full h-auto object-cover" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">The Nirvana Experience</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              At Nirvana Vacations, we redefine luxury getaways. Each property features premium
              amenities, from private hot tubs and gourmet kitchens to breathtaking views and
              outdoor entertainment areas. Our properties are thoughtfully designed to provide
              the perfect backdrop for memorable moments, whether it&apos;s a romantic retreat,
              family gathering, or peaceful solo escape.
            </p>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform -rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-indoor.avif" alt="Luxury interior" className="w-full h-auto object-cover" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Our Commitment</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              We&apos;re dedicated to providing exceptional service and unforgettable experiences.
              Our team ensures every detail is perfect, from seamless check-ins to personalized
              recommendations for local attractions. We believe in sustainable tourism and actively
              work to minimize our environmental impact while supporting local communities.
            </p>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-serviceV2.png" alt="Guest services" className="w-full h-auto object-cover" />
          </div>
        </div>

        <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Connect With Us</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              We love hearing from our guests! Whether you have questions about our properties
              or want to share your Nirvana experience, reach out to us through any of these channels:
            </p>
            <div className="flex flex-col gap-4 mt-6">
              <a href="mailto:reservations@vkr-ventures.com" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaEnvelope className="text-primary text-xl" /> reservations@vkr-ventures.com
              </a>
              <a href="https://www.instagram.com/nirvanaluxevacations" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaInstagram className="text-primary text-xl" /> @nirvanaluxevacations
              </a>
              <a href="https://www.facebook.com/NirvanaLuxe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaFacebook className="text-primary text-xl" /> Nirvana Luxe
              </a>
              <a href="tel:704-780-1368" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaPhone className="text-primary text-xl" /> 704-780-1368
              </a>
            </div>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform -rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-connect.png" alt="Connect with us" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
