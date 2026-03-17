'use client';

import React, { useEffect, useState } from "react";
import PropertyListingCard from "./PropertyListingCard";
import { FaSearch, FaMapMarkerAlt, FaUserFriends, FaBed, FaPaw } from 'react-icons/fa';

const PropertyOverview = ({ initialProperties = [] }) => {
  const [properties, setProperties] = useState(initialProperties);
  const [filteredProperties, setFilteredProperties] = useState(initialProperties);
  const [searchLocation, setSearchLocation] = useState("");
  const [guests, setGuests] = useState("");
  const [bedrooms, setBedrooms] = useState("");
  const [petFriendly, setPetFriendly] = useState(false);

  useEffect(() => {
    setProperties(initialProperties);
    setFilteredProperties(initialProperties);
  }, [initialProperties]);

  const handleSearch = () => {
    let results = [...properties];

    if (searchLocation) {
      results = results.filter((property) =>
        property.location?.toLowerCase().includes(searchLocation.toLowerCase()) ||
        property.title?.toLowerCase().includes(searchLocation.toLowerCase())
      );
    }

    if (guests) {
      results = results.filter((property) => property.guests_max >= parseInt(guests, 10));
    }

    if (bedrooms) {
      results = results.filter((property) => property.bedroom_count >= parseInt(bedrooms, 10));
    }

    if (petFriendly) {
      results = results.filter((property) => property.pet_friendly);
    }

    setFilteredProperties(results);
  };

  const clearFilters = () => {
    setSearchLocation("");
    setGuests("");
    setBedrooms("");
    setPetFriendly(false);
    setFilteredProperties(properties);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-50 to-slate-100 pb-20 pt-24 font-sans text-slate-800">
      <div className="mx-auto mb-8 max-w-7xl px-6 sm:px-8 md:px-12">
        <div className="rounded-3xl border border-slate-200 bg-white p-6 md:p-8 shadow-lg">
          <div className="mb-6">
            <p className="text-xs font-semibold uppercase tracking-[0.15em] text-accent">Nirvana Luxe Collection</p>
            <h1 className="mt-2 text-2xl font-extrabold tracking-tight text-slate-900 md:text-4xl">
              Discover Your Next Stay
            </h1>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-2 shadow-inner">
            <div className="flex flex-col lg:flex-row lg:items-center gap-2">
              <div className="flex-1 group">
                <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-transparent hover:border-accent/30 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaMapMarkerAlt className="text-accent text-lg flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Where</label>
                    <input
                      type="text"
                      placeholder="Search destinations..."
                      value={searchLocation}
                      onChange={(e) => setSearchLocation(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 placeholder-slate-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="hidden lg:block w-px h-10 bg-slate-200"></div>

              <div className="flex-shrink-0 w-full lg:w-40">
                <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-transparent hover:border-accent/30 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaUserFriends className="text-accent text-lg flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Guests</label>
                    <select
                      value={guests}
                      onChange={(e) => setGuests(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none cursor-pointer appearance-none"
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

              <div className="hidden lg:block w-px h-10 bg-slate-200"></div>

              <div className="flex-shrink-0 w-full lg:w-40">
                <div className="flex items-center gap-3 rounded-xl bg-white px-4 py-3 border border-transparent hover:border-accent/30 transition-colors focus-within:border-accent focus-within:ring-2 focus-within:ring-accent/20">
                  <FaBed className="text-accent text-lg flex-shrink-0" />
                  <div className="flex-1">
                    <label className="block text-[10px] font-bold uppercase tracking-wider text-slate-400">Bedrooms</label>
                    <select
                      value={bedrooms}
                      onChange={(e) => setBedrooms(e.target.value)}
                      className="w-full bg-transparent text-sm font-medium text-slate-900 focus:outline-none cursor-pointer appearance-none"
                    >
                      <option value="">Any</option>
                      <option value="2">2+ beds</option>
                      <option value="3">3+ beds</option>
                      <option value="4">4+ beds</option>
                      <option value="5">5+ beds</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="flex-shrink-0">
                <button
                  onClick={() => setPetFriendly(!petFriendly)}
                  className={`flex items-center gap-2 rounded-xl px-4 py-4 border transition-all ${petFriendly
                      ? 'bg-accent/10 border-accent text-accent'
                      : 'bg-white border-transparent text-slate-400 hover:border-accent/30'
                    }`}
                >
                  <FaPaw className="text-lg" />
                  <span className="text-xs font-bold uppercase tracking-wider hidden sm:inline">Pets</span>
                </button>
              </div>

              <button
                onClick={handleSearch}
                className="flex items-center justify-center gap-2 rounded-xl bg-accent px-6 py-4 text-white font-bold shadow-lg hover:bg-accent/90 hover:shadow-xl transition-all active:scale-95"
              >
                <FaSearch />
                <span className="hidden sm:inline">Search</span>
              </button>
            </div>
          </div>

          <div className="mt-5 flex flex-wrap items-center justify-between gap-4">
            <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-slate-100 px-3 py-1.5 font-medium">
                <span className="font-bold text-slate-900">{filteredProperties.length}</span> of {properties.length} properties
              </span>
              {(searchLocation || guests || bedrooms || petFriendly) && (
                <button onClick={clearFilters} className="text-accent hover:underline font-semibold">
                  Clear filters
                </button>
              )}
            </div>
            <div className="hidden md:flex items-center gap-3 text-xs text-slate-500">
              <span className="rounded-full bg-accent/10 text-accent px-3 py-1.5 font-semibold">Direct booking</span>
              <span className="rounded-full bg-slate-100 px-3 py-1.5">Premium locations</span>
            </div>
          </div>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-6 sm:px-8 md:px-12">
        {filteredProperties.length === 0 ? (
          <div className="flex flex-col h-64 items-center justify-center rounded-2xl border border-slate-200 bg-white text-slate-500">
            <span className="text-4xl mb-4">Home</span>
            <p className="font-medium">No properties match your criteria</p>
            <button onClick={clearFilters} className="mt-2 text-accent hover:underline text-sm font-semibold">
              Clear filters
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3">
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
