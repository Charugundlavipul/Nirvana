import React, { useState, useRef, useEffect } from 'react';
import { FaChevronLeft, FaChevronRight } from 'react-icons/fa';

const daysOfWeek = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

const CustomDatePicker = ({ value, onChange, minDate, placeholder = "Select date" }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(value ? new Date(value + 'T00:00:00') : new Date());
  const containerRef = useRef(null);

  // Parse minDate string to Date object for comparison
  const minDateObj = minDate ? new Date(minDate + 'T00:00:00') : null;
  if (minDateObj) {
    minDateObj.setHours(0, 0, 0, 0);
  }

  // Handle outside click
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

  const handlePrevMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = (e) => {
    e.stopPropagation();
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const getDaysInMonth = (year, month) => {
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (year, month) => {
    return new Date(year, month, 1).getDay();
  };

  const renderCalendar = () => {
    const year = currentMonth.getFullYear();
    const month = currentMonth.getMonth();
    const daysInMonth = getDaysInMonth(year, month);
    const firstDay = getFirstDayOfMonth(year, month);

    const days = [];
    
    // Empty slots for days before the first day of the month
    for (let i = 0; i < firstDay; i++) {
      days.push(<div key={`empty-${i}`} className="w-8 h-8 md:w-10 md:h-10"></div>);
    }

    // Days of the month
    for (let i = 1; i <= daysInMonth; i++) {
      const date = new Date(year, month, i);
      date.setHours(0, 0, 0, 0);
      
      const dateString = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`;
      
      const isSelected = value === dateString;
      const isPast = minDateObj && date < minDateObj;

      days.push(
        <button
          key={i}
          type="button"
          disabled={isPast}
          onClick={() => {
            onChange(dateString);
            setIsOpen(false);
          }}
          className={`w-8 h-8 md:w-10 md:h-10 flex items-center justify-center rounded-full text-sm transition-all
            ${isSelected ? 'bg-accent text-white font-bold shadow-md' : 
              isPast ? 'text-slate-200 cursor-not-allowed' : 
              'text-slate-700 hover:bg-slate-100 font-medium'
            }`}
        >
          {i}
        </button>
      );
    }

    return days;
  };

  const displayFormat = value ? new Date(value + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : placeholder;

  return (
    <div className="relative w-full" ref={containerRef}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full text-left bg-transparent text-sm md:text-base font-semibold text-slate-900 focus:outline-none cursor-pointer flex items-center justify-between"
      >
        <span className={!value ? "text-slate-400" : ""}>{displayFormat}</span>
      </button>

      {isOpen && (
        <div
          className="absolute top-full -left-4 md:left-0 w-max mt-4 bg-white rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 p-5 z-50"
          onMouseDown={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <button type="button" onClick={handlePrevMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <FaChevronLeft className="w-3 h-3" />
            </button>
            <div className="font-bold text-slate-800 text-sm">
              {currentMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </div>
            <button type="button" onClick={handleNextMonth} className="p-2 hover:bg-slate-100 rounded-full text-slate-500 transition-colors">
              <FaChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2 mb-2">
            {daysOfWeek.map(day => (
              <div key={day} className="w-8 h-8 md:w-10 md:h-10 flex items-center justify-center text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                {day}
              </div>
            ))}
          </div>

          <div className="grid grid-cols-7 gap-1 md:gap-2">
            {renderCalendar()}
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomDatePicker;
