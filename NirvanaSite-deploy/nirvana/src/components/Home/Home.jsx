'use client';

import React, { useRef, useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { fetchPropertyBundleBySlug } from "../../lib/contentApi";
import { FaChevronLeft, FaChevronRight, FaStar, FaAirbnb, FaBed, FaBath, FaUsers, FaMapMarkerAlt, FaQuoteLeft, FaSearch, FaCalendarAlt } from 'react-icons/fa';

const oasisImages = [
  "/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp",
];

const Home = ({ initialProperties = [], initialReviews = [] }) => {
  const router = useRouter();
  const heroRef = useRef(null);

  // Dynamic properties state
  const [properties, setProperties] = useState(initialProperties);
  const [currentPropertyIndex, setCurrentPropertyIndex] = useState(0);
  const [itemsToShow, setItemsToShow] = useState(3);
  const [isMobile, setIsMobile] = useState(false);
  const [visibleMobileCount, setVisibleMobileCount] = useState(3);
  const [isPaused, setIsPaused] = useState(false);
  const [imageIndices, setImageIndices] = useState({});
  const [cardImagesBySlug, setCardImagesBySlug] = useState({});
  const [galleryLoadedBySlug, setGalleryLoadedBySlug] = useState({});
  const [galleryLoadingBySlug, setGalleryLoadingBySlug] = useState({});

  const [reviews, setReviews] = useState(initialReviews);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [selectedSource, setSelectedSource] = useState("all");

  const [heroImage] = useState("/assets/exterior.avif");

  // Badge assignment based on property order
  const BADGES = ["Most Popular", "Featured", "New"];

  useEffect(() => {
    const homeProperties = initialProperties || [];
    setProperties(homeProperties);
    setCurrentPropertyIndex(0);

    const indices = {};
    const initialCardImages = {};
    const initialGalleryLoaded = {};
    homeProperties.forEach((property) => {
      indices[property.id] = 0;
      const primary = property.primary_image || property.image || "";
      initialCardImages[property.slug] = primary ? [primary] : [];
      initialGalleryLoaded[property.slug] = false;
    });

    setImageIndices(indices);
    setCardImagesBySlug(initialCardImages);
    setGalleryLoadedBySlug(initialGalleryLoaded);
    setGalleryLoadingBySlug({});
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

  // Auto-scroll functionality (Desktop only)
  useEffect(() => {
    if (!properties.length || isPaused || isMobile) return;

    const interval = setInterval(() => {
      setCurrentPropertyIndex((prev) => (prev + 1) % properties.length);
    }, 7000);

    return () => clearInterval(interval);
  }, [properties.length, isPaused, isMobile]);

  // Prefetch top-5 gallery images for ALL properties in the background
  // after the page has settled, so carousel clicks feel instant everywhere.
  const prefetchedRef = useRef(false);
  useEffect(() => {
    if (!properties.length || prefetchedRef.current) return;
    prefetchedRef.current = true;

    const PREFETCH_DELAY_MS = 2000; // wait 2s after page load

    const timer = setTimeout(async () => {
      for (const property of properties) {
        if (!property.slug || galleryLoadedBySlug[property.slug]) continue;
        try {
          await loadGalleryForCard(property);
        } catch (err) {
          // Silently ignore — prefetch failures shouldn't disrupt the page
        }
      }
    }, PREFETCH_DELAY_MS);

    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [properties]);

  const nextProperty = () => {
    setCurrentPropertyIndex((prev) => (prev + 1) % properties.length);
  };

  const prevProperty = () => {
    setCurrentPropertyIndex((prev) => (prev - 1 + properties.length) % properties.length);
  };

  const getVisibleProperties = () => {
    if (!properties.length) return [];

    // Mobile: Show first N items based on visibleMobileCount
    if (isMobile) {
      return properties.slice(0, visibleMobileCount); // Mobile: Load More list
    }

    // Desktop: Carousel logic
    const result = [];
    for (let i = 0; i < itemsToShow; i++) {
      result.push(properties[(currentPropertyIndex + i) % properties.length]);
    }
    return result;
  };

  useEffect(() => {
    const handleScroll = () => {
      if (heroRef.current) {
        const offset = window.pageYOffset;
        heroRef.current.style.backgroundPositionY = `calc(50% + ${offset * 0.5}px)`;
      }
    };
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const filteredReviews = reviews.filter(r => {
    if (selectedSource === "all") return true;
    return r.source === selectedSource;
  });

  const getVisibleReviews = () => {
    if (!filteredReviews.length) return [];
    // Sync with grid: 1 col < 1024, 3 cols >= 1024
    const count = itemsToShow;
    const result = [];
    for (let i = 0; i < count; i++) {
      result.push(filteredReviews[(reviewIndex + i) % filteredReviews.length]);
    }
    return result;
  };

  const nextReview = () => setReviewIndex(prev => (prev + 1) % filteredReviews.length);
  const prevReview = () => setReviewIndex(prev => (prev - 1 + filteredReviews.length) % filteredReviews.length);

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

  const loadGalleryForCard = async (property, directionAfterLoad = null) => {
    const slug = property.slug;
    if (!slug) return;
    if (galleryLoadedBySlug[slug]) {
      if (directionAfterLoad) moveCardImage(property, directionAfterLoad);
      return;
    }
    if (galleryLoadingBySlug[slug]) return;

    setGalleryLoadingBySlug((prev) => ({ ...prev, [slug]: true }));
    try {
      const fallbackHighlights = (property.highlightImages || []).filter(Boolean);
      const bundle = await fetchPropertyBundleBySlug(slug);
      const primary = property.primary_image || property.image || "";
      const galleryImages = (bundle?.galleryImages || []).filter(Boolean);
      const candidateImages = galleryImages.length ? galleryImages : fallbackHighlights;

      const seen = new Set();
      const merged = [primary, ...candidateImages]
        .filter(Boolean)
        .filter((img) => {
          if (seen.has(img)) return false;
          seen.add(img);
          return true;
        })
        .slice(0, 5);

      // Force the browser to cache the images in the background
      merged.forEach((url) => {
        const img = new window.Image();
        img.src = url;
      });

      setCardImagesBySlug((prev) => ({
        ...prev,
        [slug]: merged.length ? merged : (prev[slug] || []),
      }));
      setGalleryLoadedBySlug((prev) => ({ ...prev, [slug]: true }));

      if (directionAfterLoad && merged.length > 1) {
        setImageIndices((prev) => ({
          ...prev,
          [property.id]: directionAfterLoad === "next" ? 1 : merged.length - 1,
        }));
      }
    } catch (error) {
      console.error(`Failed loading gallery images for ${slug}:`, error);
      const primary = property.primary_image || property.image || "";
      const fallbackHighlights = (property.highlightImages || []).filter(Boolean);
      const seen = new Set();
      const merged = [primary, ...fallbackHighlights]
        .filter(Boolean)
        .filter((img) => {
          if (seen.has(img)) return false;
          seen.add(img);
          return true;
        })
        .slice(0, 5);

      // Force the browser to cache the images in the background
      merged.forEach((url) => {
        const img = new window.Image();
        img.src = url;
      });

      if (merged.length > 1) {
        setCardImagesBySlug((prev) => ({ ...prev, [slug]: merged }));
        if (directionAfterLoad) {
          setImageIndices((prev) => ({
            ...prev,
            [property.id]: directionAfterLoad === "next" ? 1 : merged.length - 1,
          }));
        }
      }
      setGalleryLoadedBySlug((prev) => ({ ...prev, [slug]: true }));
    } finally {
      setGalleryLoadingBySlug((prev) => ({ ...prev, [slug]: false }));
    }
  };

  const handleCardNext = async (e, property) => {
    e.preventDefault();
    e.stopPropagation();
    if (!galleryLoadedBySlug[property.slug]) {
      await loadGalleryForCard(property, "next");
      return;
    }
    moveCardImage(property, "next");
  };

  const handleCardPrev = async (e, property) => {
    e.preventDefault();
    e.stopPropagation();
    if (!galleryLoadedBySlug[property.slug]) {
      await loadGalleryForCard(property, "prev");
      return;
    }
    moveCardImage(property, "prev");
  };

  return (
    <div className="w-full bg-gray-50 text-gray-800 font-sans">

      {/* Hero Section */}
      <div className="relative mt-[65px]">
        <div
          ref={heroRef}
          className="relative h-[80vh] min-h-[550px] flex items-center justify-center bg-cover bg-center"
          style={{ backgroundImage: `url(${heroImage})` }}
        >
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/30 to-black/60"></div>
          <div className="relative z-10 text-center px-4 max-w-4xl mx-auto mb-16">
            <p className="text-accent uppercase tracking-[0.3em] text-xs sm:text-sm font-medium mb-4">The Nirvana Luxe Collection</p>
            <h1 className="text-5xl md:text-6xl lg:text-[4rem] font-bold text-white mb-5 leading-[1.15] drop-shadow-lg">
              Discover Your <br className="hidden sm:block" /><span className="text-accent font-serif italic font-light">Dream Escape</span>
            </h1>
            <p className="text-xl text-white/90 font-normal max-w-2xl mx-auto leading-relaxed">
              Experience the pinnacle of luxury with our exclusive curated vacation rentals in the Smokies & Lake Norman.
            </p>
          </div>
        </div>
        <HeroSearch router={router} properties={initialProperties} />
      </div>

      {/* Signature Retreats Section */}
      <section className="relative pt-36 pb-28 px-6 bg-slate-50 overflow-hidden">
        {/* Luxury Decorative Background Elements */}
        {/* Stronger grid pattern */}
        <div className="absolute inset-0 z-0 opacity-[0.08]" style={{ backgroundImage: 'radial-gradient(#0f172a 1.5px, transparent 1.5px)', backgroundSize: '32px 32px' }}></div>
        {/* More visible ambient glows */}
        <div className="absolute top-20 left-0 w-[600px] h-[600px] bg-accent/15 rounded-full blur-[120px] pointer-events-none -translate-x-1/3"></div>
        <div className="absolute bottom-10 right-0 w-[800px] h-[800px] bg-blue-400/10 rounded-full blur-[120px] pointer-events-none translate-x-1/4"></div>

        <div className="relative z-10 max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">Handpicked Luxury</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6 drop-shadow-sm">Our Signature Retreats</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Each property is curated to deliver an unforgettable experience
            </p>
          </div>

          {/* Carousel Controls & Grid */}
          <div
            className="relative"
            onMouseEnter={() => setIsPaused(true)}
            onMouseLeave={() => setIsPaused(false)}
            onTouchStart={() => setIsPaused(true)}
            onTouchEnd={() => setIsPaused(false)}
          >
            <div className="flex items-center justify-center gap-4 xl:gap-8">
              {/* Desktop Navigation Buttons */}
              <button
                onClick={prevProperty}
                className="hidden lg:flex flex-shrink-0 p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
                aria-label="Previous property"
              >
                <FaChevronLeft size={24} />
              </button>

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
                      isGalleryLoading={!!galleryLoadingBySlug[prop.slug]}
                      link={`/${prop.slug}`}
                      stats={{
                        beds: prop.bedroom_count || 0,
                        baths: prop.bathroom_count || 0,
                        guests: prop.guests_max || 0
                      }}
                      badge={BADGES[originalIndex] || "Featured"}
                    />
                  );
                })}
              </div>

              <button
                onClick={nextProperty}
                className="hidden lg:flex flex-shrink-0 p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
                aria-label="Next property"
              >
                <FaChevronRight size={24} />
              </button>
            </div>

            {/* Mobile "Show More" Button */}
            {isMobile && visibleMobileCount < properties.length && (
              <div className="mt-12 flex justify-center lg:hidden">
                <button
                  onClick={() => setVisibleMobileCount(prev => prev + 5)}
                  className="px-8 py-3 bg-white border border-slate-200 shadow-md text-gray-600 font-semibold rounded-full hover:bg-accent hover:text-white hover:border-accent transition-all duration-300 uppercase tracking-widest text-sm"
                >
                  Show More
                </button>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Original Guest Experiences Section */}
      <section className="py-28 bg-gradient-to-b from-slate-50 to-white relative overflow-hidden">
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
            >
              <FaChevronLeft size={20} />
            </button>

            <div className="hidden lg:grid grid-cols-3 gap-6 w-full">
              {getVisibleReviews().map((review, idx) => (
                <PremiumReviewCard key={idx} review={review} />
              ))}
            </div>

            {/* Mobile/Tablet View (using flex/overflow for swipe feel or single item) */}
            <div className="lg:hidden w-full">
              <div className="flex justify-center">
                <PremiumReviewCard review={getVisibleReviews()[0]} />
              </div>
            </div>

            <button
              onClick={nextReview}
              className="hidden md:inline-flex p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300"
            >
              <FaChevronRight size={20} />
            </button>
          </div>
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

          <div className="text-center mt-12">
            <Link href="/review" className="inline-flex items-center gap-2 text-accent font-semibold hover:underline text-lg">
              View All Reviews <FaChevronRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative h-[70vh] flex items-center justify-center bg-gray-900 text-white overflow-hidden">
        <div className="absolute inset-0 bg-cover bg-center opacity-50" style={{ backgroundImage: `url(${oasisImages[0] || heroImage})` }}></div>
        <div className="absolute inset-0 bg-gradient-to-t from-gray-900 via-gray-900/80 to-gray-900/60"></div>

        <div className="relative z-10 text-center px-6 max-w-3xl">
          <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">Ready to Experience Luxury?</p>
          <h2 className="text-4xl md:text-6xl font-bold mb-6">Your Dream Escape Awaits</h2>
          <p className="text-xl text-gray-300 mb-10 leading-relaxed font-light">
            Book your stay and create memories that last a lifetime
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => router.push("/book")}
              className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-12 text-lg shadow-2xl transition-all uppercase tracking-widest"
            >
              Book Now
            </button>
            <button
              onClick={() => router.push("/properties")}
              className="bg-transparent border-2 border-white hover:bg-white hover:text-gray-900 text-white font-bold py-4 px-12 text-lg transition-all uppercase tracking-widest"
            >
              View Properties
            </button>
          </div>
        </div>
      </section>

    </div>
  );
};

// Signature Retreat Card Component
const SignatureCard = ({ title, location, images, currentIndex, onPrev, onNext, isGalleryLoading, link, stats, badge }) => {
  const currentImage = images[currentIndex] || "";

  return (
    <div className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-3 shadow-lg transition-all duration-300 hover:-translate-y-1 hover:shadow-xl text-left" onClick={() => window.location.href = link}>
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
        {images.map((img, idx) => (
          <img
            key={`${img}-${idx}`}
            src={img}
            alt={`${title} - image ${idx + 1}`}
            className={`absolute inset-0 w-full h-full object-cover transition-all duration-300 group-hover:scale-105 ${
              idx === currentIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
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

        {/* Carousel Controls - Only visible on hover */}
        <div className="absolute inset-x-0 top-1/2 z-30 flex -translate-y-1/2 justify-between px-3 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onPrev(e); }}
            disabled={isGalleryLoading}
            className="rounded-full bg-white/90 p-2 text-slate-800 shadow-md transition-all hover:scale-110 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous image"
          >
            <FaChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={(e) => { e.stopPropagation(); onNext(e); }}
            disabled={isGalleryLoading}
            className="rounded-full bg-white/90 p-2 text-slate-800 shadow-md transition-all hover:scale-110 hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next image"
          >
            <FaChevronRight size={14} />
          </button>
        </div>

        {/* Image Indicator Dots */}
        {images.length > 1 && (
          <div className="absolute bottom-4 left-1/2 flex -translate-x-1/2 gap-1.5 opacity-0 transition-opacity duration-300 group-hover:opacity-100">
            {images.slice(0, 5).map((_, idx) => (
              <div
                key={idx}
                className={`h-1.5 rounded-full shadow-sm transition-all duration-300 ${
                  idx === currentIndex % 5 ? "w-3 bg-white" : "w-1.5 bg-white/60"
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
            <FaBed className="text-accent" /> {stats.beds} beds
          </span>
          <span className="flex items-center gap-1.5">
            <FaBath className="text-accent" /> {stats.baths} baths
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
            className="w-full rounded-xl bg-slate-50 py-3 text-slate-700 transition-colors hover:bg-accent hover:text-white"
          >
            EXPLORE PROPERTY
          </button>
        </div>
      </div>
    </div>
  );
};

// Premium Review Card Component
const PremiumReviewCard = ({ review }) => {
  if (!review) return null;
  const source = (review.source || "").toLowerCase();

  const renderSourceMark = () => {
    if (source === "airbnb") {
      return <FaAirbnb size={24} className="text-rose-500" />;
    }

    if (source === "vrbo") {
      return (
        <img
          src="/assets/vrbo.png"
          alt="Vrbo"
          className="h-6 w-auto object-contain"
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
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-accent to-emerald-400 overflow-hidden flex-shrink-0 ring-4 ring-accent/20">
          {review.img ? (
            <img src={review.img} alt={review.author} className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
              {review.author?.charAt(0) || 'G'}
            </div>
          )}
        </div>
        <div className="flex-1">
          <h4 className="font-bold text-gray-900 text-lg">{review.author || 'Guest'}</h4>
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

      <p className="text-gray-600 leading-relaxed line-clamp-4 flex-grow italic">"{review.text}"</p>

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
              ref={inputRef}
              type="text" 
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
                      <img src={property.primary_image || property.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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
              <div className="flex flex-col flex-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Check in</span>
                <input 
                  type="date"
                  min={todayString}
                  value={checkInDate}
                  onClick={(e) => e.target.showPicker?.()}
                  onChange={(e) => {
                    setCheckInDate(e.target.value);
                    if (checkOutDate && e.target.value && checkOutDate <= e.target.value) setCheckOutDate("");
                  }}
                  className="bg-transparent text-sm text-gray-900 font-medium focus:outline-none cursor-pointer w-full"
                />
              </div>
              <span className="text-gray-300 mx-1">—</span>
              <div className="flex flex-col flex-1">
                <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Check out</span>
                <input 
                  type="date"
                  min={checkInDate || todayString}
                  value={checkOutDate}
                  onClick={(e) => e.target.showPicker?.()}
                  onChange={(e) => setCheckOutDate(e.target.value)}
                  className="bg-transparent text-sm text-gray-900 font-medium focus:outline-none cursor-pointer w-full"
                />
              </div>
            </div>
          </div>
          
          {/* Guests */}
          <div className="flex-1 flex items-center gap-3 px-4 py-4 hover:bg-gray-50 transition-colors cursor-pointer">
            <FaUsers className="text-gray-400 text-lg flex-shrink-0" />
            <div className="flex flex-col w-full">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide">Guests</span>
              <select 
                value={guests}
                onChange={(e) => setGuests(e.target.value)}
                className="bg-transparent text-sm text-gray-900 font-medium focus:outline-none appearance-none cursor-pointer w-full"
              >
                <option value="">Add guests</option>
                <option value="2">2+ guests</option>
                <option value="4">4+ guests</option>
                <option value="6">6+ guests</option>
                <option value="8">8+ guests</option>
                <option value="10">10+ guests</option>
              </select>
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
      <div className="md:hidden absolute left-0 right-0 bottom-0 translate-y-1/2 z-20 px-4">
        <div className="bg-white rounded-2xl shadow-xl border border-gray-200 p-4 flex flex-col gap-3">
          
          <div className="relative flex items-center gap-3 border border-gray-200 rounded-xl p-3">
            <FaMapMarkerAlt className="text-gray-400 flex-shrink-0" />
            <input 
              type="text" 
              placeholder="Where to?" 
              value={searchLocation}
              onChange={(e) => { setSearchLocation(e.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none placeholder-gray-500"
            />
            {showDropdown && filteredProperties.length > 0 && (
              <div className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 max-h-60 overflow-y-auto z-50">
                {filteredProperties.map((property) => (
                  <button
                    key={property.id || property.slug}
                    onClick={() => handlePropertySelect(property)}
                    className="w-full text-left px-4 py-3 hover:bg-gray-50 transition-colors flex items-center gap-3"
                  >
                    {(property.primary_image || property.image) && (
                      <img src={property.primary_image || property.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0" />
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

          <div className="flex gap-3">
            <div className="flex-1 border border-gray-200 rounded-xl p-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Check in</span>
              <input 
                type="date"
                min={todayString}
                value={checkInDate}
                onClick={(e) => e.target.showPicker?.()}
                onChange={(e) => {
                  setCheckInDate(e.target.value);
                  if (checkOutDate && e.target.value && checkOutDate <= e.target.value) setCheckOutDate("");
                }}
                className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none cursor-pointer"
              />
            </div>
            
            <div className="flex-1 border border-gray-200 rounded-xl p-3">
              <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Check out</span>
              <input 
                type="date"
                min={checkInDate || todayString}
                value={checkOutDate}
                onClick={(e) => e.target.showPicker?.()}
                onChange={(e) => setCheckOutDate(e.target.value)}
                className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none cursor-pointer"
              />
            </div>
          </div>

          <div className="border border-gray-200 rounded-xl p-3">
            <span className="text-[10px] text-gray-500 font-semibold uppercase tracking-wide block mb-1">Guests</span>
            <select 
              value={guests}
              onChange={(e) => setGuests(e.target.value)}
              className="w-full bg-transparent text-sm font-medium text-gray-900 focus:outline-none appearance-none"
            >
              <option value="">Add guests</option>
              <option value="2">2+ guests</option>
              <option value="4">4+ guests</option>
              <option value="6">6+ guests</option>
              <option value="8">8+ guests</option>
              <option value="10">10+ guests</option>
            </select>
          </div>

          <button 
            onClick={handleSearch}
            className="w-full bg-accent text-white rounded-xl py-3.5 font-semibold text-sm flex items-center justify-center gap-2 shadow-md active:scale-[0.98] transition-transform"
          >
            <FaSearch /> Search
          </button>
        </div>
      </div>
    </>
  );
};

export default Home;
