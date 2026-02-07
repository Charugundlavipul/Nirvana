import React, { useState } from "react";
import { FaStar, FaStarHalfAlt, FaRegStar, FaAirbnb } from "react-icons/fa";

const ReviewCard = ({ review }) => {
  const [showFull, setShowFull] = useState(false);

  const renderStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating);
    const hasHalfStar = rating % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<FaStar key={i} className="text-accent text-sm" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<FaStarHalfAlt key={i} className="text-accent text-sm" />);
      } else {
        stars.push(<FaRegStar key={i} className="text-gray-300 text-sm" />);
      }
    }
    return <div className="flex gap-1">{stars}</div>;
  };

  const name = review.name || "Guest";
  const date = review.date || "";
  const source = review.source || "direct";
  const normalizedSource = source.toLowerCase();
  const text = review.text || "";
  const avatarInitials = name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

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
    <article className="flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-4 shadow-sm transition hover:shadow-md">
      <header className="mb-3 flex items-center gap-3">
        {review.img ? (
          <img src={review.img} alt={name} className="h-11 w-11 rounded-full border border-slate-200 object-cover" />
        ) : (
          <div className="grid h-11 w-11 place-items-center rounded-full border border-blue-100 bg-blue-50 text-xs font-bold text-blue-800">
            {avatarInitials || "G"}
          </div>
        )}
        <div className="min-w-0 flex-1">
          <h4 className="truncate text-sm font-bold text-gray-900">{name}</h4>
          <p className="text-xs text-gray-500">{date}</p>
        </div>
        {renderSourcePill()}
      </header>

      <div className="mb-2">{renderStars(review.rating)}</div>

      <div className="flex flex-col gap-1 text-sm leading-relaxed text-gray-700">
        <p>
          {showFull ? text : `${text.substring(0, 165)}${text.length > 165 ? "..." : ""}`}
        </p>
        {text.length > 165 && (
          <button
            className="w-fit border-0 bg-transparent p-0 text-xs font-bold text-accent hover:underline"
            onClick={() => setShowFull(!showFull)}
          >
            {showFull ? "Read less" : "Read more"}
          </button>
        )}
      </div>
    </article>
  );
};

export default ReviewCard;
