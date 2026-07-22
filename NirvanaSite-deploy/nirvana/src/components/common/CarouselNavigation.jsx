import React from "react";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";

const CarouselNavigation = ({
  current = 1,
  total = 1,
  onPrevious,
  onNext,
  label = "items",
  className = "",
}) => {
  if (total <= 1) return null;

  const safeCurrent = Math.min(Math.max(Number(current) || 1, 1), total);

  return (
    <div className={`flex justify-center ${className}`}>
      <div
        className="inline-flex items-center gap-1 rounded-full border border-slate-200 bg-white p-1.5 shadow-[0_8px_24px_rgba(15,23,42,0.10)]"
        role="group"
        aria-label={`${label} navigation`}
      >
        <button
          type="button"
          onClick={onPrevious}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label={`Previous ${label}`}
        >
          <FaChevronLeft size={15} aria-hidden="true" />
        </button>

        <span
          className="min-w-[72px] px-2 text-center text-xs font-semibold tabular-nums text-slate-500"
          aria-live="polite"
        >
          <strong className="text-slate-900">{safeCurrent}</strong>
          <span className="mx-1 text-slate-300">/</span>
          {total}
        </span>

        <button
          type="button"
          onClick={onNext}
          className="inline-flex h-10 w-10 items-center justify-center rounded-full text-slate-600 transition-colors hover:bg-accent hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-accent focus-visible:ring-offset-2"
          aria-label={`Next ${label}`}
        >
          <FaChevronRight size={15} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};

export default CarouselNavigation;
