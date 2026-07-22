'use client';

import React, { useState, useEffect, useRef } from 'react';
import { FaChevronLeft, FaChevronRight, FaTimes, FaCalendarAlt, FaUser, FaClock, FaArrowRight } from 'react-icons/fa';

function formatDisplayDate(dateStr) {
    if (!dateStr) return '';
    const date = new Date(dateStr + "T12:00:00Z");
    return date.toLocaleDateString('en-US', { month: '2-digit', day: '2-digit', year: 'numeric' });
}

const AvailabilityCalendar = ({ propertyId, maxGuests = 12, checkInTime = '4:00 PM', checkOutTime = '10:00 AM' }) => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [calendarData, setCalendarData] = useState({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showTwoMonths, setShowTwoMonths] = useState(true);
  const containerRef = useRef(null);

  const [checkInDate, setCheckInDate] = useState(null);
  const [checkOutDate, setCheckOutDate] = useState(null);
  const [hoverDate, setHoverDate] = useState(null);

  useEffect(() => {
    if (typeof window !== 'undefined' && containerRef.current) {
        const observer = new ResizeObserver((entries) => {
             const { width } = entries[0].contentRect;
             // 550px is the threshold where 2 months can fit side-by-side cleanly
             setShowTwoMonths(width > 550);
        });
        observer.observe(containerRef.current);
        return () => observer.disconnect();
    }
  }, []);
  
  const [adults, setAdults] = useState(2);
  const [children, setChildren] = useState(0);
  const [infants, setInfants] = useState(0);
  
  const [showGuestsPopup, setShowGuestsPopup] = useState(false);
  const [draftAdults, setDraftAdults] = useState(2);
  const [draftChildren, setDraftChildren] = useState(0);
  const [draftInfants, setDraftInfants] = useState(0);

  const handleOpenGuests = () => {
      setDraftAdults(adults);
      setDraftChildren(children);
      setDraftInfants(infants);
      setShowGuestsPopup(true);
  };

  const handleCloseGuests = () => {
      if (draftAdults !== adults || draftChildren !== children || draftInfants !== infants) {
          setAdults(draftAdults);
          setChildren(draftChildren);
          setInfants(draftInfants);
      }
      setShowGuestsPopup(false);
  };
  
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);
  const [quoteError, setQuoteError] = useState(null);

  useEffect(() => {
    if (!propertyId) return;

    const fetchCalendar = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const year = currentDate.getFullYear();
        const month = currentDate.getMonth();
        
        // Fetch 3 months of data to ensure smooth sliding
        const startDate = new Date(year, month, 1);
        const endDate = new Date(year, month + 3, 0);
        
        const startStr = startDate.toISOString().split('T')[0];
        const endStr = endDate.toISOString().split('T')[0];

        const response = await fetch(`/api/properties/${propertyId}/calendar?start_date=${startStr}&end_date=${endStr}`);
        if (!response.ok) {
          throw new Error('Failed to load availability');
        }
        
        const data = await response.json();
        
        const availabilityMap = {};
        let prevStatus = 'available';
        
        data.forEach((day) => {
          let type = day.status?.available ? 'available' : 'unavailable';
          
          if (type === 'unavailable') {
             if (prevStatus === 'available') type = 'check-in';
          } else if (type === 'available') {
             if (prevStatus === 'unavailable' || prevStatus === 'check-in') type = 'check-out';
          }
          
          availabilityMap[day.date] = type;
          prevStatus = day.status?.available ? 'available' : 'unavailable';
        });

        setCalendarData(availabilityMap);
      } catch (err) {
        console.error(err);
        setError('Calendar currently unavailable');
      } finally {
        setLoading(false);
      }
    };

    fetchCalendar();
  }, [propertyId, currentDate.getFullYear(), currentDate.getMonth()]);

  useEffect(() => {
     if (checkInDate && checkOutDate) {
         fetchQuote();
     }
  }, [checkInDate, checkOutDate, adults, children, infants]);

  const fetchQuote = async () => {
      setQuoteLoading(true);
      setQuote(null);
      setQuoteError(null);
      try {
          const res = await fetch(`/api/properties/${propertyId}/quote`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                  checkin_date: checkInDate,
                  checkout_date: checkOutDate,
                  guests: { adults, children, infants }
              })
          });
          const payload = await res.json();
          if (!res.ok) {
              throw new Error(payload.error || 'Failed to get pricing');
          }
          setQuote(payload.data);
      } catch (err) {
          setQuoteError(err.message);
      } finally {
          setQuoteLoading(false);
      }
  };

  const handlePrevMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
  };
  
  const isDateUnavailable = (dateStr) => {
      const status = calendarData[dateStr];
      if (!status) return false; 
      // Middle of an existing booking — always blocked
      if (status === 'unavailable') return true;
      // check-in = someone else's stay starts this night (night is booked)
      // → You CAN check out here (same-day turnover — you leave morning, they arrive afternoon)
      // → You CANNOT check in here (the night is taken)
      if (status === 'check-in') {
          // If user is picking a checkout date, allow same-day turnover
          if (checkInDate && !checkOutDate) return false;
          // Otherwise treat as unavailable (can't start a stay on a booked night)
          return true;
      }
      // check-out = previous guest leaves (night is free)
      // → Always available for check-in (same-day turnover)
      return false;
  };

  const handleDateClick = (dateStr) => {
      const isPast = new Date(dateStr + "T00:00:00") < new Date(new Date().setHours(0,0,0,0));
      if (isPast) return;

      const status = calendarData[dateStr];
      if (status === 'check-in' && !checkInDate) {
          setError("This date is only available for checkout (another guest is arriving). Please select an earlier check-in date.");
          setTimeout(() => {
              setError(null);
          }, 6000);
          return;
      }

      if (isDateUnavailable(dateStr)) return;

      if (!checkInDate || (checkInDate && checkOutDate)) {
         setCheckInDate(dateStr);
         setCheckOutDate(null);
         setQuote(null);
         setQuoteError(null);
      } else {
         const dIn = new Date(checkInDate + "T12:00:00Z");
         const dOut = new Date(dateStr + "T12:00:00Z");
         if (dOut <= dIn) {
            setCheckInDate(dateStr);
            setCheckOutDate(null);
         } else {
            let valid = true;
            let current = new Date(dIn);
            current.setDate(current.getDate() + 1);
            while (current < dOut) {
                const s = current.toISOString().split('T')[0];
                const dayStatus = calendarData[s];
                if (dayStatus !== 'available' && dayStatus !== 'check-out') {
                    valid = false;
                    break;
                }
                current.setDate(current.getDate() + 1);
            }
            if (!valid) {
                 setCheckInDate(dateStr);
                 setCheckOutDate(null);
            } else {
                 setCheckOutDate(dateStr);
            }
         }
      }
  };

  const handleDateHover = (dateStr) => {
      if (checkInDate && !checkOutDate) {
          setHoverDate(dateStr);
      } else {
          setHoverDate(null);
      }
  };

  const renderMonth = (monthOffset) => {
    const targetDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + monthOffset, 1);
    const monthIndex = targetDate.getMonth();
    const year = targetDate.getFullYear();
    const monthName = targetDate.toLocaleString('default', { month: 'long' });
    
    // Days array
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const firstDayOfWeek = new Date(year, monthIndex, 1).getDay();
    
    const blanks = Array.from({ length: firstDayOfWeek });
    const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

    const todayDateStr = new Date().toISOString().split('T')[0];

    return (
      <div className="flex-1 min-w-[200px] mb-4">
        <h4 className="text-center font-semibold text-slate-800 text-base mb-4 font-sans tracking-wide">
          {monthName} {year}
        </h4>
        
        <div className="bg-white rounded-xl">
          <div className="grid grid-cols-7 text-center mb-2">
            {['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'].map(day => (
              <div key={day} className="text-slate-400 text-[11px] uppercase tracking-wider font-semibold py-1">
                {day}
              </div>
            ))}
          </div>
          
          <div className="grid grid-cols-7 text-center gap-1.5 object-center relative group" 
               onMouseLeave={() => setHoverDate(null)}>
            {blanks.map((_, i) => (
              <div key={`blank-${i}`} className="aspect-square"></div>
            ))}
            {days.map(day => {
              const dateStr = `${year}-${String(monthIndex + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
              const isToday = dateStr === todayDateStr;
              let status = calendarData[dateStr] || 'available';
              
              const isPast = new Date(dateStr + "T00:00:00") < new Date(new Date().setHours(0,0,0,0));
              if (isPast && status === 'available') {
                status = 'past';
              }

              const isCheckoutOnly = status === 'check-in' && !checkInDate && !isPast;
              const isUnavailableDate = isDateUnavailable(dateStr);
              let wrapperClass = "aspect-square flex items-center justify-center";
              let cellClass = "w-full h-full flex items-center justify-center text-sm transition-colors duration-150 rounded-full";
              let cellStyle = {};
              let tooltip = "";

              // Tooltip text for accessibility and clarity
              if (isPast) {
                  tooltip = "Past date";
              } else if (status === 'unavailable') {
                  tooltip = "Unavailable (Booked)";
              } else if (status === 'check-in') {
                  tooltip = "Checkout only (Next guest arriving)";
              } else if (status === 'check-out') {
                  tooltip = "Check-in only (Previous guest leaving)";
              } else {
                  tooltip = "Available";
              }

              let isSelected = dateStr === checkInDate || dateStr === checkOutDate;
              let isBetween = false;
              if (checkInDate && checkOutDate) {
                  isBetween = dateStr > checkInDate && dateStr < checkOutDate;
              } else if (checkInDate && hoverDate && hoverDate > checkInDate) {
                  isBetween = dateStr > checkInDate && dateStr <= hoverDate && status !== 'unavailable' && status !== 'past';
              }

              // Blocked — either truly unavailable, or contextually blocked (e.g. check-in day when user already picked check-in)
              if (isPast) {
                  cellClass += " text-slate-300 cursor-default";
              } else if (isCheckoutOnly) {
                  // Checkout-only (Airbnb style diagonal split)
                  cellClass += " text-slate-600 font-medium cursor-pointer";
                  cellStyle = {
                      background: 'linear-gradient(135deg, transparent 49.9%, #e2e8f0 49.9%, #e2e8f0 50.1%, #f1f5f9 50.1%)',
                      borderRadius: '50%',
                  };
              } else if (isUnavailableDate) {
                  cellClass += " text-slate-300 cursor-default line-through decoration-slate-300/70";
              }
              // Available (includes transition days that are currently clickable)
              else {
                  cellClass += " text-slate-900 font-medium cursor-pointer hover:bg-slate-900 hover:text-white";
              }

              // Today
              if (isToday && !isSelected && !isBetween) {
                  cellClass += " font-bold underline underline-offset-4 decoration-2 decoration-slate-900";
              }

              // In-range
              if (isBetween && !isSelected && !isUnavailableDate) {
                  cellClass = "w-full h-full flex items-center justify-center text-sm transition-colors duration-150 rounded-none text-accent font-medium cursor-pointer bg-accent/10";
              }

              // Selected
              if (isSelected) {
                  cellClass = "w-full h-full flex items-center justify-center text-sm rounded-full bg-slate-900 text-white font-bold cursor-pointer shadow-sm";
              }

              return (
                <div key={dateStr} className={wrapperClass}>
                  <div
                    className={cellClass}
                    style={cellStyle}
                    onClick={() => handleDateClick(dateStr)}
                    onMouseEnter={() => handleDateHover(dateStr)}
                    title={tooltip}
                  >
                    {day}
                  </div>
                </div>
              );
            })}
            
            {Array.from({ length: (7 - ((blanks.length + days.length) % 7)) % 7 }).map((_, i) => (
              <div key={`end-blank-${i}`} className="aspect-square"></div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  const nightsCount = (checkInDate && checkOutDate) 
    ? Math.round((new Date(checkOutDate + "T12:00:00Z") - new Date(checkInDate + "T12:00:00Z")) / (1000 * 60 * 60 * 24)) 
    : 0;

  return (
    <div className="w-full relative">
        <div className="flex flex-col lg:flex-row gap-8 items-start">
            
            {/* Calendar Section */}
            <div className="bg-white rounded-[2rem] shadow-sm border border-slate-200/60 p-6 md:p-8 flex-1 transition-all w-full">
                <div className="mb-6">
                    <h3 className="text-2xl text-slate-800 font-sans font-semibold tracking-tight">Select Dates</h3>
                    <p className="text-sm text-slate-400 mt-1">Greyed out dates are not available</p>
                </div>

                <div className="relative min-h-[300px]" ref={containerRef}>
                    {loading && (
                    <div className="absolute inset-0 bg-white/80 backdrop-blur-sm z-20 flex flex-col items-center justify-center rounded-2xl">
                        <div className="w-8 h-8 border-4 border-primary/10 border-t-accent rounded-full animate-spin mb-3"></div>
                        <div className="text-primary font-medium text-sm tracking-wide">Syncing availability...</div>
                    </div>
                    )}
                    
                    {error && (
                    <div className="bg-red-50 text-red-600 rounded-xl p-4 text-center text-sm font-medium mb-6">
                        {error}
                    </div>
                    )}

                    <div className="flex flex-row justify-center gap-8 md:gap-12 px-0 sm:px-2">
                        <div className="w-full flex-1 max-w-[350px]">
                             {renderMonth(0)}
                        </div>
                        {showTwoMonths && (
                            <div className="w-full flex-1 max-w-[350px]">
                                {renderMonth(1)}
                            </div>
                        )}
                    </div>
                    
                    {/* Bottom Navigation Arrows */}
                    <div className="flex items-center justify-center gap-8 mt-6">
                        <button 
                            onClick={handlePrevMonth}
                            className="text-slate-400 hover:text-accent bg-white shadow-sm border border-slate-100 hover:border-accent/20 hover:bg-accent/5 p-3 rounded-full transition-all"
                            aria-label="Previous Month"
                        >
                            <FaChevronLeft size={14}/>
                        </button>
                        <button 
                            onClick={handleNextMonth}
                            className="text-slate-400 hover:text-accent bg-white shadow-sm border border-slate-100 hover:border-accent/20 hover:bg-accent/5 p-3 rounded-full transition-all"
                            aria-label="Next Month"
                        >
                            <FaChevronRight size={14}/>
                        </button>
                    </div>

                    {/* Selection Info Bar */}
                    {(checkInDate || checkOutDate) && (
                      <div className="mt-6 bg-accent/5 border border-accent/15 rounded-xl p-4 transition-all animate-in fade-in duration-300">
                        <div className="flex items-center justify-between gap-2 text-[11px] uppercase tracking-wider font-semibold text-accent/70 mb-2">
                          <div className="flex items-center gap-2">
                            <FaClock size={10} />
                            <span>Your Selected Stay</span>
                            {nightsCount > 0 && (
                              <span className="ml-2 bg-accent/20 text-accent font-bold px-2.5 py-0.5 rounded-full tracking-normal text-[10px]">
                                {nightsCount} Night{nightsCount !== 1 ? 's' : ''}
                              </span>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setCheckInDate(null);
                              setCheckOutDate(null);
                              setQuote(null);
                              setQuoteError(null);
                            }}
                            className="text-[10px] font-bold text-slate-500 hover:text-slate-800 hover:border-slate-300 transition-all uppercase tracking-wider bg-white hover:bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 cursor-pointer focus:outline-none flex items-center gap-1"
                          >
                            <FaTimes size={8} /> Clear
                          </button>
                        </div>
                        <div className="flex items-center gap-3 flex-wrap">
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-bold text-slate-800">
                              {checkInDate ? formatDisplayDate(checkInDate) : '—'}
                            </span>
                            <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                              {checkInTime} check-in
                            </span>
                          </div>
                          {checkOutDate && (
                            <>
                              <FaArrowRight size={10} className="text-accent/40" />
                              <div className="flex items-center gap-2">
                                <span className="text-sm font-bold text-slate-800">
                                  {formatDisplayDate(checkOutDate)}
                                </span>
                                <span className="text-xs font-semibold text-accent bg-accent/10 px-2 py-0.5 rounded-full">
                                  {checkOutTime} check-out
                                </span>
                              </div>
                            </>
                          )}
                          {checkInDate && !checkOutDate && (
                            <span className="text-xs text-slate-400 italic">← now pick your check-out date</span>
                          )}
                        </div>
                      </div>
                    )}
                </div>
            </div>

            {/* Pricing Sidebar */}
            <div className="w-full lg:w-[380px] flex-shrink-0 transition-all duration-500">
                <div className="bg-white rounded-[2rem] shadow-xl shadow-slate-200/50 border border-slate-200/60 p-6 md:p-8 sticky top-24">
                    <h3 className="text-xl text-slate-800 font-sans font-semibold tracking-tight mb-6">Price Breakdown</h3>
                    
                    <div className="flex gap-4 mb-6">
                        <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                             <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><FaCalendarAlt/> Arrival</div>
                             <div className="font-semibold text-slate-800 text-sm">
                                 {checkInDate ? formatDisplayDate(checkInDate) : 'Select date'}
                             </div>
                        </div>
                        <div className="flex-1 bg-slate-50 rounded-xl p-3 border border-slate-100">
                             <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-1 flex items-center gap-1.5"><FaCalendarAlt/> Departure</div>
                             <div className="font-semibold text-slate-800 text-sm">
                                 {checkOutDate ? formatDisplayDate(checkOutDate) : 'Select date'}
                             </div>
                        </div>
                    </div>

                    <div className="mb-6 relative">
                         <div className="text-[10px] uppercase tracking-wider font-semibold text-slate-400 mb-2 flex items-center gap-1.5"><FaUser/> Guests</div>
                         <button 
                            type="button" 
                            onClick={() => showGuestsPopup ? handleCloseGuests() : handleOpenGuests()} 
                            className="flex items-center justify-between border border-slate-200 rounded-xl p-3 px-4 bg-white w-full hover:border-accent transition-colors focus:outline-none"
                         >
                             <span className="text-sm font-medium text-slate-700 text-left">
                                 {adults + children} guest{adults + children > 1 ? 's' : ''}{infants > 0 ? `, ${infants} infant${infants > 1 ? 's' : ''}` : ''}
                             </span>
                             <span className="text-slate-400 text-xs text-right opacity-60">Edit</span>
                         </button>

                         {showGuestsPopup && (
                             <div className="absolute top-full left-0 mt-2 w-full bg-white rounded-2xl shadow-xl shadow-slate-200/50 border border-slate-200/60 p-5 z-20">
                                 <div className="flex items-center justify-between mb-4">
                                     <div>
                                         <div className="font-semibold text-slate-800 text-sm">Adults</div>
                                         <div className="text-xs text-slate-500 font-medium">Age 13+</div>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button disabled={draftAdults <= 1 || quoteLoading} onClick={() => setDraftAdults(p=>Math.max(1, p-1))} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">-</button>
                                         <span className="text-sm font-semibold w-2 text-center">{draftAdults}</span>
                                         <button disabled={draftAdults + draftChildren >= maxGuests || quoteLoading} onClick={() => setDraftAdults(p=>Math.min(maxGuests, p+1))} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                     </div>
                                 </div>

                                 <div className="flex items-center justify-between mb-4">
                                     <div>
                                         <div className="font-semibold text-slate-800 text-sm">Children</div>
                                         <div className="text-xs text-slate-500 font-medium">Ages 2 to 12</div>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button disabled={draftChildren <= 0 || quoteLoading} onClick={() => setDraftChildren(p=>Math.max(0, p-1))} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">-</button>
                                         <span className="text-sm font-semibold w-2 text-center">{draftChildren}</span>
                                         <button disabled={draftAdults + draftChildren >= maxGuests || quoteLoading} onClick={() => setDraftChildren(p=>Math.min(maxGuests, p+1))} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                     </div>
                                 </div>

                                 <div className="flex items-center justify-between">
                                     <div>
                                         <div className="font-semibold text-slate-800 text-sm">Infants</div>
                                         <div className="text-xs text-slate-500 font-medium">Under 2</div>
                                     </div>
                                     <div className="flex items-center gap-3">
                                         <button disabled={draftInfants <= 0 || quoteLoading} onClick={() => setDraftInfants(p=>Math.max(0, p-1))} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">-</button>
                                         <span className="text-sm font-semibold w-2 text-center">{draftInfants}</span>
                                         <button disabled={draftInfants >= 5 || quoteLoading} onClick={() => setDraftInfants(p=>Math.min(5, p+1))} className="w-8 h-8 rounded-full bg-slate-50 border border-slate-200 flex items-center justify-center text-slate-500 hover:text-accent hover:bg-accent/5 transition-colors cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed">+</button>
                                     </div>
                                 </div>

                                 <div className="mt-5 pt-4 border-t border-slate-100 text-[11px] leading-relaxed text-slate-500 font-medium">
                                     This property hosts a maximum of {maxGuests} guests (not including infants). Pets are not allowed.
                                 </div>
                                 <div className="mt-3 flex justify-end">
                                     <button type="button" onClick={handleCloseGuests} className="text-slate-600 underline font-semibold text-sm hover:text-slate-900 transition-colors focus:outline-none">Close</button>
                                 </div>
                             </div>
                         )}
                    </div>

                    <div className="h-[1px] bg-slate-100 w-full my-6"></div>

                    {quoteLoading ? (
                         <div className="py-8 flex flex-col items-center justify-center">
                             <div className="w-6 h-6 border-2 border-primary/20 border-t-accent rounded-full animate-spin mb-3"></div>
                             <div className="text-xs font-semibold text-slate-500 uppercase tracking-widest text-center">Calculating total...</div>
                         </div>
                    ) : quoteError ? (
                         <div className="py-4 bg-red-50 text-red-600 rounded-xl p-4 text-center text-sm font-medium mb-6">
                             {quoteError}
                         </div>
                    ) : !checkInDate || !checkOutDate ? (
                         <div className="py-6 text-center text-slate-400 text-sm">
                             Select your check-in and check-out dates to view final pricing.
                         </div>
                    ) : quote ? (
                        <div className="space-y-3 animate-in fade-in duration-500">
                            <div className="flex justify-between items-center text-sm text-slate-600">
                                <span>Rent <span className="text-xs text-slate-400 ml-1">({nightsCount} night{nightsCount !== 1 ? 's' : ''})</span></span>
                                <span className="font-medium text-slate-800">{quote.financials.totals.sub_total.formatted}</span>
                            </div>

                            {quote.financials.fees.map(fee => (
                                <div key={fee.label} className="flex justify-between items-center text-sm text-slate-600">
                                    <span>{fee.label}</span>
                                    <span className="font-medium text-slate-800">{fee.formatted}</span>
                                </div>
                            ))}
                            
                            {quote.financials.taxes && quote.financials.taxes.length > 0 && (
                                <div className="flex justify-between items-center text-sm text-slate-600">
                                    <span>Taxes</span>
                                    <span className="font-medium text-slate-800">
                                    ${(quote.financials.taxes.reduce((acc, t) => acc + t.amount, 0) / 100).toFixed(2)}
                                    </span>
                                </div>
                            )}

                            <div className="h-[1px] bg-slate-100 w-full my-4"></div>

                            <div className="flex justify-between items-end mb-6">
                                <div>
                                    <span className="block text-[11px] uppercase tracking-wider font-semibold text-slate-400 mb-1">Total Due</span>
                                    <span className="text-3xl font-bold text-slate-900 leading-none">{quote.financials.totals.total.formatted}</span>
                                </div>
                            </div>

                            {quote.booking_url ? (
                                <a 
                                    href={quote.booking_url} 
                                    target="_blank" 
                                    rel="noopener noreferrer"
                                    className="w-full py-4 rounded-xl font-bold uppercase tracking-wider text-sm flex items-center justify-center transition-all bg-primary hover:bg-primary-hover text-white shadow-lg shadow-primary/20 hover:shadow-primary/40 transform hover:-translate-y-0.5"
                                >
                                    Book Now
                                </a>
                            ) : (
                                <button disabled className="w-full py-4 bg-slate-200 text-slate-500 rounded-xl font-bold uppercase tracking-wider text-sm">
                                    Unavailable
                                </button>
                            )}
                            <p className="mt-3 text-center text-[11px] leading-relaxed text-slate-400">
                                <span className="inline-flex items-center gap-1">
                                    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="w-3 h-3 text-emerald-400 flex-shrink-0"><path fillRule="evenodd" d="M10 1a4.5 4.5 0 0 0-4.5 4.5V9H5a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-6a2 2 0 0 0-2-2h-.5V5.5A4.5 4.5 0 0 0 10 1Zm3 8V5.5a3 3 0 1 0-6 0V9h6Z" clipRule="evenodd" /></svg>
                                    Free cancellation 14+ days before check-in
                                </span>
                                {' · '}
                                <a href="/terms" className="underline underline-offset-2 hover:text-slate-600 transition-colors">Full policy</a>
                            </p>
                        </div>
                    ) : null}
                </div>
            </div>
        </div>
    </div>
  );
};

export default AvailabilityCalendar;
