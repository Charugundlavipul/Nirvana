import React, { useState, useEffect } from 'react';
import { FaStar, FaQuoteLeft, FaChevronLeft, FaChevronRight, FaAirbnb } from 'react-icons/fa';
import Image from 'next/image';

const InlineReviews = ({ reviews = [] }) => {
  const [reviewIndex, setReviewIndex] = useState(0);
  const [isClient, setIsClient] = useState(false);
  const [expandedId, setExpandedId] = useState(null);

  useEffect(() => {
    setIsClient(true);
  }, []);

  useEffect(() => {
    if (!reviews?.length) return;
    const delay = expandedId !== null ? 10000 : 5000;
    const timer = setTimeout(() => {
      setExpandedId(null);
      setReviewIndex(prev => (prev + 1) % reviews.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [reviews?.length, expandedId, reviewIndex]);

  if (!reviews || reviews.length === 0) return null;

  const getVisibleReviews = () => {
    if (!reviews.length) return [];
    
    let count = 3;
    if (isClient && window.innerWidth < 1024) {
      count = 1;
    }
    count = Math.min(count, reviews.length);

    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(reviews[(reviewIndex + i) % reviews.length]);
    }
    return result;
  };

  const nextReview = () => {
    setExpandedId(null);
    setReviewIndex(prev => (prev + 1) % reviews.length);
  };
  const prevReview = () => {
    setExpandedId(null);
    setReviewIndex(prev => (prev - 1 + reviews.length) % reviews.length);
  };

  const renderStars = (rating) => {
    const num = Number.parseInt(rating, 10) || 5;
    return [...Array(5)].map((_, i) => (
      <FaStar key={i} size={12} className={i < num ? "text-amber-400" : "text-slate-200"} />
    ));
  };

  const renderSourceMark = (source) => {
    const src = (source || "").toLowerCase();
    if (src === "airbnb") {
      return <FaAirbnb size={24} className="text-rose-500" />;
    }
    if (src === "vrbo") {
      return (
        <div className="h-6 w-14 relative block">
           <Image src="/assets/vrbo.png" alt="Vrbo" fill sizes="56px" className="object-contain" />
        </div>
      );
    }
    return (
      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {src || "direct"}
      </span>
    );
  };

  const renderReviewCard = (review, idx) => {
      const cardId = review.id || `${review.name}-${idx}`;
      const isExpanded = expandedId === cardId;
      
      return (
        <div 
          key={cardId}
          className="w-full h-full bg-white p-6 md:p-8 rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-slate-100 flex flex-col relative"
        >
            <FaQuoteLeft className="absolute top-6 right-6 text-4xl text-accent/10" />

            <div className="flex items-center gap-4 mb-6">
              <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-accent to-emerald-400 overflow-hidden flex-shrink-0 ring-4 ring-accent/20">
                {review.img ? (
                  <Image src={review.img} alt={review.name || "Guest"} fill sizes="56px" className="object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                    {review.name?.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() || 'G'}
                  </div>
                )}
              </div>
              <div className="flex-1 text-left">
                <h4 className="font-bold text-gray-900 text-lg">
                  - {review.name || "Anonymous Guest"}
                </h4>
                <div className="flex items-center gap-2">
                  <div className="flex text-amber-500">
                    {renderStars(review.rating || review.stars)}
                  </div>
                  <span className="text-xs text-slate-400">5.0</span>
                </div>
              </div>
              <div className="opacity-90">
                {renderSourceMark(review.source)}
              </div>
            </div>

            <div className="flex-grow flex flex-col text-left">
                <p className={`text-gray-600 leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-4'}`}>
                  "{review.text}"
                </p>
                {review.text && review.text.length > 130 && (
                    <button 
                        onClick={() => setExpandedId(isExpanded ? null : cardId)} 
                        className="text-accent text-sm font-semibold mt-2 hover:underline text-left self-start"
                    >
                        {isExpanded ? 'Read less' : 'Read full review'}
                    </button>
                )}
            </div>

            <div className="mt-4 pt-4 border-t border-slate-100 text-left">
              <p className="text-xs text-slate-400">
                Stayed at <span className="text-accent font-medium">{review.property || 'Nirvana Luxe'}</span>
              </p>
            </div>
        </div>
      );
  };

  return (
    <section className="pt-12 pb-24 bg-slate-50 relative overflow-hidden">
      <div className="max-w-7xl mx-auto px-6 mb-12 text-center">
        <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Guest Experiences</p>
        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">What Our Guests Say</h2>
      </div>

      <div className="max-w-7xl mx-auto px-6">
        <div className="flex items-center justify-center gap-4 md:gap-8">
          <button
            onClick={prevReview}
            className="hidden md:inline-flex p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300 flex-shrink-0"
          >
            <FaChevronLeft size={20} />
          </button>

          <div className="hidden lg:grid grid-cols-3 gap-6 w-full">
            {getVisibleReviews().map((review, idx) => renderReviewCard(review, idx))}
          </div>

          {/* Mobile/Tablet View */}
          <div className="lg:hidden w-full">
            <div className="flex justify-center max-w-sm mx-auto">
              {getVisibleReviews().length > 0 && renderReviewCard(getVisibleReviews()[0], 0)}
            </div>
          </div>

          <button
            onClick={nextReview}
            className="hidden md:inline-flex p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
          >
            <FaChevronRight size={20} />
          </button>
        </div>
        
        {/* Mobile controls */}
        <div className="mt-6 flex items-center justify-center gap-3 md:hidden">
          <button
            onClick={prevReview}
            className="inline-flex p-3 rounded-full bg-white shadow-lg border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
            aria-label="Previous review"
          >
            <FaChevronLeft size={18} />
          </button>
          <button
            onClick={nextReview}
            className="inline-flex p-3 rounded-full bg-white shadow-lg border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
            aria-label="Next review"
          >
            <FaChevronRight size={18} />
          </button>
        </div>
      </div>
    </section>
  );
};

export default InlineReviews;
