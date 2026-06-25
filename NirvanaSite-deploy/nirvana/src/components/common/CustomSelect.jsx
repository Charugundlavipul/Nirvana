import React, { useState, useRef, useEffect } from 'react';

const CustomSelect = ({ value, onChange, options, placeholder = "Select option" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (containerRef.current && !containerRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const selectedOption = options.find(opt => opt.value === value) || options[0];

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left bg-transparent text-sm md:text-base font-semibold text-slate-900 focus:outline-none cursor-pointer flex items-center justify-between"
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full left-0 w-full md:min-w-[200px] mt-4 bg-white rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 py-2 max-h-64 overflow-y-auto z-50"
          onMouseDown={(e) => e.stopPropagation()}
        >
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={`w-full text-left px-5 py-2.5 transition-colors text-sm font-semibold hover:bg-slate-50 flex items-center justify-between ${
                value === option.value ? 'bg-accent/5 text-accent' : 'text-slate-700'
              }`}
            >
              <span>{option.label}</span>
              {value === option.value && (
                <span className="h-2 w-2 rounded-full bg-accent"></span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

export default CustomSelect;
