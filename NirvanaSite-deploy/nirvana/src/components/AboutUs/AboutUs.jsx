import React, { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { FaEnvelope, FaInstagram, FaFacebook, FaPhone } from 'react-icons/fa';

const AboutUs = () => {
  const heroRef = useRef(null);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.pageYOffset;
      if (heroRef.current) {
        heroRef.current.style.backgroundPositionY = `calc(50% + ${scrollPosition / 2}px)`;
      }
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800 pb-20">
      {/* Hero Section */}
      <div
        ref={heroRef}
        className="relative h-[60vh] w-full overflow-hidden bg-cover bg-center -mt-[50px]"
        style={{
          backgroundImage: `url(/assets/aboutUs-hero.avif)`,
        }}
      >
        <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
          <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-lg">About Us</h1>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-20 space-y-24">
        {/* Section 1: Our Story */}
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

        {/* Section 2: The Nirvana Experience (Reversed) */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">The Nirvana Experience</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              At Nirvana Vacations, we redefine luxury getaways. Each property features premium
              amenities, from private hot tubs and gourmet kitchens to breathtaking views and
              outdoor entertainment areas. Our properties are thoughtfully designed to provide
              the perfect backdrop for memorable moments, whether it's a romantic retreat,
              family gathering, or peaceful solo escape.
            </p>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform -rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-indoor.avif" alt="Luxury interior" className="w-full h-auto object-cover" />
          </div>
        </div>

        {/* Section 3: Our Commitment */}
        <div className="flex flex-col md:flex-row items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Our Commitment</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              We're dedicated to providing exceptional service and unforgettable experiences.
              Our team ensures every detail is perfect, from seamless check-ins to personalized
              recommendations for local attractions. We believe in sustainable tourism and actively
              work to minimize our environmental impact while supporting local communities.
            </p>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-indoor.avif" alt="Guest services" className="w-full h-auto object-cover" />
          </div>
        </div>

        {/* Section 4: Connect With Us (Reversed) */}
        <div className="flex flex-col md:flex-row-reverse items-center gap-12 lg:gap-24">
          <div className="w-full md:w-1/2 space-y-6">
            <h3 className="text-3xl font-bold text-gray-900 border-l-4 border-primary pl-4">Connect With Us</h3>
            <p className="text-lg text-gray-600 leading-relaxed">
              We love hearing from our guests! Whether you have questions about our properties
              or want to share your Nirvana experience, reach out to us through any of these channels:
            </p>
            <div className="flex flex-col gap-4 mt-6">
              <a href="mailto:vkrvacations@gmail.com" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaEnvelope className="text-primary text-xl" /> vkrvacations@gmail.com
              </a>
              <a href="https://www.instagram.com/nirvanaaluxe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaInstagram className="text-primary text-xl" /> @nirvanaaluxe
              </a>
              <a href="https://www.facebook.com/NirvanaaLuxe" target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaFacebook className="text-primary text-xl" /> Nirvana Luxe
              </a>
              <a href="tel:+1-972-835-9376" className="flex items-center gap-3 text-lg text-gray-700 hover:text-primary transition-colors font-medium">
                <FaPhone className="text-primary text-xl" /> 972-835-9376
              </a>
            </div>
          </div>
          <div className="w-full md:w-1/2 rounded-2xl overflow-hidden shadow-2xl transform -rotate-2 hover:rotate-0 transition-all duration-500">
            <img src="/assets/aboutUs-indoor.avif" alt="Connect with us" className="w-full h-auto object-cover" />
          </div>
        </div>
      </div>
    </div>
  );
};

export default AboutUs;
