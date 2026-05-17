import React, { useState } from "react";
import { FaStar, FaStarHalfAlt, FaRegStar, FaAirbnb, FaQuoteRight } from "react-icons/fa";

const ReviewCard = ({ review }) => {
  const [showFull, setShowFull] = useState(false);
  const [imgError, setImgError] = useState(false);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-amber-400 text-sm" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-amber-400 text-sm" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-slate-300 text-sm" />);
      }
    }
    return <div className="flex gap-0.5">{stars}</div>;
  };

  const name = review.name || "Guest";
  const date = review.date || "";
  const source = review.source || "direct";
  const normalizedSource = source.toLowerCase();
  const text = review.text || "";
  const avatarInitials = name
    .replace(/[^a-zA-Z\s]/g, '')
    .trim()
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  // Deterministic accent color from initials
  const colorPalettes = [
    { bg: 'bg-emerald-100', text: 'text-emerald-700' },
    { bg: 'bg-blue-100', text: 'text-blue-700' },
    { bg: 'bg-violet-100', text: 'text-violet-700' },
    { bg: 'bg-amber-100', text: 'text-amber-700' },
    { bg: 'bg-rose-100', text: 'text-rose-700' },
    { bg: 'bg-cyan-100', text: 'text-cyan-700' },
  ];
  const colorIndex = (name.charCodeAt(0) || 0) % colorPalettes.length;
  const palette = colorPalettes[colorIndex];

  const renderSourcePill = () => {
    if (normalizedSource === "airbnb") {
      return (
        <span className="rounded-full border border-rose-200 bg-rose-50 px-2.5 py-1.5 flex items-center justify-center">
          <FaAirbnb className="text-rose-500 text-lg" />
        </span>
      );
    }

    if (normalizedSource === "vrbo") {
      return (
        <span className="rounded-full border border-blue-200 bg-blue-50 px-2 py-1">
          <img
            src="/assets/vrbo.png"
            alt="Vrbo"
            className="h-3.5 w-auto object-contain"
          />
        </span>
      );
    }

    return (
      <span className="rounded-full border border-primary/20 bg-primary/5 px-2 py-1 text-[10px] font-bold uppercase tracking-wide text-primary">
        {source}
      </span>
    );
  };

  return (
    <article className="group relative flex min-h-[240px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition-all duration-300 hover:border-slate-300 hover:shadow-lg hover:-translate-y-0.5 sm:p-6">
      {/* Decorative quote */}
      <FaQuoteRight className="absolute right-5 top-5 text-3xl text-slate-100 transition-colors duration-300 group-hover:text-accent/10 sm:right-6 sm:top-6" />

      <header className="relative z-10 mb-4 flex items-center gap-3">
        {review.img && !imgError ? (
          <img 
            src={review.img} 
            alt={name} 
            className="h-12 w-12 rounded-full border-2 border-white object-cover shadow-sm ring-1 ring-slate-200" 
            onError={() => setImgError(true)}
          />
        ) : (
          <div className={`grid h-12 w-12 flex-shrink-0 place-items-center rounded-full ${palette.bg} ${palette.text} text-sm font-bold tracking-wide ring-1 ring-white shadow-sm`}>
            {avatarInitials || "G"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-slate-900">{name}</h4>
          <p className="text-xs text-slate-500">{date}</p>
        </div>
        {renderSourcePill()}
      </header>

      <div className="mb-3">{renderStars(review.rating)}</div>

      <div className="flex flex-1 flex-col gap-1.5 text-sm leading-relaxed text-slate-600">
        <p>
          {showFull ? text : `${text.substring(0, 180)}${text.length > 180 ? "..." : ""}`}
        </p>
        {text.length > 180 && (
          <button
            className="mt-auto w-fit border-0 bg-transparent p-0 text-xs font-bold text-accent hover:underline"
            onClick={() => setShowFull(!showFull)}
          >
            {showFull ? "Show less" : "Read more"}
          </button>
        )}
      </div>
    </article>
  );
};

export default ReviewCard;
