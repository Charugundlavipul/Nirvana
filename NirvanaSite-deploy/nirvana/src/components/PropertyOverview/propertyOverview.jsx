'use client';

import React, { useEffect, useState, useRef } from "react";
import PropertyListingCard from "./PropertyListingCard";
import {
  FaBed,
  FaCalendarAlt,
  FaMapMarkerAlt,
  FaSearch,
  FaUserFriends,
} from "react-icons/fa";

function applyLocalFilters(sourceProperties, { searchLocation, guests, bedrooms }) {
  let results = [...sourceProperties];

  if (searchLocation) {
    const normalizedSearchLocation = searchLocation.toLowerCase();
    results = results.filter(
      (property) =>
        property.location?.toLowerCase().includes(normalizedSearchLocation) ||
        property.title?.toLowerCase().includes(normalizedSearchLocation)
    );
  }

  if (guests) {
    results = results.filter((property) => property.guests_max >= Number.parseInt(guests, 10));
  }

  if (bedrooms) {
    results = results.filter(
      (property) => property.bedroom_count >= Number.parseInt(bedrooms, 10)
    );
  }

  return results;
}

function getTodayString() {
  return new Date().toISOString().split("T")[0];
}

const PropertyOverview = ({ initialProperties = [] }) => {
  const [properties, setProperties] = useState(initialProperties);
  const [filteredProperties, setFilteredProperties] = useState(initialProperties);
  const [searchLocation, setSearchLocation] = useState("");
  const [checkInDate, setCheckInDate] = useState("");
  const [checkOutDate, setCheckOutDate] = useState("");
  const [guests, setGuests] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [isSearching, setIsSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [searchNotice, setSearchNotice] = useState("");

  const [showDropdown, setShowDropdown] = useState(false);
  const dropdownRef = useRef(null);
  const inputRef = useRef(null);

  const initialized = useRef(false);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target) &&
          inputRef.current && !inputRef.current.contains(e.target)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Filter properties for the dropdown based on search input
  const dropdownSuggestions = properties.filter((p) => {
    if (!searchLocation) return true;
    const q = searchLocation.toLowerCase();
    return p.title?.toLowerCase().includes(q) || p.location?.toLowerCase().includes(q) || p.name?.toLowerCase().includes(q);
  });

  useEffect(() => {
    setProperties(initialProperties);
    setFilteredProperties(initialProperties);
    setSearchError("");
    setSearchNotice("");
  }, [initialProperties]);

  useEffect(() => {
    if (!initialized.current && typeof window !== 'undefined') {
      initialized.current = true;
      const params = new URLSearchParams(window.location.search);
      const pLoc = params.get('location');
      const pCheckIn = params.get('checkIn');
      const pCheckOut = params.get('checkOut');
      const pGuests = params.get('guests');

      if (pLoc || pCheckIn || pCheckOut || pGuests) {
        if (pLoc) setSearchLocation(pLoc);
        if (pCheckIn) setCheckInDate(pCheckIn);
        if (pCheckOut) setCheckOutDate(pCheckOut);
        if (pGuests) setGuests(pGuests);
        
        setTimeout(() => {
          handleSearch({
            checkIn: pCheckIn || "",
            checkOut: pCheckOut || "",
            guests: pGuests || "",
            searchLocation: pLoc || "",
            bedrooms: ""
          });
        }, 10);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleCheckInChange = (value) => {
    setCheckInDate(value);
    if (checkOutDate && value && checkOutDate <= value) {
      setCheckOutDate("");
    }
  };

  const handleSearch = async (overrideParams = null) => {
    setSearchError("");
    setSearchNotice("");

    const activeCheckIn = overrideParams?.checkIn !== undefined ? overrideParams.checkIn : checkInDate;
    const activeCheckOut = overrideParams?.checkOut !== undefined ? overrideParams.checkOut : checkOutDate;
    const activeGuests = overrideParams?.guests !== undefined ? overrideParams.guests : guests;
    const activeLocation = overrideParams?.searchLocation !== undefined ? overrideParams.searchLocation : searchLocation;
    const activeBedrooms = overrideParams?.bedrooms !== undefined ? overrideParams.bedrooms : bedrooms;

    const hasAnyDate = Boolean(activeCheckIn || activeCheckOut);
    const hasFullDateRange = Boolean(activeCheckIn && activeCheckOut);

    if (hasAnyDate && !hasFullDateRange) {
      setSearchError("Select both check-in and check-out dates to run availability search.");
      return;
    }

    let sourceProperties = initialProperties;

    if (hasFullDateRange) {
      setIsSearching(true);

      try {
        const response = await fetch("/api/properties/availability-search", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            startDate: activeCheckIn,
            endDate: activeCheckOut,
            adults: activeGuests || 1,
          }),
        });

        const payload = await response.json();
        if (!response.ok) {
          throw new Error(payload?.error || "Unable to search availability right now.");
        }

        sourceProperties = Array.isArray(payload?.properties) ? payload.properties : [];
        setProperties(sourceProperties);
        setSearchNotice(
          sourceProperties.length === 0
            ? "No properties are available for the selected dates."
            : ""
        );
      } catch (error) {
        setSearchError(
          error instanceof Error ? error.message : "Unable to search availability right now."
        );
        return;
      } finally {
        setIsSearching(false);
      }
    } else {
      setProperties(initialProperties);
    }

    setFilteredProperties(
      applyLocalFilters(sourceProperties, {
        searchLocation: activeLocation,
        guests: activeGuests,
        bedrooms: activeBedrooms,
      })
    );
  };

  const clearFilters = () => {
    setSearchLocation("");
    setCheckInDate("");
    setCheckOutDate("");
    setGuests("");
    setBedrooms("");
    setSearchError("");
    setSearchNotice("");
    setProperties(initialProperties);
    setFilteredProperties(initialProperties);
  };

  const todayString = getTodayString();
  const activeFilterCount = [
    searchLocation,
    checkInDate,
    checkOutDate,
    guests,
    bedrooms,
  ].filter(Boolean).length;

  return (
    <div className="min-h-screen bg-slate-50 font-sans text-slate-800">
      {/* Light Hero Header */}
      <section className="relative overflow-hidden bg-white px-4 pb-6 pt-28 sm:px-6 sm:pb-8 sm:pt-32 md:pb-10 md:pt-36">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/5 sm:h-[400px] sm:w-[400px]"></div>
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-50 sm:h-[420px] sm:w-[420px]"></div>
          <div className="absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-amber-50/60 blur-2xl"></div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="relative z-10 mx-auto max-w-7xl">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <FaMapMarkerAlt className="text-accent text-xs" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">NIRVANA LUXE VACATION RENTALS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Discover Your Next Luxury Vacation Rental
          </h1>
          <p className="mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Browse handpicked luxury vacation rentals — from lakefront homes on Lake Norman to cabin rentals in Sevierville — all available for direct booking.
          </p>
        </div>
      </section>

      {/* Search Section */}
      <div className="mx-auto max-w-7xl px-4 sm:px-6 md:px-8 pt-8 pb-6">
        <div className="rounded-2xl border border-slate-200 bg-white p-3 shadow-lg md:p-6">
          <div className="rounded-xl border border-slate-200 bg-slate-50 p-2 md:p-3">
            <div className="grid grid-cols-1 gap-2 md:gap-3 lg:grid-cols-[1.6fr_1fr_1fr]">
              <div className="group">
                <div className="relative flex h-full items-center gap-2 md:gap-3 rounded-xl border border-transparent bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm transition-all hover:border-accent/30 hover:shadow-md focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaMapMarkerAlt className="flex-shrink-0 text-lg text-accent" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Where
                    </label>
                    <input
                      ref={inputRef}
                      type="text"
                      placeholder="Search destinations..."
                      value={searchLocation}
                      onChange={(event) => { setSearchLocation(event.target.value); setShowDropdown(true); }}
                      onFocus={() => setShowDropdown(true)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                    {showDropdown && dropdownSuggestions.length > 0 && (
                      <div
                        ref={dropdownRef}
                        className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-gray-200 py-2 max-h-72 overflow-y-auto z-50"
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {dropdownSuggestions.map((property) => (
                          <button
                            key={property.id || property.slug}
                            onClick={() => {
                              setSearchLocation(property.title || property.name || '');
                              setShowDropdown(false);
                            }}
                            className="w-full text-left px-4 py-3 hover:bg-slate-50 transition-colors flex items-center gap-3"
                          >
                            {(property.primary_image || property.image) && (
                              <img src={property.primary_image || property.image} alt="" className="w-10 h-10 rounded-lg object-cover flex-shrink-0 ring-1 ring-slate-200" />
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-semibold text-slate-900 truncate">{property.title || property.name}</p>
                              {property.location && <p className="text-xs text-slate-500 truncate">{property.location}</p>}
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div>
                <div className="flex h-full items-center gap-2 md:gap-3 rounded-xl border border-transparent bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm transition-all hover:border-accent/30 hover:shadow-md focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaCalendarAlt className="flex-shrink-0 text-lg text-accent" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Check In
                    </label>
                    <input
                      type="date"
                      min={todayString}
                      value={checkInDate}
                      onChange={(event) => handleCheckInChange(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div>
                <div className="flex h-full items-center gap-2 md:gap-3 rounded-xl border border-transparent bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm transition-all hover:border-accent/30 hover:shadow-md focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaCalendarAlt className="flex-shrink-0 text-lg text-accent" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Check Out
                    </label>
                    <input
                      type="date"
                      min={checkInDate || todayString}
                      value={checkOutDate}
                      onChange={(event) => setCheckOutDate(event.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-2 md:mt-3 grid grid-cols-2 gap-2 md:grid-cols-2 md:gap-3 lg:grid-cols-[1fr_1fr_auto]">
              <div>
                <div className="flex h-full items-center gap-2 md:gap-3 rounded-xl border border-transparent bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm transition-all hover:border-accent/30 hover:shadow-md focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaUserFriends className="flex-shrink-0 text-lg text-accent" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Guests
                    </label>
                    <select
                      value={guests}
                      onChange={(event) => setGuests(event.target.value)}
                      className="w-full cursor-pointer appearance-none bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                    >
                      <option value="">Any</option>
                      <option value="2">2+ guests</option>
                      <option value="4">4+ guests</option>
                      <option value="6">6+ guests</option>
                      <option value="8">8+ guests</option>
                      <option value="10">10+ guests</option>
                    </select>
                  </div>
                </div>
              </div>

              <div>
                <div className="flex h-full items-center gap-2 md:gap-3 rounded-xl border border-transparent bg-white px-3 py-2 md:px-4 md:py-3 shadow-sm transition-all hover:border-accent/30 hover:shadow-md focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaBed className="flex-shrink-0 text-lg text-accent" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      Bedrooms
                    </label>
                    <select
                      value={bedrooms}
                      onChange={(event) => setBedrooms(event.target.value)}
                      className="w-full cursor-pointer appearance-none bg-transparent text-sm font-medium text-slate-900 focus:outline-none"
                    >
                      <option value="">Any</option>
                      <option value="2">2+ bdrms</option>
                      <option value="3">3+ bdrms</option>
                      <option value="4">4+ bdrms</option>
                      <option value="5">5+ bdrms</option>
                    </select>
                  </div>
                </div>
              </div>

              <button
                onClick={handleSearch}
                disabled={isSearching}
                className="col-span-2 lg:col-span-1 flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-3 md:py-4 font-bold text-white shadow-lg transition-all hover:bg-accent/90 hover:shadow-xl active:scale-95 disabled:cursor-not-allowed disabled:opacity-70 lg:min-w-[180px]"
              >
                <FaSearch />
                <span>{isSearching ? "Searching..." : "Search"}</span>
              </button>
            </div>
          </div>

          {/* Status bar */}
          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium ring-1 ring-slate-200/50">
                <span className="font-bold text-slate-900">{filteredProperties.length}</span> of{" "}
                {properties.length} properties
              </span>
              {activeFilterCount > 0 && (
                <button
                  onClick={clearFilters}
                  className="rounded-full bg-rose-50 px-3 py-1.5 font-semibold text-rose-600 ring-1 ring-rose-100 transition-colors hover:bg-rose-100"
                >
                  ✕ Clear filters
                </button>
              )}
            </div>
            <div className="hidden items-center gap-2 text-xs text-slate-500 md:flex">
              <span className="flex items-center gap-1.5 rounded-full bg-accent/10 px-3 py-1.5 font-semibold text-accent ring-1 ring-accent/10">
                <span className="h-1.5 w-1.5 rounded-full bg-accent"></span>
                Direct booking
              </span>
              <span className="flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1.5 ring-1 ring-slate-200/50">
                <FaCalendarAlt className="text-slate-400" />
                Availability search
              </span>
            </div>
          </div>

          {searchError && (
            <div className="mt-4 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
              {searchError}
            </div>
          )}

          {searchNotice && !searchError && (
            <div className="mt-4 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-700">
              {searchNotice}
            </div>
          )}
        </div>
      </div>

      {/* Property Grid */}
      <div className="mx-auto max-w-7xl px-4 pb-20 sm:px-6 md:px-8">
        {filteredProperties.length === 0 ? (
          <div className="flex h-72 flex-col items-center justify-center rounded-2xl border border-slate-200 bg-white text-center shadow-sm">
            <div className="mb-4 flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <FaSearch className="text-xl text-slate-400" />
            </div>
            <p className="text-lg font-semibold text-slate-700">No properties match your criteria</p>
            <p className="mt-1 text-sm text-slate-500">Try adjusting your filters or search terms.</p>
            <button
              onClick={clearFilters}
              className="mt-4 rounded-full bg-accent px-5 py-2 text-sm font-semibold text-white shadow-sm transition-all hover:bg-accent/90 hover:shadow-md"
            >
              Clear all filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 sm:gap-8">
            {filteredProperties.map((property) => (
              <PropertyListingCard key={property.slug} property={property} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default PropertyOverview;
