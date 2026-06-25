'use client';

import React, { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import FAQItem from './FAQItem';
import { FaCircleCheck } from 'react-icons/fa6';
import { FaSearch, FaChevronDown, FaCheck, FaTimes, FaQuestionCircle } from 'react-icons/fa';

const FAQ = ({ initialProperties = [], initialSlug = null, initialFaqs = [] }) => {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  const [selectedSlug, setSelectedSlug] = useState(initialSlug);
  const [displayedFaqs, setDisplayedFaqs] = useState(initialFaqs);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchQuery('');
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    setProperties(initialProperties);
    setSelectedSlug(initialSlug);
    setDisplayedFaqs(initialFaqs);
    setErrorMessage('');
  }, [initialProperties, initialSlug, initialFaqs]);

  const filteredProperties = properties.filter((property) =>
    property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePropertySelect = (propertySlug) => {
    setSelectedSlug(propertySlug);
    setIsDropdownOpen(false);
    setSearchQuery('');
    router.push(`/faq/${propertySlug}`);
  };

  const getSelectedPropertyName = () => {
    const selected = properties.find((property) => property.slug === selectedSlug);
    return selected?.title || 'Select Property';
  };

  const getSelectedPropertyImage = () => {
    const selected = properties.find((property) => property.slug === selectedSlug);
    return selected?.image || null;
  };

  const isLoading = false;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Light Hero */}
      <section className="hero-section relative overflow-hidden bg-white px-4 pb-4 pt-28 sm:px-6 sm:pb-4 sm:pt-28 md:pb-6 md:pt-28 border-b border-slate-100">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-20 -top-20 h-72 w-72 rounded-full bg-accent/5 sm:h-96 sm:w-96"></div>
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-50 sm:h-[420px] sm:w-[420px]"></div>
          <div className="absolute right-1/4 top-1/3 h-40 w-40 rounded-full bg-amber-50/70 blur-2xl"></div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <FaQuestionCircle className="text-accent text-xs" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Help Center</span>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Frequently Asked Questions
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
            Find quick answers about check-in, amenities, bookings, and house rules for your stay.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-4xl px-4 sm:px-6 pb-20 pt-8">
        {/* Property Selector Card */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-xs font-bold uppercase tracking-wider text-slate-400">Browsing FAQs for</p>
              <p className="mt-1 text-lg font-bold text-slate-900">{getSelectedPropertyName()}</p>
            </div>
            <div className="relative w-full sm:w-80" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onMouseDown={(e) => e.stopPropagation()}
                className={'w-full flex items-center justify-between gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-all shadow-sm ' + (isDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200 hover:border-accent/50')}
              >
                <div className="flex items-center gap-3 min-w-0">
                  {getSelectedPropertyImage() ? (
                    <img src={getSelectedPropertyImage()} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200" />
                  ) : (
                    <div className="w-10 h-10 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0">
                      <FaSearch className="text-accent text-sm" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Select Property</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{getSelectedPropertyName()}</p>
                  </div>
                </div>
                <FaChevronDown className={'text-slate-400 transition-transform flex-shrink-0 ' + (isDropdownOpen ? 'rotate-180' : '')} />
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <FaSearch className="text-slate-400 text-sm" />
                      <input type="text" placeholder="Search properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none placeholder-slate-400" autoFocus />
                      {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><FaTimes size={12} /></button>}
                    </div>
                  </div>
                  <div className="max-h-64 overflow-y-auto">
                    {filteredProperties.length > 0 ? filteredProperties.map((property) => (
                      <button
                        key={property.slug}
                        onClick={() => handlePropertySelect(property.slug)}
                        className={'w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ' + (selectedSlug === property.slug ? 'bg-accent/5' : '')}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={property.image} alt={property.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200" />
                          <div className="min-w-0">
                            <p className="font-medium text-slate-900 truncate">{property.title}</p>
                            <p className="text-xs text-slate-500 truncate">{property.location}</p>
                          </div>
                        </div>
                        {selectedSlug === property.slug && <FaCheck className="text-accent flex-shrink-0" />}
                      </button>
                    )) : <div className="px-4 py-6 text-center text-slate-500 text-sm">No properties found</div>}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* FAQ Items */}
        <div id="faq-list" className="space-y-3">
          {isLoading && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-base font-medium text-slate-500">Loading FAQs...</p>}
          {!isLoading && errorMessage && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center text-sm font-medium text-rose-700">{errorMessage}</p>}
          {!isLoading && !errorMessage && displayedFaqs.map((faq, index) => <FAQItem key={faq.id || index} question={faq.question} answer={faq.answer} index={index} />)}
          {!isLoading && !errorMessage && displayedFaqs.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-12 text-center shadow-sm">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-accent/10 text-accent text-xl"><FaCircleCheck /></div>
              <p className="text-base font-semibold text-slate-700">No FAQs available yet</p>
              <p className="mt-1 text-sm text-slate-500">This property doesn't have any frequently asked questions.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
