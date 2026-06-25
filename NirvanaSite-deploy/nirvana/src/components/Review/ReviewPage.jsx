'use client';

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import ReviewCard from "./ReviewCard";
import { FaSearch, FaChevronDown, FaCheck, FaTimes, FaStar, FaQuoteLeft } from 'react-icons/fa';

const ReviewsPage = ({ initialProperties = [], initialReviews = [], initialSlug = null }) => {
  const router = useRouter();
  const [properties, setProperties] = useState(initialProperties);
  const [selectedProperty, setSelectedProperty] = useState(initialSlug || "all");
  const [reviews, setReviews] = useState(initialReviews);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 9;
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
        setSearchQuery("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setProperties(initialProperties);
    setSelectedProperty(initialSlug || "all");
    setReviews(initialReviews);
  }, [initialProperties, initialReviews, initialSlug]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProperty]);

  const filteredProperties = properties.filter((property) =>
    property.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    property.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);

  const averageRating = reviews.length > 0
    ? (reviews.reduce((sum, r) => sum + (r.rating || 0), 0) / reviews.length).toFixed(1)
    : "0.0";

  const handlePropertySelect = (propertySlug) => {
    setSelectedProperty(propertySlug);
    setIsDropdownOpen(false);
    setSearchQuery("");
    if (propertySlug === "all") {
      router.push("/review");
    } else {
      router.push(`/review/${propertySlug}`);
    }
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const getSelectedPropertyName = () => {
    if (selectedProperty === "all") return "All Properties";
    return properties.find((property) => property.slug === selectedProperty)?.title || selectedProperty;
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const isLoading = false;

  return (
    <div className="min-h-screen bg-slate-50 font-sans">
      {/* Light Hero */}
      <section className="hero-section relative overflow-hidden bg-white px-4 pb-4 pt-28 sm:px-6 sm:pb-4 sm:pt-28 md:pb-6 md:pt-28 border-b border-slate-100">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -left-20 -top-20 h-72 w-72 rounded-full bg-amber-50 sm:h-96 sm:w-96"></div>
          <div className="absolute -bottom-32 -right-32 h-80 w-80 rounded-full bg-accent/5 sm:h-[420px] sm:w-[420px]"></div>
          <div className="absolute left-1/3 top-1/2 h-40 w-40 rounded-full bg-blue-50/60 blur-2xl"></div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-4 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <FaQuoteLeft className="text-accent text-xs" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">Guest Experiences</span>
          </div>
          <h1 className="mb-3 text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            What Our Guests Are Saying
          </h1>
          <p className="mx-auto max-w-xl text-sm text-slate-500 sm:text-base">
            Real stories from real guests — browse verified reviews across all our luxury properties.
          </p>
        </div>
      </section>

      {/* Content */}
      <div className="relative z-10 mx-auto w-full max-w-7xl px-4 sm:px-6 pb-20 pt-8">
        {/* Stats & Filter Card */}
        <div className="mb-8 rounded-2xl border border-slate-200 bg-white p-4 shadow-lg sm:p-6">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            {/* Stats */}
            <div className="flex items-center gap-4 sm:gap-6">
              <div className="flex items-center gap-2.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-50 ring-1 ring-amber-100">
                  <FaStar className="text-amber-400 text-lg" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{averageRating}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Avg Rating</p>
                </div>
              </div>
              <div className="h-10 w-px bg-slate-200 hidden sm:block"></div>
              <div className="flex items-center gap-2.5">
                <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/10 ring-1 ring-accent/10">
                  <FaQuoteLeft className="text-accent text-sm" />
                </div>
                <div>
                  <p className="text-2xl font-extrabold text-slate-900">{reviews.length}</p>
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Reviews</p>
                </div>
              </div>
            </div>

            {/* Property Filter */}
            <div className="relative w-full sm:w-80" ref={dropdownRef}>
              <button
                onClick={() => setIsDropdownOpen(!isDropdownOpen)}
                onMouseDown={(e) => e.stopPropagation()}
                className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-all shadow-sm ${isDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200 hover:border-accent/50'}`}
              >
                <div className="flex items-center gap-3 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-accent/20 to-accent/5 flex items-center justify-center flex-shrink-0">
                    <FaSearch className="text-accent text-sm" />
                  </div>
                  <div className="min-w-0">
                    <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter by Property</p>
                    <p className="text-sm font-semibold text-slate-900 truncate">{getSelectedPropertyName()}</p>
                  </div>
                </div>
                <FaChevronDown className={`text-slate-400 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {isDropdownOpen && (
                <div
                  className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-2xl z-50 overflow-hidden"
                  onMouseDown={(e) => e.stopPropagation()}
                >
                  <div className="p-3 border-b border-slate-100">
                    <div className="flex items-center gap-2 bg-slate-50 rounded-lg px-3 py-2">
                      <FaSearch className="text-slate-400 text-sm" />
                      <input
                        type="text"
                        placeholder="Search properties..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="flex-1 bg-transparent text-sm focus:outline-none placeholder-slate-400"
                        autoFocus
                      />
                      {searchQuery && (
                        <button onClick={() => setSearchQuery("")} className="text-slate-400 hover:text-slate-600">
                          <FaTimes size={12} />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="max-h-64 overflow-y-auto">
                    <button
                      onClick={() => handlePropertySelect("all")}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${selectedProperty === "all" ? 'bg-accent/5' : ''}`}
                    >
                      <span className="font-medium text-slate-900">All Properties</span>
                      {selectedProperty === "all" && <FaCheck className="text-accent" />}
                    </button>

                    <div className="h-px bg-slate-100 mx-4"></div>

                    {filteredProperties.length > 0 ? (
                      filteredProperties.map((property) => (
                        <button
                          key={property.slug}
                          onClick={() => handlePropertySelect(property.slug)}
                          className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${selectedProperty === property.slug ? 'bg-accent/5' : ''}`}
                        >
                          <div className="flex items-center gap-3 min-w-0">
                            <img src={property.image} alt={property.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200" />
                            <div className="min-w-0">
                              <p className="font-medium text-slate-900 truncate">{property.title}</p>
                              <p className="text-xs text-slate-500 truncate">{property.location}</p>
                            </div>
                          </div>
                          {selectedProperty === property.slug && <FaCheck className="text-accent flex-shrink-0" />}
                        </button>
                      ))
                    ) : (
                      <div className="px-4 py-6 text-center text-slate-500 text-sm">No properties found</div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="mb-8">
          {isLoading ? (
            <p className="py-8 text-center text-base font-medium text-slate-500">Loading reviews...</p>
          ) : currentReviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 xl:grid-cols-3">
              {currentReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-200 bg-white px-6 py-16 text-center shadow-sm">
              <div className="mb-3 inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-slate-100 text-slate-400 text-xl">
                <FaQuoteLeft />
              </div>
              <p className="text-base font-semibold text-slate-700">No reviews yet</p>
              <p className="mt-1 text-sm text-slate-500">Be the first to share your experience!</p>
            </div>
          )}
        </div>

        {/* Pagination */}
        {reviews.length > reviewsPerPage && (
          <div className="flex items-center justify-center gap-2">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Previous
            </button>

            <div className="flex items-center gap-1">
              {Array.from({ length: totalPages }, (_, i) => i + 1).slice(
                Math.max(0, currentPage - 3),
                Math.min(totalPages, currentPage + 2)
              ).map((page) => (
                <button
                  key={page}
                  onClick={() => { setCurrentPage(page); window.scrollTo({ top: 0, behavior: 'smooth' }); }}
                  className={`h-10 w-10 rounded-xl text-sm font-bold transition-all ${page === currentPage ? 'bg-accent text-white shadow-md shadow-accent/20' : 'bg-white border border-slate-200 text-slate-600 hover:border-accent/50 hover:text-accent'}`}
                >
                  {page}
                </button>
              ))}
            </div>

            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-accent hover:text-accent hover:shadow-md disabled:cursor-not-allowed disabled:opacity-40"
            >
              Next
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default ReviewsPage;
