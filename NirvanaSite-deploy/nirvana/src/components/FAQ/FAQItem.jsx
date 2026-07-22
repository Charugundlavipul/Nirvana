import React, { useState } from 'react';
import { FaPlus, FaMinus } from 'react-icons/fa';

const FAQItem = ({ question, answer, index = 0, pinned = false }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className={`group overflow-hidden rounded-2xl border bg-white shadow-sm transition-all duration-300 ${isOpen ? 'border-accent/30 shadow-md shadow-accent/5' : 'border-slate-200 hover:border-slate-300 hover:shadow-md'}`}>
      <button
        className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left transition-colors focus:outline-none md:px-7 md:py-5"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-3 md:gap-4 min-w-0">
          <span className={`flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-xs font-bold transition-colors duration-300 md:h-9 md:w-9 md:text-sm ${isOpen ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500 group-hover:bg-accent/10 group-hover:text-accent'}`}>
            {String(index + 1).padStart(2, '0')}
          </span>
          <span className="text-sm font-semibold leading-snug text-slate-800 md:text-base">{question}</span>
          {pinned && (
            <span className="hidden sm:inline-flex flex-shrink-0 items-center gap-1 rounded-full bg-accent/10 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wider text-accent">
              Most Asked
            </span>
          )}
        </div>
        <span className={`flex h-7 w-7 flex-shrink-0 items-center justify-center rounded-lg transition-all duration-300 md:h-8 md:w-8 ${isOpen ? 'bg-accent text-white rotate-180' : 'bg-slate-100 text-slate-500 group-hover:bg-accent/10 group-hover:text-accent'}`}>
          {isOpen ? <FaMinus size={10} /> : <FaPlus size={10} />}
        </span>
      </button>

      <div
        className={`overflow-hidden transition-all duration-300 ease-in-out ${isOpen ? 'max-h-[600px] opacity-100' : 'max-h-0 opacity-0'}`}
      >
        {isOpen && (
          <div className="border-t border-slate-100 px-5 pb-5 pt-4 md:px-7 md:pl-[4.5rem]">
            <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-600 md:text-base">{answer}</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default FAQItem;
