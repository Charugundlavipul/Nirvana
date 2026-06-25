'use client';

import React, { useEffect, useState } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const pathname = usePathname();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLinkClick = () => {
    if (isOpen) setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeMenuOnResize = () => {
      if (window.innerWidth >= 1024) setIsOpen(false);
    };
    window.addEventListener("resize", closeMenuOnResize);
    return () => window.removeEventListener("resize", closeMenuOnResize);
  }, [isOpen]);

  useEffect(() => {
    setIsOpen(false);
  }, [pathname]);

  useEffect(() => {
    document.documentElement.classList.toggle('nav-menu-open', isOpen);
    document.body.classList.toggle('nav-menu-open', isOpen);

    return () => {
      document.documentElement.classList.remove('nav-menu-open');
      document.body.classList.remove('nav-menu-open');
    };
  }, [isOpen]);

  const isActive = (path) => {
    if (path === '/' && pathname === '/') return true;
    return path !== '/' && pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Properties', path: '/properties' },
    { name: 'Investors', path: '/hosts', highlight: true },
    { name: 'FAQ', path: '/faq' },
    { name: 'Reviews', path: '/review' },
    { name: 'About', path: '/about' },
    { name: 'Contact', path: '/contact' },
  ];

  return (
    <>
      <nav
        aria-label="Main navigation"
        className="fixed top-0 left-0 w-full z-50 transition-all duration-300 font-sans bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-4"
      >
        <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
          <div className="flex-shrink-0 z-[60]">
            <Link href="/" onClick={handleLinkClick}>
              <Image
                src="/assets/nirvana_logo_transparent.png"
                alt="Nirvana Luxe — Luxury Vacation Rentals"
                width={240}
                height={60}
                className="object-contain"
              />
            </Link>
          </div>

          <div className="hidden lg:flex items-center gap-4 xl:gap-8">
            {navLinks.map((link) => (
              <Link
                key={link.name}
                href={link.path}
                onClick={handleLinkClick}
                className={`text-sm font-medium uppercase tracking-widest transition-all ${link.highlight
                  ? 'text-accent border border-accent/30 bg-accent/5 px-4 py-1.5 rounded-full hover:bg-accent hover:text-white'
                  : isActive(link.path)
                    ? 'text-primary border-b-2 border-accent'
                    : 'text-gray-600 hover:text-primary hover:border-b-2 hover:border-accent/50'
                  }`}
              >
                {link.name}
              </Link>
            ))}
            <Link
              href="/book"
              onClick={handleLinkClick}
              className="px-8 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-accent transition-all duration-300 shadow-md"
            >
              BOOK NOW
            </Link>
          </div>

          <div className="lg:hidden z-[60] flex items-center">
            <button
              onClick={toggleMenu}
              className="focus:outline-none transition-colors text-gray-800"
              aria-controls="mobile-nav-drawer"
              aria-expanded={isOpen}
              aria-label="Toggle menu"
            >
              <div className={`w-6 h-0.5 mb-1.5 transition-all ${isOpen ? 'rotate-45 translate-y-2 bg-gray-800' : 'bg-gray-800'}`}></div>
              <div className={`w-6 h-0.5 mb-1.5 transition-all ${isOpen ? 'opacity-0' : 'bg-gray-800'}`}></div>
              <div className={`w-6 h-0.5 transition-all ${isOpen ? '-rotate-45 -translate-y-2 bg-gray-800' : 'bg-gray-800'}`}></div>
            </button>
          </div>
        </div>
      </nav>

      <div
        className={`fixed inset-0 z-40 bg-black/30 transition-opacity duration-300 lg:hidden ${isOpen ? 'pointer-events-auto opacity-100' : 'pointer-events-none opacity-0'}`}
        onClick={() => setIsOpen(false)}
        aria-hidden="true"
      />

      <aside
        id="mobile-nav-drawer"
        className={`fixed top-0 right-0 z-40 flex h-dvh w-[min(18rem,100vw)] max-w-full flex-col justify-center gap-8 border-l border-gray-200 bg-white px-8 pt-20 pb-10 shadow-2xl transition-transform duration-300 lg:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'}`}
        aria-label="Mobile navigation"
        inert={!isOpen}
      >
        {navLinks.map((link) => (
          <Link
            key={link.name}
            href={link.path}
            onClick={handleLinkClick}
            className={`text-2xl font-bold ${link.highlight ? 'text-accent' : isActive(link.path) ? 'text-primary' : 'text-gray-800'
              }`}
          >
            {link.name}
          </Link>
        ))}
        <Link
          href="/book"
          onClick={handleLinkClick}
          className="px-8 py-3 bg-primary text-white font-bold rounded-full text-xl shadow-lg text-center"
        >
          BOOK NOW
        </Link>
      </aside>
    </>
  );
}

export default Navbar;
