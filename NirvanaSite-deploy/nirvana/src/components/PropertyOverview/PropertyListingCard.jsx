import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { FaHeart, FaRegHeart, FaStar, FaChevronLeft, FaChevronRight, FaBed, FaBath, FaUsers, FaArrowRight } from "react-icons/fa";
import { getCompactBathroomSummary } from "../../lib/bathrooms";

const PropertyListingCard = ({ property }) => {
  const router = useRouter();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const highlightCandidate = property.highlightImages && property.highlightImages.length > 0
    ? property.highlightImages
    : [];
  const primaryFallback = property.primary_image || property.image || "";
  
  const uniqueImages = new Set();
  const compactBathroomSummary = getCompactBathroomSummary(property);
  const images = [primaryFallback, ...highlightCandidate]
    .filter(Boolean)
    .filter((img) => {
      if (uniqueImages.has(img)) return false;
      uniqueImages.add(img);
      return true;
    });

  // Force the browser to secretly download all carousel images in the background
  // so that clicking the arrow buttons feels completely instantaneous.
  useEffect(() => {
    const timer = setTimeout(() => {
      images.forEach((url) => {
        if (url) {
          const img = new window.Image();
          img.src = url;
        }
      });
    }, 1000); // 1s delay to prioritize the main page load
    return () => clearTimeout(timer);
  }, [images]);

  const nextImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  const prevImage = (e) => {
    e.stopPropagation();
    setCurrentImageIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const toggleFavorite = (e) => {
    e.stopPropagation();
    setIsFavorite(!isFavorite);
  };

  const handleBookNow = (e) => {
    e.stopPropagation();
    router.push(`/book/${property.slug}`);
  };

  return (
    <article
      className="group cursor-pointer rounded-[28px] border border-slate-200 bg-white p-3 shadow-[0_18px_40px_rgba(15,23,42,0.08)] transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_24px_50px_rgba(15,23,42,0.12)]"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => router.push(property.propertyRoute)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
        {images[0] ? (
          images.map((img, idx) => (
            <img
              key={`${img}-${idx}`}
              src={img}
              alt={`${property.title} - image ${idx + 1}`}
              className={`absolute inset-0 h-full w-full object-cover transition-all duration-500 group-hover:scale-110 ${
                idx === currentImageIndex ? 'opacity-100 z-10' : 'opacity-0 z-0'
              }`}
            />
          ))
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-medium text-slate-500 z-10 absolute inset-0">
            No Image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <button
          onClick={toggleFavorite}
          className="absolute right-3 top-3 z-10 rounded-full bg-white/20 p-2 backdrop-blur-sm transition-all duration-200 hover:bg-white/40 active:scale-90"
          aria-label="Add to favorites"
        >
          {isFavorite ? (
            <FaHeart className="text-xl text-rose-500 drop-shadow-sm" />
          ) : (
            <FaRegHeart className="text-xl text-white drop-shadow-md" />
          )}
        </button>

        {images.length > 1 && isHovered && (
          <>
            <button
              onClick={prevImage}
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 text-slate-700 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Previous image"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 text-slate-700 shadow-lg transition-all duration-200 hover:scale-110"
              aria-label="Next image"
            >
              <FaChevronRight size={14} />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className={`absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1.5 transition-opacity duration-300 ${isHovered ? "opacity-100" : "opacity-0"}`}>
            {images.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={(e) => {
                  e.stopPropagation();
                  setCurrentImageIndex(index);
                }}
                className={`h-2 rounded-full shadow-sm transition-all duration-200 ${index === currentImageIndex % 5 ? "w-4 bg-white" : "w-2 bg-white/60 hover:bg-white/80"}`}
              />
            ))}
          </div>
        )}

        {property.rating && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 px-2.5 py-1 shadow-sm backdrop-blur-sm">
            <FaStar className="text-amber-500" size={12} />
            <span className="text-sm font-semibold text-slate-900">{property.rating}</span>
          </div>
        )}
      </div>

      <div className="px-2 pb-2 pt-4">
        <div className="mb-1 flex items-start justify-between gap-2">
          <h3 className="truncate text-lg font-bold text-slate-900 transition-colors group-hover:text-accent">{property.title}</h3>
          {property.rating && (
            <div className="flex flex-shrink-0 items-center gap-1 text-sm">
              <FaStar className="text-amber-500" size={12} />
              <span className="font-semibold text-slate-700">{property.rating}</span>
            </div>
          )}
        </div>

        <p className="mb-2 text-sm text-slate-500">{property.location}</p>

        {property.availability?.searched && (
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs font-semibold text-emerald-700">
              Available {property.availability.dateLabel}
            </span>
            {property.availability.totalPriceLabel && (
              <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-700">
                From {property.availability.totalPriceLabel}
              </span>
            )}
          </div>
        )}

        <div className="mb-3 flex items-center gap-3 text-sm text-slate-600">
          <span className="flex items-center gap-1.5">
            <FaBed className="text-accent" />
            {property.bedroom_count} {property.bedroom_count === 1 ? 'bdrm' : 'bdrms'}
          </span>
          {property.bed_count > 0 && (
            <span className="flex items-center gap-1.5">
              <FaBed className="text-accent" />
              {property.bed_count} {property.bed_count === 1 ? 'bed' : 'beds'}
            </span>
          )}
          <span className="flex items-center gap-1.5">
            <FaBath className="text-accent" />
            {compactBathroomSummary || "No baths listed"}
          </span>
          {(property.guests_max || property.guest_count) && (
            <span className="flex items-center gap-1.5">
              <FaUsers className="text-accent" />
              {property.guests_max || property.guest_count} guests
            </span>
          )}
        </div>

        <div className="mb-3 flex gap-2">
          <button
            onClick={(e) => {
              e.stopPropagation();
              router.push(property.propertyRoute);
            }}
            className="flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition-all hover:border-slate-300 hover:bg-slate-50"
          >
            View Property
          </button>
          <button
            onClick={handleBookNow}
            className="group/btn flex flex-1 items-center justify-center gap-2 rounded-xl bg-accent px-4 py-2.5 text-sm font-semibold text-white transition-all hover:bg-accent/90"
          >
            Book Now
            <FaArrowRight className="text-xs transition-transform group-hover/btn:translate-x-1" />
          </button>
        </div>

        <div className="flex flex-wrap gap-1.5">
          {property.pet_friendly && (
            <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">Pet Friendly</span>
          )}
          {property.has_hot_tub && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-xs font-medium text-blue-700">Hot Tub</span>
          )}
          {property.has_pool && (
            <span className="rounded-full bg-cyan-50 px-2 py-0.5 text-xs font-medium text-cyan-700">Pool</span>
          )}
          {property.has_game_room && (
            <span className="rounded-full bg-purple-50 px-2 py-0.5 text-xs font-medium text-purple-700">Game Room</span>
          )}
          {property.has_mountain_view && (
            <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-medium text-amber-700">Mountain View</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default PropertyListingCard;
