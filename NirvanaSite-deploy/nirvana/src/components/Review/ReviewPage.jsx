import React, { useState, useEffect, useRef } from "react";
import { useNavigate, useParams } from "react-router-dom";
import ReviewCard from "./ReviewCard";
import { fetchPropertyCards, fetchReviews } from "../../lib/contentApi";
import { FaSearch, FaChevronDown, FaCheck, FaTimes } from 'react-icons/fa';

const ReviewsPage = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [properties, setProperties] = useState([]);
  const [selectedProperty, setSelectedProperty] = useState("all");
  const [reviews, setReviews] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const reviewsPerPage = 8;

  // Search dropdown state
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const dropdownRef = useRef(null);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const cards = await fetchPropertyCards();
        setProperties(cards);
      } catch (error) {
        console.error("Error loading review properties:", error);
      }
    };
    loadProperties();
  }, []);

  // Close dropdown when clicking outside
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
    if (!slug) {
      setSelectedProperty("all");
      return;
    }
    setSelectedProperty(slug || "all");
  }, [slug, properties]);

  useEffect(() => {
    const loadReviews = async () => {
      try {
        setIsLoading(true);
        if (selectedProperty === "all") {
          setReviews(await fetchReviews());
        } else {
          setReviews(await fetchReviews({ slug: selectedProperty }));
        }
      } catch (error) {
        console.error(`Error loading reviews for ${selectedProperty}:`, error);
        setReviews([]);
      } finally {
        setIsLoading(false);
      }
    };
    loadReviews();
  }, [selectedProperty]);

  useEffect(() => {
    setCurrentPage(1);
  }, [selectedProperty]);

  // Filter properties based on search
  const filteredProperties = properties.filter(p =>
    p.title?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.location?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const indexOfLastReview = currentPage * reviewsPerPage;
  const indexOfFirstReview = indexOfLastReview - reviewsPerPage;
  const currentReviews = reviews.slice(indexOfFirstReview, indexOfLastReview);
  const totalPages = Math.ceil(reviews.length / reviewsPerPage);

  const handlePropertySelect = (propertySlug) => {
    setSelectedProperty(propertySlug);
    setIsDropdownOpen(false);
    setSearchQuery("");
    if (propertySlug === "all") {
      navigate("/review");
    } else {
      navigate(`/review/${propertySlug}`);
    }
    setTimeout(() => {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }, 100);
  };

  const getSelectedPropertyName = () => {
    if (selectedProperty === "all") return "All Properties";
    return properties.find(p => p.slug === selectedProperty)?.title || selectedProperty;
  };

  const handlePrevPage = () => {
    setCurrentPage((prev) => Math.max(prev - 1, 1));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleNextPage = () => {
    setCurrentPage((prev) => Math.min(prev + 1, totalPages));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 px-4 py-24 md:px-8">
      <div className="mx-auto w-full max-w-7xl">

        {/* Header */}
        <div className="mb-8 text-center">
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 md:text-5xl">Guest Reviews</h1>
          <p className="mt-2 text-sm text-slate-600 md:text-base">Verified guest feedback across all properties.</p>
        </div>

        {/* Search/Filter Bar */}
        <div className="mb-8 flex flex-col sm:flex-row items-center justify-center gap-4">

          {/* Searchable Dropdown */}
          <div className="relative w-full sm:w-80" ref={dropdownRef}>
            <button
              onClick={() => setIsDropdownOpen(!isDropdownOpen)}
              className={`w-full flex items-center justify-between gap-3 rounded-xl border-2 bg-white px-4 py-3 text-left transition-all ${isDropdownOpen ? 'border-accent ring-2 ring-accent/20' : 'border-slate-200 hover:border-accent/50'
                }`}
            >
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-accent/10 flex items-center justify-center flex-shrink-0">
                  <FaSearch className="text-accent text-sm" />
                </div>
                <div className="min-w-0">
                  <p className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Filter by Property</p>
                  <p className="text-sm font-semibold text-slate-900 truncate">{getSelectedPropertyName()}</p>
                </div>
              </div>
              <FaChevronDown className={`text-slate-400 transition-transform flex-shrink-0 ${isDropdownOpen ? 'rotate-180' : ''}`} />
            </button>

            {/* Dropdown Menu */}
            {isDropdownOpen && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-xl border border-slate-200 shadow-xl z-50 overflow-hidden">
                {/* Search Input */}
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

                {/* Options List */}
                <div className="max-h-64 overflow-y-auto">
                  <button
                    onClick={() => handlePropertySelect("all")}
                    className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${selectedProperty === "all" ? 'bg-accent/5' : ''
                      }`}
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
                        className={`w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-slate-50 transition-colors ${selectedProperty === property.slug ? 'bg-accent/5' : ''
                          }`}
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <img src={property.image} alt={property.title} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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

          {/* Quick Stats Pill */}
          <div className="flex items-center gap-2 text-sm text-slate-600">
            <span className="rounded-full bg-white border border-slate-200 px-4 py-2 shadow-sm">
              <span className="font-bold text-slate-900">{reviews.length}</span> reviews
            </span>
          </div>
        </div>

        {/* Reviews Grid */}
        <div className="mb-5">
          {isLoading ? (
            <p className="py-8 text-center text-base font-medium text-slate-500">Loading reviews...</p>
          ) : currentReviews.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
              {currentReviews.map((review) => <ReviewCard key={review.id} review={review} />)}
            </div>
          ) : (
            <p className="py-8 text-center text-base text-slate-500">No reviews available.</p>
          )}
        </div>

        {/* Pagination */}
        {reviews.length > reviewsPerPage && (
          <div className="flex items-center justify-center gap-3">
            <button
              onClick={handlePrevPage}
              disabled={currentPage === 1}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
            >
              Previous
            </button>
            <span className="text-sm font-semibold text-slate-700">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={handleNextPage}
              disabled={currentPage === totalPages}
              className="rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-800 transition hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
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
