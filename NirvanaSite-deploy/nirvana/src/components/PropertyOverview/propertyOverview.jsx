'use client';

import React, { useEffect, useState, useRef } from "react";
import PropertyListingCard from "./PropertyListingCard";
import CustomSelect from "../common/CustomSelect";
import CustomDatePicker from "../common/CustomDatePicker";
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
      <section className="hero-section relative overflow-hidden bg-white px-4 pb-4 pt-28 sm:px-6 sm:pb-4 sm:pt-28 md:pb-6 md:pt-28 border-b border-slate-100">
        {/* Decorative shapes */}
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute -right-24 -top-24 h-72 w-72 rounded-full bg-accent/5 sm:h-[400px] sm:w-[400px]"></div>
          <div className="absolute -bottom-32 -left-32 h-80 w-80 rounded-full bg-emerald-50 sm:h-[420px] sm:w-[420px]"></div>
          <div className="absolute right-1/4 top-1/3 h-32 w-32 rounded-full bg-amber-50/60 blur-2xl"></div>
        </div>
        <div className="absolute inset-x-0 bottom-0 h-px bg-gradient-to-r from-transparent via-slate-200 to-transparent"></div>

        <div className="relative z-10 mx-auto max-w-4xl text-center">
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-accent/20 bg-accent/5 px-4 py-1.5">
            <FaMapMarkerAlt className="text-accent text-xs" />
            <span className="text-xs font-semibold uppercase tracking-[0.12em] text-accent">NIRVANA LUXE VACATION RENTALS</span>
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl md:text-5xl">
            Discover Your Next Luxury Vacation Rental
          </h1>
          <p className="mx-auto mt-2 max-w-2xl text-sm text-slate-500 sm:text-base">
            Browse handpicked luxury vacation rentals — from lakefront homes on Lake Norman and Lake Wylie to cabin rentals in Sevierville — all available for direct booking.
          </p>
        </div>
      </section>

      {/* Search Section */}
      <div className="mx-auto max-w-6xl px-4 sm:px-6 md:px-8 pt-8 pb-6">
        <div className="rounded-3xl md:rounded-[4rem] border border-slate-200 bg-white shadow-[0_8px_30px_rgb(0,0,0,0.04)] md:p-2 flex flex-col md:flex-row md:items-center divide-y md:divide-y-0 md:divide-x divide-slate-200 transition-all">
          
          {/* Where */}
          <div className="relative flex-[1.5] px-5 py-4 md:py-3 md:px-8 hover:bg-slate-50 rounded-t-3xl md:rounded-l-[3rem] md:rounded-tr-none transition-colors cursor-text focus-within:bg-slate-50 group">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 group-hover:text-accent transition-colors">Where</label>
            <input
              ref={inputRef}
              type="text"
              placeholder="Search destinations..."
              value={searchLocation}
              onChange={(event) => { setSearchLocation(event.target.value); setShowDropdown(true); }}
              onFocus={() => setShowDropdown(true)}
              className="w-full bg-transparent text-sm md:text-base font-semibold text-slate-900 placeholder-slate-400 focus:outline-none truncate"
            />
            {showDropdown && dropdownSuggestions.length > 0 && (
              <div
                ref={dropdownRef}
                className="absolute top-full left-0 right-0 md:left-4 md:right-auto md:w-[350px] mt-4 bg-white rounded-3xl shadow-[0_10px_40px_rgb(0,0,0,0.1)] border border-slate-100 py-3 max-h-80 overflow-y-auto z-50"
                onMouseDown={(e) => e.stopPropagation()}
              >
                {dropdownSuggestions.map((property) => (
                  <button
                    key={property.id || property.slug}
                    onClick={() => {
                      setSearchLocation(property.title || property.name || '');
                      setShowDropdown(false);
                    }}
                    className="w-full text-left px-5 py-3 hover:bg-slate-50 transition-colors flex items-center gap-4"
                  >
                    {(property.primary_image || property.image) && (
                      <img src={property.primary_image || property.image} alt="" className="w-12 h-12 rounded-xl object-cover flex-shrink-0 shadow-sm" />
                    )}
                    <div className="min-w-0">
                      <p className="text-sm font-bold text-slate-900 truncate">{property.title || property.name}</p>
                      {property.location && <p className="text-xs text-slate-500 truncate mt-0.5">{property.location}</p>}
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Check In */}
          <div className="flex-1 px-5 py-4 md:py-3 md:px-6 hover:bg-slate-50 transition-colors cursor-text focus-within:bg-slate-50 group z-[45]">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 group-hover:text-accent transition-colors">Check In</label>
            <CustomDatePicker
              value={checkInDate}
              onChange={handleCheckInChange}
              minDate={todayString}
              placeholder="Add dates"
            />
          </div>

          {/* Check Out */}
          <div className="flex-1 px-5 py-4 md:py-3 md:px-6 hover:bg-slate-50 transition-colors cursor-text focus-within:bg-slate-50 group z-[44]">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 group-hover:text-accent transition-colors">Check Out</label>
            <CustomDatePicker
              value={checkOutDate}
              onChange={setCheckOutDate}
              minDate={checkInDate || todayString}
              placeholder="Add dates"
            />
          </div>

          {/* Guests */}
          <div className="flex-1 px-5 py-4 md:py-3 md:px-6 hover:bg-slate-50 transition-colors cursor-pointer focus-within:bg-slate-50 group z-[43]">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 group-hover:text-accent transition-colors">Guests</label>
            <CustomSelect
              value={guests}
              onChange={setGuests}
              placeholder="Any"
              options={[
                { value: "", label: "Any" },
                { value: "2", label: "2+ guests" },
                { value: "4", label: "4+ guests" },
                { value: "6", label: "6+ guests" },
                { value: "8", label: "8+ guests" },
                { value: "10", label: "10+ guests" }
              ]}
            />
          </div>

          {/* Bedrooms */}
          <div className="flex-1 px-5 py-4 md:py-3 md:px-6 hover:bg-slate-50 transition-colors cursor-pointer focus-within:bg-slate-50 group z-[42]">
            <label className="block text-[10px] font-extrabold uppercase tracking-widest text-slate-500 mb-1 group-hover:text-accent transition-colors">Bedrooms</label>
            <CustomSelect
              value={bedrooms}
              onChange={setBedrooms}
              placeholder="Any"
              options={[
                { value: "", label: "Any" },
                { value: "3", label: "3+ bdrms" },
                { value: "4", label: "4+ bdrms" },
                { value: "5", label: "5+ bdrms" },
                { value: "6", label: "6+ bdrms" },
                { value: "7", label: "7+ bdrms" },
                { value: "8", label: "8+ bdrms" }
              ]}
            />
          </div>

          {/* Search Button */}
          <div className="p-3 shrink-0 md:ml-1 rounded-b-3xl md:rounded-b-none md:rounded-r-[3rem] hover:bg-slate-50 transition-colors">
            <button
              onClick={handleSearch}
              disabled={isSearching}
              className="w-full md:w-16 md:h-16 flex items-center justify-center gap-3 rounded-full bg-accent py-4 md:py-0 font-bold text-white shadow-lg shadow-accent/30 transition-all hover:bg-accent/90 hover:scale-105 active:scale-95 disabled:cursor-not-allowed disabled:opacity-70"
            >
              <FaSearch className="text-xl" />
              <span className="md:hidden">Search Properties</span>
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
