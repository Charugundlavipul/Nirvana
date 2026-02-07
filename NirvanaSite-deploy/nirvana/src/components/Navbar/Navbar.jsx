import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';

function Navbar() {
  const [isOpen, setIsOpen] = useState(false);
  const location = useLocation();

  const toggleMenu = () => setIsOpen(!isOpen);

  const handleLinkClick = () => {
    if (isOpen) setIsOpen(false);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    if (!isOpen) return;
    const closeMenuOnResize = () => {
      if (window.innerWidth >= 768) setIsOpen(false);
    };
    window.addEventListener("resize", closeMenuOnResize);
    return () => window.removeEventListener("resize", closeMenuOnResize);
  }, [isOpen]);

  const isActive = (path) => {
    if (path === '/' && location.pathname === '/') return true;
    return path !== '/' && location.pathname.startsWith(path);
  };

  const navLinks = [
    { name: 'Home', path: '/' },
    { name: 'Properties', path: '/properties' },
    { name: 'FAQ', path: '/faq' },
    { name: 'Reviews', path: '/review' },
    { name: 'About', path: '/about' },
  ];

  return (
    <nav
      className="fixed top-0 left-0 w-full z-50 transition-all duration-300 font-sans bg-white/95 backdrop-blur-md shadow-sm border-b border-gray-100 py-2"
    >
      <div className="max-w-7xl mx-auto px-6 flex justify-between items-center">
        {/* Logo */}
        <div className="flex-shrink-0 z-50">
          <Link to="/" onClick={handleLinkClick}>
            <img
              src="/assets/nirvana_logo.png"
              alt="Nirvana Logo"
              className="h-12 w-auto object-contain"
            />
          </Link>
        </div>

        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => (
            <Link
              key={link.name}
              to={link.path}
              onClick={handleLinkClick}
              className={`text-sm font-medium uppercase tracking-widest transition-colors ${isActive(link.path)
                ? 'text-primary border-b-2 border-accent'
                : 'text-gray-600 hover:text-primary hover:border-b-2 hover:border-accent/50'
                }`}
            >
              {link.name}
            </Link>
          ))}
          <Link
            to="/book"
            onClick={handleLinkClick}
            className="px-8 py-3 bg-primary text-white text-xs font-bold uppercase tracking-widest rounded-none hover:bg-accent transition-all duration-300 shadow-md"
          >
            BOOK NOW
          </Link>
        </div>

        {/* Mobile Hamburger */}
        <div className="md:hidden z-50 flex items-center">
          <button
            onClick={toggleMenu}
            className="focus:outline-none transition-colors text-gray-800"
            aria-label="Toggle menu"
          >
            <div className={`w-6 h-0.5 mb-1.5 transition-all ${isOpen ? 'rotate-45 translate-y-2 bg-gray-800' : 'bg-gray-800'}`}></div>
            <div className={`w-6 h-0.5 mb-1.5 transition-all ${isOpen ? 'opacity-0' : 'bg-gray-800'}`}></div>
            <div className={`w-6 h-0.5 transition-all ${isOpen ? '-rotate-45 -translate-y-2 bg-gray-800' : 'bg-gray-800'}`}></div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div
        className={`fixed inset-0 bg-white z-40 flex flex-col items-center justify-center gap-8 transition-transform duration-300 md:hidden ${isOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
      >
        {navLinks.map((link) => (
          <Link
            key={link.name}
            to={link.path}
            onClick={handleLinkClick}
            className={`text-2xl font-bold ${isActive(link.path) ? 'text-primary' : 'text-gray-800'
              }`}
          >
            {link.name}
          </Link>
        ))}
        <Link
          to="/book"
          onClick={handleLinkClick}
          className="px-8 py-3 bg-primary text-white font-bold rounded-full text-xl shadow-lg"
        >
          BOOK NOW
        </Link>
      </div>
    </nav>
  );
}

export default Navbar;
