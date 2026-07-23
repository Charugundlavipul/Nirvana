'use client';

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { FaChevronLeft, FaChevronRight, FaStar, FaAirbnb, FaBed, FaBath, FaUsers, FaMapMarkerAlt, FaQuoteLeft, FaSearch, FaCalendarAlt } from 'react-icons/fa';
import { getCompactBathroomSummary } from "../../lib/bathrooms";
import CustomDatePicker from '../common/CustomDatePicker';
import CustomSelect from '../common/CustomSelect';
import CarouselNavigation from '../common/CarouselNavigation';

const HERO_IMAGE = "/assets/exterior.avif";
const CTA_IMAGE = "/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp";

const getPropertyCardImages = (property) => {
  const primary = property.primary_image || property.image || "";
  const seen = new Set();

  return [primary, ...(property.highlightImages || [])]
    .filter(Boolean)
    .filter((img) => {
      if (seen.has(img)) return false;
      seen.add(img);
      return true;
    })
    .slice(0, 5);
};

const Home = ({ initialProperties = [], initialReviews = [] }) => {
  const router = useRouter();

  // Dynamic properties state
  const [properties, setProperties] = useState(initialProperties);
  const [itemsToShow, setItemsToShow] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [imageIndices, setImageIndices] = useState({});
  const [cardImagesBySlug, setCardImagesBySlug] = useState({});

  const [reviews, setReviews] = useState(initialReviews);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [expandedReviewId, setExpandedReviewId] = useState(null);
  const [selectedSource, setSelectedSource] = useState("all");

  // Badge assignment based on property order
  const BADGES = ["Most Popular", "Featured", "New"];

  useEffect(() => {
    const homeProperties = initialProperties || [];
    setProperties(homeProperties);

    const indices = {};
    const initialCardImages = {};
    homeProperties.forEach((property) => {
      indices[property.id] = 0;
      initialCardImages[property.slug] = getPropertyCardImages(property);
    });

    setImageIndices(indices);
    setCardImagesBySlug(initialCardImages);
  }, [initialProperties]);

  useEffect(() => {
    setReviews(initialReviews || []);
    setReviewIndex(0);
  }, [initialReviews]);

  // Handle items to show on resize
  useEffect(() => {
    const handleResize = () => {
      const width = window.innerWidth;
      if (width >= 1024) {
        setItemsToShow(3);
        setIsMobile(false);
      } else if (width >= 768) {
        setItemsToShow(2);
        setIsMobile(false);
      } else {
        setItemsToShow(1);
        setIsMobile(true);
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [visibleCount, setVisibleCount] = useState(6);

  const getVisibleProperties = () => {
    if (!properties.length) return [];
    return properties.slice(0, visibleCount);
  };

  const filteredReviews = reviews.filter(r => {
    if (selectedSource === "all") return true;
    return r.source === selectedSource;
  });

  useEffect(() => {
    if (!filteredReviews?.length) return;
    const delay = expandedReviewId !== null ? 10000 : 5000;
    const timer = setTimeout(() => {
      setExpandedReviewId(null);
      setReviewIndex(prev => (prev + 1) % filteredReviews.length);
    }, delay);
    return () => clearTimeout(timer);
  }, [filteredReviews?.length, expandedReviewId, reviewIndex]);

  const getVisibleReviews = () => {
    if (!filteredReviews.length) return [];
    // Sync with grid: 1 col < 1024, 3 cols >= 1024
    const count = Math.min(itemsToShow, filteredReviews.length);
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(filteredReviews[(reviewIndex + i) % filteredReviews.length]);
    }
    return result;
  };

  const nextReview = () => {
    setExpandedReviewId(null);
    setReviewIndex(prev => (prev + 1) % filteredReviews.length);
  };
  const prevReview = () => {
    setExpandedReviewId(null);
    setReviewIndex(prev => (prev - 1 + filteredReviews.length) % filteredReviews.length);
  };

  const getCardImages = (property) => {
    const images = cardImagesBySlug[property.slug] || [];
    if (images.length) return images;
    const fallbackPrimary = property.primary_image || property.image || "";
    return fallbackPrimary ? [fallbackPrimary] : [];
  };

  const moveCardImage = (property, direction) => {
    const images = getCardImages(property);
    if (images.length <= 1) return;
    setImageIndices((prev) => {
      const current = prev[property.id] || 0;
      const nextIndex =
        direction === "next"
          ? (current + 1) % images.length
          : (current - 1 + images.length) % images.length;
      return { ...prev, [property.id]: nextIndex };
    });
  };

  const handleCardNext = (e, property) => {
    e.preventDefault();
    e.stopPropagation();
    moveCardImage(property, "next");
  };

  const handleCardPrev = (e, property) => {
    e.preventDefault();
    e.stopPropagation();
    moveCardImage(property, "prev");
  };

  return (
    <div className="w-full bg-gray-50 text-gray-800 font-sans">

      {/* Hero Section */}
      <div className="relative">
        <div
          className="site-hero site-hero--lg relative flex items-center justify-center overflow-hidden"
        >
          <Image
            src={HERO_IMAGE}
            alt="Luxury vacation rental cabin in the Smoky Mountains at sunset — Nirvana Luxe"
            fill
            preload
            fetchPriority="high"
            sizes="100vw"
            quality={80}
            className="object-cover"
            aria-hidden="true"
          />
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
          <div className="relative z-10 mx-auto max-w-4xl px-4 pb-6 pt-10 text-center sm:px-6 sm:pb-12 sm:pt-16 md:pb-16 md:pt-0">
            <p className="mb-2 text-[10px] font-medium uppercase tracking-[0.22em] text-accent sm:mb-4 sm:text-sm sm:tracking-[0.3em]">THE NIRVANA LUXE COLLECTION</p>
            <h1 className="mb-3 text-3xl font-bold leading-[1.05] text-white drop-shadow-lg sm:text-5xl sm:leading-[1.1] md:mb-5 md:text-6xl md:leading-[1.15] lg:text-[4rem]">
              Nirvana Luxe <br /><span className="text-accent font-serif italic font-light">Luxury Vacation Rentals</span>
            </h1>
            <p className="mx-auto mt-2 max-w-2xl text-sm font-normal leading-relaxed text-white/90 sm:mt-4 sm:text-xl">
              The official Nirvana Luxe direct-booking site for premium vacation homes and luxury vacation rentals, from Lake Norman and Lake Wylie lakefront retreats to cabins in Sevierville TN.
            </p>
          </div>
        </div>
        <HeroSearch router={router} properties={initialProperties} />
      </div>

      {/* Signature Retreats Section */}
      <section aria-label="Signature Properties" className="relative overflow-hidden bg-slate-50 px-6 pb-16 pt-20 md:pt-36">
        {/* Luxury Decorative Background Elements */}
        {/* Stronger grid pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#0f172a 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
        {/* More visible ambient glows */}
        <div className="absolute top-20 left-0 w-[600px] h-[600px] bg-accent/15 rounded-full blur-[120px] pointer-events-none -translate-x-1/3"></div>
        <div className="absolute bottom-10 right-0 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none translate-x-1/4"></div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">HANDPICKED LUXURY VACATION RENTALS</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 drop-shadow-sm">Nirvana Luxe Signature Vacation Rental Homes</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Each Nirvana Luxe vacation rental home is curated for luxury — from lake cabin rentals and lakefront retreats to large group vacation homes across North Carolina and Tennessee.
            </p>
          </div>

          {/* Grid View */}
          <div className="relative">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 lg:gap-8 w-full">
              {getVisibleProperties().map((prop, index) => {
                const images = getCardImages(prop);
                const currentIndex = imageIndices[prop.id] || 0;
                // Calculate the actual index in the full properties array for the badge
                const originalIndex = properties.findIndex(p => p.id === prop.id);

                return (
                  <SignatureCard
                    key={prop.id}
                    title={prop.name}
                    location={prop.location}
                    images={images}
                    currentIndex={currentIndex}
                    onPrev={(e) => handleCardPrev(e, prop)}
                    onNext={(e) => handleCardNext(e, prop)}
                    link={`/${prop.slug}`}
                    stats={{
                      bedrooms: prop.bedroom_count || 0,
                      beds: prop.bed_count || 0,
                      baths: getCompactBathroomSummary(prop) || 0,
                      guests: prop.guests_max || 0
                    }}
                    badge={BADGES[originalIndex] || "Featured"}
                  />
                );
              })}
            </div>

            {/* "Show More" Button */}
            {visibleCount < properties.length && (
              <div className="mt-12 flex justify-center">
                <button
                  onClick={() => setVisibleCount(prev => prev + 6)}
                  className="px-8 py-3 bg-white border border-slate-200 shadow-md text-gray-600 font-semibold rounded-full hover:bg-accent hover:text-white hover:border-accent transition-all duration-300 uppercase tracking-widest text-sm"
                >
                  Show More Properties
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Original Guest Experiences Section */}
      <section aria-label="Guest Reviews" className="pt-16 pb-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-accent/5 rounded-full blur-3xl"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16">
            <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">Real Stories</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Original Guest Experiences</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light mb-8">
              Hear from guests who've made memories at our properties
            </p>

            <div className="inline-flex bg-white p-1.5 rounded-full shadow-lg border border-slate-100">
              <FilterButton active={selectedSource === "all"} onClick={() => setSelectedSource("all")}>All Reviews</FilterButton>
              <FilterButton active={selectedSource === "airbnb"} onClick={() => setSelectedSource("airbnb")}>Airbnb</FilterButton>
              <FilterButton active={selectedSource === "vrbo"} onClick={() => setSelectedSource("vrbo")}>Vrbo</FilterButton>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-8">
            <button
              onClick={prevReview}
              className="hidden md:inline-flex p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
              aria-label="Previous review"
            >
              <FaChevronLeft size={20} />
            </button>

            <div className="hidden lg:grid grid-cols-3 gap-6 w-full">
              {getVisibleReviews().map((review, idx) => {
                const cardId = review.id || `${review.author || 'guest'}-${idx}`;
                return (
                  <PremiumReviewCard
                    key={cardId}
                    review={review}
                    isExpanded={expandedReviewId === cardId}
                    onToggleExpand={() => setExpandedReviewId(expandedReviewId === cardId ? null : cardId)}
                  />
                );
              })}
            </div>

            {/* Mobile/Tablet View (using flex/overflow for swipe feel or single item) */}
            <div className="lg:hidden w-full">
              <div className="flex justify-center max-w-sm mx-auto">
                {getVisibleReviews().length > 0 && (() => {
                  const review = getVisibleReviews()[0];
                  const cardId = review.id || `${review.author || 'guest'}-mobile`;
                  return (
                    <PremiumReviewCard
                      review={review}
                      isExpanded={expandedReviewId === cardId}
                      onToggleExpand={() => setExpandedReviewId(expandedReviewId === cardId ? null : cardId)}
                    />
                  );
                })()}
              </div>
            </div>

            <button
              onClick={nextReview}
              className="hidden md:inline-flex p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
              aria-label="Next review"
            >
              <FaChevronRight size={20} />
            </button>
          </div>
          <CarouselNavigation
            current={(reviewIndex % Math.max(filteredReviews.length, 1)) + 1}
            total={filteredReviews.length}
            onPrevious={prevReview}
            onNext={nextReview}
            label="reviews"
            className="mt-5 md:hidden"
          />

          <div className="text-center mt-12">
            <Link href="/review" className="inline-flex items-center gap-2 text-accent font-semibold hover:underline text-lg">
              View All Reviews <FaChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* Why Choose Nirvana Luxe — SEO content section */}
      <section aria-label="Why Choose Nirvana Luxe" className="relative py-20 md:py-32 overflow-hidden bg-gray-900 border-y border-gray-800">
        {/* Background Image & Overlays */}
        <Image
          src="/assets/aboutUs-indoor.avif"
          alt="Luxury Vacation Rentals Interior"
          fill
          sizes="100vw"
          className="object-cover opacity-20"
        />
        <div className="absolute inset-0 bg-gradient-to-br from-gray-900/95 via-gray-900/80 to-gray-900/90"></div>
        <div className="absolute top-0 right-0 w-[500px] h-[500px] bg-accent/10 rounded-full blur-[100px] pointer-events-none"></div>
        <div className="absolute bottom-0 left-0 w-[600px] h-[600px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none"></div>

        <div className="relative z-10 max-w-7xl mx-auto px-6">
          <div className="text-center mb-16 md:mb-24">
            <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">THE NIRVANA LUXE DIFFERENCE</p>
            <h2 className="text-4xl md:text-5xl lg:text-6xl font-bold text-white mb-6 drop-shadow-md">Why Choose Nirvana Luxe</h2>
            <p className="text-xl text-gray-400 max-w-3xl mx-auto font-light leading-relaxed">
              We curate only the finest luxury vacation rentals in Tennessee and North Carolina — each property hand-selected for exceptional quality, premium amenities, and unforgettable guest experiences.
            </p>
          </div>

          <div className="grid md:grid-cols-3 gap-6 lg:gap-10 pb-8 lg:pb-16">
            {/* Card 1 */}
            <div className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 shadow-2xl flex flex-col h-full">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-accent/20 rounded-full blur-2xl group-hover:bg-accent/40 transition-all duration-500"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500 shrink-0">
                🏔️
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Smoky Mountain Luxury Cabins</h3>
              <p className="text-gray-300 leading-relaxed font-light text-sm lg:text-base grow">
                From romantic cabins for couples with mountain views to spacious lodges sleeping up to 26 guests, our Gatlinburg, Pigeon Forge, and Sevierville luxury cabin rentals feature private indoor pools, home theaters, and game rooms. Experience the pinnacle of Tennessee mountain luxury — perfectly situated near the serene beauty of Walland and the excitement of Dollywood. Ideal for family reunions and large group getaways.
              </p>
            </div>

            {/* Card 2 */}
            <div className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 shadow-2xl flex flex-col h-full">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-blue-500/20 rounded-full blur-2xl group-hover:bg-blue-500/40 transition-all duration-500"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500 shrink-0">
                🏡
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Lakefront Vacation Homes</h3>
              <p className="text-gray-300 leading-relaxed font-light text-sm lg:text-base grow">
                Our Lake Norman and Lake Wylie lakefront rentals near Charlotte NC offer private docks, stunning water views, and resort-style amenities. Whether you're planning a romantic lakeside retreat for couples or a summer vacation with the whole family, these luxury vacation homes deliver unmatched waterfront living.
              </p>
            </div>

            {/* Card 3 */}
            <div className="group relative overflow-hidden rounded-3xl bg-white/5 backdrop-blur-xl border border-white/10 p-8 hover:bg-white/10 transition-all duration-500 hover:-translate-y-2 shadow-2xl flex flex-col h-full">
              <div className="absolute -right-8 -top-8 w-32 h-32 bg-emerald-500/20 rounded-full blur-2xl group-hover:bg-emerald-500/40 transition-all duration-500"></div>
              
              <div className="w-16 h-16 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center text-3xl mb-8 shadow-inner group-hover:scale-110 transition-transform duration-500 shrink-0">
                💰
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Best Rate — Book Direct</h3>
              <p className="text-gray-300 leading-relaxed font-light text-sm lg:text-base grow">
                When you book direct with Nirvana Luxe instead of Airbnb or VRBO, you save on service fees and get personal concierge support, curated local recommendations, and our best rate guarantee. No middleman — just premium hospitality from a team that truly cares about your experience.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Our Destinations — SEO internal linking section */}
      <section aria-label="Explore Our Destinations" className="relative overflow-hidden bg-slate-50 px-6 py-16 md:py-24">
        {/* Luxury Decorative Background Elements */}
        {/* Stronger grid pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#0f172a 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
        
        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-14">
            <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">EXPLORE OUR DESTINATIONS</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Premium Vacation Rental Destinations</h2>
          </div>

          <div className="grid md:grid-cols-2 gap-8 max-w-5xl mx-auto">
            <Link href="/properties" className="group relative overflow-hidden rounded-[2rem] min-h-[500px] flex flex-col justify-end p-8 block w-full hover:shadow-2xl transition-shadow duration-500 cursor-pointer shadow-lg">
              <Image 
                src="/images/smoky_mountains.png" 
                alt="Luxury cabin in the Smoky Mountains at sunset" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw" 
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500"></div>
              
              <div className="relative z-10 text-white w-full">
                <h3 className="text-3xl font-bold tracking-wide text-shadow-sm min-h-[5rem] lg:min-h-[6rem]">
                  Sevierville, Gatlinburg &amp; Pigeon Forge, TN
                </h3>
                
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                  <div className="overflow-hidden min-h-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex flex-col items-start">
                    <p className="text-gray-200 leading-relaxed text-sm md:text-base mb-6 font-light mt-2">
                      Discover luxury cabin rentals in the Great Smoky Mountains. Our properties place you minutes from the attractions of Gatlinburg and Pigeon Forge, while offering the peaceful seclusion of Sevierville and Walland.
                    </p>
                    <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/30 transition-colors border border-white/20 mb-2">
                      Browse Rentals <FaChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>

            <Link href="/properties" className="group relative overflow-hidden rounded-[2rem] min-h-[500px] flex flex-col justify-end p-8 block w-full hover:shadow-2xl transition-shadow duration-500 cursor-pointer shadow-lg">
              <Image 
                src="/images/lake_norman.png" 
                alt="Luxury lakefront home on Lake Norman or Lake Wylie" 
                fill 
                sizes="(max-width: 768px) 100vw, 50vw" 
                className="object-cover transition-transform duration-1000 ease-out group-hover:scale-[1.03]" 
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/40 to-transparent opacity-80 group-hover:opacity-90 transition-opacity duration-500"></div>
              
              <div className="relative z-10 text-white w-full">
                <h3 className="text-3xl font-bold tracking-wide text-shadow-sm min-h-[5rem] lg:min-h-[6rem]">
                  Lake Norman &amp; Lake Wylie, NC
                </h3>
                
                <div className="grid grid-rows-[0fr] group-hover:grid-rows-[1fr] transition-all duration-500 ease-[cubic-bezier(0.2,0.8,0.2,1)]">
                  <div className="overflow-hidden min-h-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 delay-100 flex flex-col items-start">
                    <p className="text-gray-200 leading-relaxed text-sm md:text-base mb-6 font-light mt-2">
                      Experience lakefront luxury on North Carolina's inland sea. Our waterfront vacation homes offer private boat docks, infinity-edge pool views, and upscale finishes throughout.
                    </p>
                    <span className="inline-flex items-center gap-2 bg-white/20 backdrop-blur-md px-5 py-2.5 rounded-full text-sm font-semibold hover:bg-white/30 transition-colors border border-white/20 mb-2">
                      Browse Rentals <FaChevronRight size={12} />
                    </span>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section aria-label="Call to Action" className="site-viewport-section relative flex items-center justify-center overflow-hidden bg-gray-900 px-4 text-white sm:px-6">
        <Image
          src={CTA_IMAGE}
          alt=""
          fill
          sizes="100vw"
          quality={75}
          className="object-cover opacity-50"
          aria-hidden="true"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60"></div>

        <div className="relative z-10 mx-auto w-full max-w-3xl text-center">
          <p className="mb-4 text-xs font-medium uppercase tracking-[0.24em] text-accent sm:text-sm sm:tracking-[0.3em]">READY TO BOOK LUXURY VACATION RENTALS?</p>
          <h2 className="mb-6 text-4xl font-bold leading-tight sm:text-5xl md:text-6xl">Your Dream Vacation Rental Awaits</h2>
          <p className="mb-10 text-lg font-light leading-relaxed text-gray-300 sm:text-xl">
            Book directly with Nirvana Luxe and enjoy luxury vacation rentals, lakefront vacation homes, premium cabins, and large group retreats — all designed for unforgettable escapes.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/book")}
              aria-label="Book your luxury vacation rental now"
              className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-12 text-lg shadow-2xl transition-all uppercase tracking-widest"
            >
              BOOK NOW
            </button>
            <button
              onClick={() => router.push("/properties")}
              aria-label="View all Nirvana Luxe properties"
              className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white font-bold py-4 px-12 text-lg transition-all uppercase tracking-widest"
            >
              VIEW PROPERTIES
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

// Signature Retreat Card Component
const SignatureCard = ({ title, location, images, currentIndex, onPrev, onNext, link, stats, badge }) => {
  const safeIndex = images.length ? currentIndex % images.length : 0;

  return (
    <div className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-3 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-left" onClick={() => window.location.href = link}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
        {images.map((image, index) => (
          <Image
            key={image}
            src={image}
            alt={index === safeIndex ? `${title} — luxury vacation rental in ${location}` : ""}
            fill
            sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
            quality={65}
            loading="lazy"
            decoding="async"
            aria-hidden={index !== safeIndex}
            className={`pointer-events-none object-cover transition-[opacity,transform] duration-500 group-hover:scale-105 ${
              index === safeIndex ? "opacity-100" : "opacity-0"
            }`}
          />
        ))}

        {/* Gradient Header for Badge */}
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-transparent to-transparent opacity-60"></div>

        {/* Badge */}
        {badge && (
          <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm text-slate-800 text-[10px] font-bold uppercase tracking-wider px-3 py-1.5 rounded-full shadow-sm">
            {badge}
          </div>
        )}

        {/* Always visible for touch; hover reveal keeps desktop cards visually quiet. */}
        {images.length > 1 && (
          <div className="card-carousel-controls absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-between px-3 opacity-100 transition-opacity duration-300">
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onPrev(e); }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/70 text-slate-800 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white/90 active:scale-95 md:h-10 md:w-10"
              aria-label="Previous image"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); onNext(e); }}
              className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-white/45 bg-white/70 text-slate-800 shadow-md backdrop-blur-md transition-all hover:scale-105 hover:bg-white/90 active:scale-95 md:h-10 md:w-10"
              aria-label="Next image"
            >
              <FaChevronRight size={14} />
            </button>
          </div>
        )}

        {/* Image Indicator Dots */}
        {images.length > 1 && (
          <div className="card-carousel-controls absolute bottom-3 left-1/2 z-30 flex -translate-x-1/2 gap-1.5 rounded-full bg-black/25 px-2.5 py-2 opacity-100 backdrop-blur-sm transition-opacity duration-300">
            {images.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${idx === safeIndex % 5 ? "w-3 bg-white" : "w-1.5 bg-white/60"
                  }`}
              />
            ))}
          </div>
        )}
      </div>

      <div className="px-2 pb-2 pt-4 text-left">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="truncate text-lg font-bold text-slate-900 transition-colors group-hover:text-accent">{title}</h3>
        </div>

        <p className="mb-3 text-sm text-slate-500">{location}</p>

        <div className="mb-4 flex flex-wrap items-center gap-4 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <FaBed className="text-accent" /> {stats.bedrooms} {stats.bedrooms === 1 ? 'bed room' : 'bed rooms'}
          </span>
          {stats.beds > 0 && (
            <span className="flex items-center gap-1.5">
              <FaBed className="text-accent" /> {stats.beds} {stats.beds === 1 ? 'bed' : 'beds'}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <FaBath className="text-accent" /> {stats.baths}
          </span>
          {stats.guests > 0 && (
            <span className="flex items-center gap-1.5">
              <FaUsers className="text-accent" /> {stats.guests} guests
            </span>
          )}
        </div>

        <div className="mt-2 text-center text-sm font-bold text-accent group-hover:underline">
          <button
            onClick={(e) => { e.stopPropagation(); window.location.href = link; }}
            className="w-full rounded-xl bg-accent py-3 text-white transition-all hover:bg-green-700 hover:scale-[1.02]"
          >
            EXPLORE PROPERTY
          </button>
        </div>
      </div>
    </div>
  );
};

// Premium Review Card Component
const PremiumReviewCard = ({ review, isExpanded, onToggleExpand }) => {
  if (!review) return null;
  const source = (review.source || "").toLowerCase();

  const renderSourceMark = () => {
    if (source === "airbnb") {
      return <FaAirbnb size={24} className="text-rose-500" />;
    }

    if (source === "vrbo") {
      return (
        <Image
          src="/assets/vrbo.png"
          alt="Vrbo"
          width={60}
          height={24}
          className="h-6 w-auto object-contain"
          style={{ width: "auto", height: "24px" }}
        />
      );
    }

    return (
      <span className="rounded bg-slate-100 px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-600">
        {source || "direct"}
      </span>
    );
  };

  return (
    <div className="w-full h-full bg-white p-6 md:p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col relative">
      <FaQuoteLeft className="absolute top-6 right-6 text-4xl text-accent/10" />

      <div className="flex items-center gap-4 mb-6">
        <div className="relative w-14 h-14 rounded-full bg-gradient-to-br from-accent to-emerald-400 overflow-hidden flex-shrink-0 ring-4 ring-accent/20">
          {review.img ? (
            <Image src={review.img} alt={review.author} fill sizes="56px" className="object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
              {review.author?.replace(/[^a-zA-Z]/g, '').charAt(0).toUpperCase() || 'G'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <p className="font-bold text-gray-900 text-lg">{review.author || 'Guest'}</p>
          <div className="flex items-center gap-2">
            <div className="flex text-amber-500">
              {[...Array(5)].map((_, i) => <FaStar key={i} size={12} />)}
            </div>
            <span className="text-xs text-slate-400">5.0</span>
          </div>
        </div>
        <div className="opacity-90">
          {renderSourceMark()}
        </div>
      </div>

      <div className="flex-grow flex flex-col text-left">
        <p className={`text-gray-600 leading-relaxed italic transition-all ${isExpanded ? '' : 'line-clamp-4'}`}>
          "{review.text}"
        </p>
        {review.text && review.text.length > 130 && (
          <button
            onClick={onToggleExpand}
            className="text-accent text-sm font-semibold mt-2 hover:underline text-left self-start focus:outline-none"
          >
            {isExpanded ? 'Read less' : 'Read full review'}
          </button>
        )}
      </div>

      <div className="mt-4 pt-4 border-t border-slate-100">
        <p className="text-xs text-slate-400">Stayed at <span className="text-accent font-medium">{review.property || 'Nirvana Luxe'}</span></p>
      </div>
    </div>
  );
};

const FilterButton = ({ active, onClick, children }) => (
  <button
    onClick={onClick}
    className={`px-6 py-2.5 rounded-full text-sm font-semibold transition-all duration-300 ${active
      ? 'bg-accent text-white shadow-md'
      : 'text-gray-500 hover:text-gray-900 hover:bg-slate-50'
      }`}
  >
    {children}
  </button>
);

const HeroSearch = ({ router, properties = [] }) => {
  const [searchLocation, setSearchLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
        inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter properties based on search input
  const filteredProperties = properties.filter((p) => {
    if (!searchLocation) return true;
    const q = searchLocation.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
  });

  const handlePropertySelect = (property) => {
    setSearchLocation(property.title || property.name || '');
    setShowDropdown(false);
  };

  const handleSearch = () => {
    const params = new URLSearchParams();
    if (searchLocation) params.append("location", searchLocation);
    if (checkInDate) params.append("checkIn", checkInDate);
    if (checkOutDate) params.append("checkOut", checkOutDate);
    if (guests) params.append("guests", guests);
    if (bedrooms) params.append("bedrooms", bedrooms);

    router.push(`/properties?${params.toString()}`);
  };

  const todayString = new Date().toISOString().split("T")[0];

  return (
    <>
      {/* Desktop Search Bar — positioned to overlap hero bottom edge like VRBO */}
      <div className="hidden md:block absolute left-1/2 -translate-x-1/2 bottom-0 translate-y-1/2 z-20 w-full max-w-5xl px-6">
        <div className="bg-white rounded-full shadow-xl border border-gray-200 flex items-stretch">

          {/* Where */}
          <div className="flex-[1.3] flex items-center gap-3 pl-6 pr-4 py-4 border-r border-gray-200 rounded-l-full hover:bg-gray-50 transition-colors cursor-pointer relative">
            <FaMapMarkerAlt className="text-gray-400 text-lg flex-shrink-0" />
            <input
              id="home-search-location-desktop"
              ref={inputRef}
              type="text"
              aria-label="Search by destination or property"
              placeholder="Where to?"
              value={searchLocation}
              onChange={(e) => { setSearchLocation(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-transparent text-[15px] text-gray-900 font-medium focus:outline-none placeholder-gray-400"
            />
            {showDropdown && filteredProperties.length > 0 && (
              <div ref={dropdownRef} className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 max-h-72 overflow-y-auto z-50">
                {filteredProperties.map((property) => (
                  <button
                    key={property.id || property.slug}
                    onClick={() => handlePropertySelect(property)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    {(property.primary_image || property.image) && (
                      <Image src={property.primary_image || property.image} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{property.title || property.name}</p>
                      {property.location && <p className="text-xs text-gray-500 truncate">{property.location}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates */}
          <div className="flex-[1.5] flex items-center gap-3 px-4 py-4 border-r border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
            <FaCalendarAlt className="text-gray-400 text-base flex-shrink-0" />
            <div className="flex items-center gap-1 w-full">
              <div className="flex flex-col flex-1 relative z-50">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Check in</span>
                <CustomDatePicker
                  value={checkInDate}
                  onChange={(val) => {
                    setCheckInDate(val);
                    if (checkOutDate && val && checkOutDate <= val) setCheckOutDate("");
                  }}
                  minDate={todayString}
                  placeholder="Add dates"
                />
              </div>
              <span className="text-gray-300 mx-1">—</span>
              <div className="flex flex-col flex-1 relative z-50">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Check out</span>
                <CustomDatePicker
                  value={checkOutDate}
                  onChange={setCheckOutDate}
                  minDate={checkInDate || todayString}
                  placeholder="Add dates"
                />
              </div>
            </div>
          </div>

          {/* Guests */}
          <div className="flex-[0.9] flex items-center gap-3 px-4 py-4 border-r border-gray-200 hover:bg-gray-50 transition-colors cursor-pointer">
            <FaUsers className="text-gray-400 text-lg flex-shrink-0" />
            <div className="flex flex-col w-full relative z-40">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Guests</span>
              <CustomSelect
                value={guests}
                onChange={setGuests}
                options={[
                  { value: "", label: "Add guests" },
                  { value: "2", label: "2+ guests" },
                  { value: "4", label: "4+ guests" },
                  { value: "6", label: "6+ guests" },
                  { value: "8", label: "8+ guests" },
                  { value: "10", label: "10+ guests" }
                ]}
                placeholder="Add guests"
              />
            </div>
          </div>

          {/* Bedrooms */}
          <div className="flex-[0.8] flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <FaBed className="text-gray-400 text-lg flex-shrink-0" />
            <div className="flex flex-col w-full relative z-40">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Bedrooms</span>
              <CustomSelect
                value={bedrooms}
                onChange={setBedrooms}
                options={[
                  { value: "", label: "Any" },
                  { value: "3", label: "3+ beds" },
                  { value: "4", label: "4+ beds" },
                  { value: "5", label: "5+ beds" },
                  { value: "6", label: "6+ beds" },
                  { value: "7", label: "7+ beds" },
                  { value: "8", label: "8+ beds" }
                ]}
                placeholder="Any"
              />
            </div>
          </div>

          {/* Search Button */}
          <div className="flex items-center pr-3">
            <button
              onClick={handleSearch}
              className="bg-accent hover:bg-accent/90 text-white rounded-full px-8 py-3.5 flex items-center gap-2.5 transition-all font-semibold text-[15px] shadow-md hover:shadow-lg"
            >
              <FaSearch />
              Search
            </button>
          </div>

        </div>
      </div>

      {/* Mobile Search Bar */}
      <div className="relative z-20 -mt-6 px-4 md:hidden">
        <div className="flex flex-col gap-2 rounded-2xl border border-gray-200 bg-white p-3 shadow-xl">

          <div className="relative flex items-center gap-3 border border-gray-200 rounded-xl p-3">
            <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
            <input
              id="home-search-location-mobile"
              type="text"
              aria-label="Search by destination or property"
              placeholder="Where to?"
              value={searchLocation}
              onChange={(e) => { setSearchLocation(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none placeholder-gray-500"
            />
            {showDropdown && filteredProperties.length > 0 && (
              <div
                className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 max-h-60 overflow-y-auto z-50"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {filteredProperties.map((property) => (
                  <button
                    key={property.id || property.slug}
                    onClick={() => handlePropertySelect(property)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    {(property.primary_image || property.image) && (
                      <Image src={property.primary_image || property.image} alt="" width={40} height={40} className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-900 truncate">{property.title || property.name}</p>
                      {property.location && <p className="text-xs text-gray-500 truncate">{property.location}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Dates + Guests + Bedrooms in grid */}
          <div className="grid grid-cols-2 gap-2">
            <div className="min-w-0 rounded-xl border border-gray-200 p-2.5 relative z-[60]">
              <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide block mb-0.5">Check in</span>
              <CustomDatePicker
                value={checkInDate}
                onChange={(val) => {
                  setCheckInDate(val);
                  if (checkOutDate && val && checkOutDate <= val) setCheckOutDate("");
                }}
                minDate={todayString}
                placeholder="Add dates"
              />
            </div>

            <div className="min-w-0 rounded-xl border border-gray-200 p-2.5 relative z-[60]">
              <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide block mb-0.5">Check out</span>
              <CustomDatePicker
                value={checkOutDate}
                onChange={setCheckOutDate}
                minDate={checkInDate || todayString}
                placeholder="Add dates"
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-2.5 relative z-[50]">
              <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide block mb-0.5">Guests</span>
              <CustomSelect
                value={guests}
                onChange={setGuests}
                options={[
                  { value: "", label: "Any" },
                  { value: "2", label: "2+" },
                  { value: "4", label: "4+" },
                  { value: "6", label: "6+" },
                  { value: "8", label: "8+" },
                  { value: "10", label: "10+" }
                ]}
                placeholder="Any"
              />
            </div>

            <div className="rounded-xl border border-gray-200 p-2.5 relative z-[50]">
              <span className="text-[9px] text-gray-500 font-semibold uppercase tracking-wide block mb-0.5">Bedrooms</span>
              <CustomSelect
                value={bedrooms}
                onChange={setBedrooms}
                options={[
                  { value: "", label: "Any" },
                  { value: "3", label: "3+ beds" },
                  { value: "4", label: "4+ beds" },
                  { value: "5", label: "5+ beds" },
                  { value: "6", label: "6+ beds" },
                  { value: "7", label: "7+ beds" },
                  { value: "8", label: "8+ beds" }
                ]}
                placeholder="Any"
              />
            </div>
          </div>

          <button
            onClick={handleSearch}
            className="w-full bg-accent text-white rounded-xl py-3 font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
          >
            <FaSearch /> Search
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
