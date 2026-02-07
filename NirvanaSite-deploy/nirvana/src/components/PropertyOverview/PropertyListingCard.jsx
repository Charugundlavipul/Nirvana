import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { FaHeart, FaRegHeart, FaStar, FaChevronLeft, FaChevronRight, FaBed, FaBath, FaUsers, FaArrowRight } from 'react-icons/fa';

const PropertyListingCard = ({ property }) => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);

  const images = property.highlightImages && property.highlightImages.length > 0
    ? property.highlightImages.filter(Boolean)
    : [property.image].filter(Boolean);

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
    navigate(`/booking/${property.slug}`);
  };

  return (
    <article
      className="group cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={() => navigate(property.propertyRoute)}
    >
      <div className="relative aspect-[4/3] w-full overflow-hidden rounded-2xl bg-slate-100">
        {images[0] ? (
          <img
            src={images[currentImageIndex]}
            alt={property.title}
            className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
          />
        ) : (
          <div className="grid h-full w-full place-items-center bg-gradient-to-br from-slate-200 to-slate-300 text-sm font-medium text-slate-500">
            No Image
          </div>
        )}

        <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />

        <button
          onClick={toggleFavorite}
          className="absolute right-3 top-3 z-10 p-2 rounded-full bg-white/20 backdrop-blur-sm hover:bg-white/40 transition-all duration-200 active:scale-90"
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
              className="absolute left-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg text-slate-700 hover:scale-110 transition-all duration-200"
              aria-label="Previous image"
            >
              <FaChevronLeft size={14} />
            </button>
            <button
              onClick={nextImage}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full bg-white p-2 shadow-lg text-slate-700 hover:scale-110 transition-all duration-200"
              aria-label="Next image"
            >
              <FaChevronRight size={14} />
            </button>
          </>
        )}

        {images.length > 1 && (
          <div className={`absolute bottom-16 left-1/2 flex -translate-x-1/2 gap-1.5 transition-opacity duration-300 ${isHovered ? 'opacity-100' : 'opacity-0'}`}>
            {images.slice(0, 5).map((_, index) => (
              <button
                key={index}
                onClick={(e) => { e.stopPropagation(); setCurrentImageIndex(index); }}
                className={`h-2 rounded-full shadow-sm transition-all duration-200 ${index === currentImageIndex % 5 ? 'w-4 bg-white' : 'w-2 bg-white/60 hover:bg-white/80'
                  }`}
              />
            ))}
          </div>
        )}

        {property.rating && (
          <div className="absolute left-3 top-3 flex items-center gap-1 rounded-full bg-white/90 backdrop-blur-sm px-2.5 py-1 shadow-sm">
            <FaStar className="text-amber-500" size={12} />
            <span className="text-sm font-semibold text-slate-900">{property.rating}</span>
          </div>
        )}

      </div>

      <div className="pt-3 px-1">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h3 className="text-lg font-bold text-slate-900 truncate group-hover:text-accent transition-colors">{property.title}</h3>
          {property.rating && (
            <div className="flex items-center gap-1 text-sm flex-shrink-0">
              <FaStar className="text-amber-500" size={12} />
              <span className="font-semibold text-slate-700">{property.rating}</span>
            </div>
          )}
        </div>

        <p className="text-sm text-slate-500 mb-2">{property.location}</p>

        <div className="flex items-center gap-3 text-sm text-slate-600 mb-3">
          <span className="flex items-center gap-1.5">
            <FaBed className="text-accent" />
            {property.bedroom_count} beds
          </span>
          <span className="flex items-center gap-1.5">
            <FaBath className="text-accent" />
            {property.bathroom_count} baths
          </span>
          {property.guest_count && (
            <span className="flex items-center gap-1.5">
              <FaUsers className="text-accent" />
              {property.guest_count} guests
            </span>
          )}
        </div>

        {/* Action Buttons - Below beds/baths */}
        <div className="flex gap-2 mb-3">
          <button
            onClick={(e) => { e.stopPropagation(); navigate(property.propertyRoute); }}
            className="flex-1 flex items-center justify-center gap-2 bg-white border border-slate-200 text-slate-700 font-semibold py-2.5 px-4 rounded-xl hover:bg-slate-50 hover:border-slate-300 transition-all text-sm"
          >
            View Property
          </button>
          <button
            onClick={handleBookNow}
            className="flex-1 flex items-center justify-center gap-2 bg-accent text-white font-semibold py-2.5 px-4 rounded-xl hover:bg-accent/90 transition-all text-sm group/btn"
          >
            Book Now
            <FaArrowRight className="text-xs group-hover/btn:translate-x-1 transition-transform" />
          </button>
        </div>

        {/* Amenity Highlights */}
        <div className="flex flex-wrap gap-1.5">
          {property.pet_friendly && (
            <span className="text-xs bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full font-medium">Pet Friendly</span>
          )}
          {property.has_hot_tub && (
            <span className="text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full font-medium">Hot Tub</span>
          )}
          {property.has_pool && (
            <span className="text-xs bg-cyan-50 text-cyan-700 px-2 py-0.5 rounded-full font-medium">Pool</span>
          )}
          {property.has_game_room && (
            <span className="text-xs bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full font-medium">Game Room</span>
          )}
          {property.has_mountain_view && (
            <span className="text-xs bg-amber-50 text-amber-700 px-2 py-0.5 rounded-full font-medium">Mountain View</span>
          )}
        </div>
      </div>
    </article>
  );
};

export default PropertyListingCard;
