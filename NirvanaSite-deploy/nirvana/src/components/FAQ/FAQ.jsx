import React, { useState, useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import FAQItem from './FAQItem';
import { fetchFaqsBySlug, fetchPropertyCards } from '../../lib/contentApi';
import { FaCircleCheck } from 'react-icons/fa6';
import { FaSearch, FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

const FAQ = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [properties, setProperties] = useState([]);
  const [selectedSlug, setSelectedSlug] = useState(null);
  const [displayedFaqs, setDisplayedFaqs] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState('');
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const dropdownRef = useRef(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        setIsLoading(true);
        const cards = await fetchPropertyCards();
        setProperties(cards);
      } catch (error) {
        console.error('Error loading FAQ properties:', error);
        setErrorMessage('Unable to load FAQs right now.');
      } finally {
        setIsLoading(false);
      }
    };
    loadProperties();
  }, []);

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
    if (!properties.length) return;
    const nextSlug = slug && properties.some((item) => item.slug === slug) ? slug : properties[0]?.slug || null;
    setSelectedSlug(nextSlug);
  }, [slug, properties]);

  useEffect(() => {
    const loadFaqs = async () => {
      if (!selectedSlug) return;
      try {
        const faqs = await fetchFaqsBySlug(selectedSlug);
        setDisplayedFaqs(faqs);
      } catch (error) {
        console.error('Error loading FAQs:', error);
        setDisplayedFaqs([]);
      }
    };
    loadFaqs();
  }, [selectedSlug]);

  const filteredProperties = properties.filter(p => 
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handlePropertySelect = (propertySlug) => {
    setSelectedSlug(propertySlug);
    setIsDropdownOpen(false);
    setSearchQuery('');
    navigate('/faq/' + propertySlug);
  };

  const getSelectedPropertyName = () => {
    const selected = properties.find(p => p.slug === selectedSlug);
    return selected?.title || 'Select Property';
  };

  const getSelectedPropertyImage = () => {
    const selected = properties.find(p => p.slug === selectedSlug);
    return selected?.image || null;
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-24 font-sans md:px-8">
      <div className="mx-auto w-full max-w-5xl">
        <div className="mb-8 rounded-3xl border border-slate-200 bg-white/90 p-8 text-center shadow-sm backdrop-blur-sm">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Frequently Asked Questions</h1>
          <p className="mx-auto mt-3 max-w-2xl text-sm text-slate-600 md:text-base">Find quick answers about check-in, amenities, bookings, and house rules.</p>
        </div>

        <div className="mb-8 flex justify-center">
          <div className="relative w-full sm:w-96" ref={dropdownRef}>
            <button onClick={() => setIsDropdownOpen(!isDropdownOpen)} className={'w-full flex items-center justify-between gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-all shadow-sm ' + (isDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200 hover:border-accent/50')}>
              <div className="flex items-center gap-3 min-w-0">
                {getSelectedPropertyImage() ? (
                  <img src={getSelectedPropertyImage()} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
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
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                <div className="p-3 border-b border-slate-100">
                  <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                    <FaSearch className="text-slate-400 text-sm" />
                    <input type="text" placeholder="Search properties..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-sm focus:outline-none placeholder-slate-400" autoFocus />
                    {searchQuery && <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600"><FaTimes size={12} /></button>}
                  </div>
                </div>
                <div className="max-h-64 overflow-y-auto">
                  {filteredProperties.length > 0 ? filteredProperties.map((property) => (
                    <button key={property.slug} onClick={() => handlePropertySelect(property.slug)} className={'w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ' + (selectedSlug === property.slug ? 'bg-accent/5' : '')}>
                      <div className="flex items-center gap-3 min-w-0">
                        <img src={property.image} alt={property.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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

        <div id="faq-list" className="space-y-3">
          {isLoading && <p className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center text-base font-medium text-slate-500">Loading FAQs...</p>}
          {!isLoading && errorMessage && <p className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-5 text-center text-sm font-medium text-rose-700">{errorMessage}</p>}
          {!isLoading && !errorMessage && displayedFaqs.map((faq, index) => <FAQItem key={faq.id || index} question={faq.question} answer={faq.answer} />)}
          {!isLoading && !errorMessage && displayedFaqs.length === 0 && (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-8 text-center">
              <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-full bg-accent/10 text-accent"><FaCircleCheck /></div>
              <p className="text-sm text-slate-600">No FAQs available for this property yet.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default FAQ;
