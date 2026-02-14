import React, { useRef, useEffect, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { fetchProperties, fetchPropertyBundleBySlug, fetchReviews } from "../../lib/contentApi";
import { FaChevronLeft, FaChevronRight, FaStar, FaAirbnb, FaBed, FaBath, FaUsers, FaMapMarkerAlt, FaQuoteLeft } from 'react-icons/fa';

const oasisImages = [
  "/data/ShoresideOasis/116Mcnaron-31_41_11zon.webp",
];

const Home = () => {
  const navigate = useNavigate();
  const heroRef = useRef(null);

  // Dynamic properties state
  const [properties, setProperties] = useState([]);
  const [imageIndices, setImageIndices] = useState({});
  const [cardImagesBySlug, setCardImagesBySlug] = useState({});
  const [galleryLoadedBySlug, setGalleryLoadedBySlug] = useState({});
  const [galleryLoadingBySlug, setGalleryLoadingBySlug] = useState({});

  const [reviews, setReviews] = useState([]);
  const [reviewIndex, setReviewIndex] = useState(0);
  const [selectedSource, setSelectedSource] = useState("all");

  const [heroImage] = useState("/assets/exterior.avif");

  // Badge assignment based on property order
  const BADGES = ["Most Popular", "Featured", "New"];

  useEffect(() => {
    const loadHomeData = async () => {
      try {
        const [allProperties, allReviews] = await Promise.all([
          fetchProperties(),
          fetchReviews(),
        ]);

        // Take first 3 properties for the home page
        const homeProperties = (allProperties || []).slice(0, 3);
        setProperties(homeProperties);

        // Initialize image indices for each property
        const indices = {};
        const initialCardImages = {};
        const initialGalleryLoaded = {};
        homeProperties.forEach((p) => {
          indices[p.id] = 0;
          const primary = p.primary_image || p.image || "";
          initialCardImages[p.slug] = primary ? [primary] : [];
          initialGalleryLoaded[p.slug] = false;
        });
        setImageIndices(indices);
        setCardImagesBySlug(initialCardImages);
        setGalleryLoadedBySlug(initialGalleryLoaded);

        setReviews(allReviews || []);
      } catch (error) {
        console.error("Error loading home data:", error);
      }
    };
    loadHomeData();
  }, []);

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
    const count = window.innerWidth < 768 ? 1 : 3;
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
      <div
        ref={heroRef}
        className="relative h-[85vh] flex items-center justify-center bg-cover bg-center"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>
        <div className="relative z-10 text-center px-4 max-w-4xl mx-auto">
          <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">Luxury Vacation Rentals</p>
          <h1 className="text-5xl md:text-7xl font-bold text-white mb-6 drop-shadow-lg tracking-tight">
            Discover Your <span className="text-accent italic">Dream Escape</span>
          </h1>
          <p className="text-xl md:text-2xl text-gray-100 mb-10 font-light drop-shadow-md max-w-2xl mx-auto">
            Experience the epitome of luxury with our exclusive vacation rentals in the Smokies & Lake Norman.
          </p>
          <button
            onClick={() => navigate("/properties")}
            className="bg-accent text-white font-bold py-4 px-10 rounded-none text-lg shadow-lg hover:bg-accent/90 transition-all duration-300 uppercase tracking-widest"
          >
            Explore Properties
          </button>
        </div>
      </div>

      {/* Signature Retreats Section */}
      <section className="py-28 px-6 bg-white">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-20">
            <p className="text-accent uppercase tracking-[0.3em] text-sm font-medium mb-4">Handpicked Luxury</p>
            <h2 className="text-4xl md:text-5xl font-bold text-gray-900 mb-6">Our Signature Retreats</h2>
            <p className="text-xl text-gray-500 max-w-2xl mx-auto font-light">
              Each property is carefully curated to deliver an unforgettable experience
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {properties.map((prop, index) => {
              const images = getCardImages(prop);
              const currentIndex = imageIndices[prop.id] || 0;
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
                  badge={BADGES[index] || "Featured"}
                />
              );
            })}
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
              Hear from guests who've created unforgettable memories at our properties
            </p>

            <div className="inline-flex bg-white p-1.5 rounded-full shadow-lg border border-slate-100">
              <FilterButton active={selectedSource === "all"} onClick={() => setSelectedSource("all")}>All Reviews</FilterButton>
              <FilterButton active={selectedSource === "airbnb"} onClick={() => setSelectedSource("airbnb")}>Airbnb</FilterButton>
              <FilterButton active={selectedSource === "vrbo"} onClick={() => setSelectedSource("vrbo")}>Vrbo</FilterButton>
            </div>
          </div>

          <div className="flex items-center justify-center gap-4 md:gap-8">
            <button onClick={prevReview} className="p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300">
              <FaChevronLeft size={20} />
            </button>

            <div className="flex gap-6 w-full justify-center overflow-hidden">
              {getVisibleReviews().map((review, idx) => (
                <PremiumReviewCard key={idx} review={review} />
              ))}
            </div>

            <button onClick={nextReview} className="p-4 rounded-full bg-white shadow-xl border border-slate-100 hover:bg-accent hover:text-white hover:border-accent text-gray-600 transition-all duration-300">
              <FaChevronRight size={20} />
            </button>
          </div>

          <div className="text-center mt-12">
            <Link to="/review" className="inline-flex items-center gap-2 text-accent font-semibold hover:underline text-lg">
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
              onClick={() => navigate("/book")}
              className="bg-accent hover:bg-accent/90 text-white font-bold py-4 px-12 text-lg shadow-2xl transition-all uppercase tracking-widest"
            >
              Book Now
            </button>
            <button
              onClick={() => navigate("/properties")}
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
    <div
      className="group relative"
    >
      <div className="relative aspect-[5/4] overflow-hidden rounded-2xl bg-slate-200">
        <img
          src={currentImage}
          alt={title}
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />

        {/* Gradient Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent"></div>

        {/* Badge */}
        {badge && (
          <div className="absolute top-4 left-4 bg-accent text-white text-xs font-bold uppercase tracking-wider px-3 py-1.5 rounded-full">
            {badge}
          </div>
        )}

        {/* Carousel Controls */}
        <div className="pointer-events-none absolute inset-x-0 top-[42%] z-30 flex -translate-y-1/2 justify-between px-3">
          <button
            type="button"
            onClick={onPrev}
            disabled={isGalleryLoading}
            className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow-lg transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Previous image"
          >
            <FaChevronLeft size={14} />
          </button>
          <button
            type="button"
            onClick={onNext}
            disabled={isGalleryLoading}
            className="pointer-events-auto rounded-full bg-white/90 p-2 text-slate-800 shadow-lg transition-all hover:bg-white disabled:cursor-not-allowed disabled:opacity-50"
            aria-label="Next image"
          >
            <FaChevronRight size={14} />
          </button>
        </div>

        {/* Content Overlay */}
        <div className="absolute bottom-0 left-0 right-0 z-10 p-6 text-white">
          <h3 className="text-2xl font-bold mb-2">{title}</h3>
          <p className="flex items-center gap-1.5 text-sm text-white/80 mb-3">
            <FaMapMarkerAlt className="text-accent" size={12} />
            {location}
          </p>
          {/* Stats */}
          <div className="flex items-center gap-4 text-sm text-white/80 mb-4">
            <span className="flex items-center gap-1.5">
              <FaBed className="text-accent" /> {stats.beds}
            </span>
            <span className="flex items-center gap-1.5">
              <FaBath className="text-accent" /> {stats.baths}
            </span>
            <span className="flex items-center gap-1.5">
              <FaUsers className="text-accent" /> {stats.guests}
            </span>
          </div>

          {/* CTA */}
          <Link
            to={link}
            className="inline-block w-full text-center bg-white text-gray-900 font-bold py-2 px-4 rounded-md hover:bg-accent hover:text-white transition-all duration-300 text-xs uppercase tracking-wide"
          >
            Explore Property
          </Link>
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
    <div className="min-w-[320px] md:min-w-[380px] bg-white p-8 rounded-3xl shadow-xl border border-slate-100 flex flex-col relative">
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

export default Home;
