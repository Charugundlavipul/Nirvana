'use client';

import React, { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { FaBed, FaBath, FaUsers, FaChevronRight, FaMapMarkerAlt, FaSearch } from 'react-icons/fa';
import AvailabilityCalendar from '../common/AvailabilityCalendar';
import { getCompactBathroomSummary } from '../../lib/bathrooms';

const MOBILE_BREAKPOINT = 1024;
const MOBILE_PROPERTIES_PER_PAGE = 4;
const DESKTOP_PROPERTIES_PER_PAGE = 5;
const MOBILE_SCROLL_STORAGE_KEY = "booking-mobile-scroll-target";

const Booking = ({ initialProperties = [], initialSlug = null }) => {
  const router = useRouter();
  const getSelectedPropertyIdFromSlug = (slug) => {
    if (!slug) return null;
    const matched = initialProperties.find((item) => item.slug === slug);
    return matched ? matched.bookingPropertyId : null;
  };

  const [selectedPropertyId, setSelectedPropertyId] = useState(() => getSelectedPropertyIdFromSlug(initialSlug));
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isMobile, setIsMobile] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const bookingPanelRef = useRef(null);
  const shouldScrollToWidgetRef = useRef(false);

  useEffect(() => {
    setSelectedPropertyId(getSelectedPropertyIdFromSlug(initialSlug));
  }, [initialSlug, initialProperties]);

  useEffect(() => {
    const syncViewport = () => {
      setIsMobile(window.innerWidth < MOBILE_BREAKPOINT);
    };

    syncViewport();
    window.addEventListener("resize", syncViewport);
    return () => window.removeEventListener("resize", syncViewport);
  }, []);

  const handlePropertySelect = (bookingPropertyId) => {
    const selected = initialProperties.find((item) => item.bookingPropertyId === bookingPropertyId);
    if (!selected) return;

    if (selectedPropertyId === bookingPropertyId) {
      if (isMobile) {
        shouldScrollToWidgetRef.current = true;
        window.sessionStorage.setItem(MOBILE_SCROLL_STORAGE_KEY, selected.slug);
        bookingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    setIsTransitioning(true);
    if (isMobile) {
      shouldScrollToWidgetRef.current = true;
      window.sessionStorage.setItem(MOBILE_SCROLL_STORAGE_KEY, selected.slug);
    }

    setTimeout(() => {
      router.push(`/book/${selected.slug}`, { scroll: false });
      setSelectedPropertyId(bookingPropertyId);
      setIsTransitioning(false);
    }, 200);
  };

  const selectedProperty = initialProperties.find((item) => item.bookingPropertyId === selectedPropertyId);
  const normalizedSearchQuery = searchQuery.trim().toLowerCase();

  const filteredProperties = initialProperties.filter((property) => {
    if (!normalizedSearchQuery) return true;
    return (property.title || "").toLowerCase().includes(normalizedSearchQuery) || (property.location || "").toLowerCase().includes(normalizedSearchQuery);
  });

  const propertiesPerPage = isMobile ? MOBILE_PROPERTIES_PER_PAGE : DESKTOP_PROPERTIES_PER_PAGE;
  const totalPages = Math.max(1, Math.ceil(filteredProperties.length / propertiesPerPage));
  const visiblePage = Math.min(currentPage, Math.max(totalPages - 1, 0));
  const pageStart = visiblePage * propertiesPerPage;
  const visibleProperties = filteredProperties.slice(pageStart, pageStart + propertiesPerPage);

  useEffect(() => {
    setCurrentPage(0);
  }, [searchQuery]);

  useEffect(() => {
    setCurrentPage((page) => Math.min(page, Math.max(totalPages - 1, 0)));
  }, [totalPages]);

  useEffect(() => {
    if (!selectedPropertyId) return;

    const selectedIndex = initialProperties
      .filter((property) => {
        if (!normalizedSearchQuery) return true;
        return (property.title || "").toLowerCase().includes(normalizedSearchQuery) || (property.location || "").toLowerCase().includes(normalizedSearchQuery);
      })
      .findIndex(
      (property) => property.bookingPropertyId === selectedPropertyId
    );

    if (selectedIndex === -1) return;

    const nextPage = Math.floor(selectedIndex / propertiesPerPage);
    setCurrentPage((page) => (page === nextPage ? page : nextPage));
  }, [initialProperties, normalizedSearchQuery, propertiesPerPage, selectedPropertyId]);

  useEffect(() => {
    if (!isMobile || !selectedProperty?.slug) return;

    const pendingSlug = window.sessionStorage.getItem(MOBILE_SCROLL_STORAGE_KEY);
    if (!shouldScrollToWidgetRef.current && pendingSlug !== selectedProperty.slug) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      bookingPanelRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
      shouldScrollToWidgetRef.current = false;
      window.sessionStorage.removeItem(MOBILE_SCROLL_STORAGE_KEY);
    }, 75);

    return () => window.clearTimeout(timeoutId);
  }, [isMobile, selectedProperty?.slug]);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 lg:flex-row">
      <div className="z-20 flex w-full flex-col border-r border-gray-200 bg-white pt-24 shadow-2xl lg:w-[360px] lg:pt-24 xl:w-[400px]">
        <div className="px-6 pb-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Book Your Stay</h1>
          <p className="text-gray-500 mt-1 text-sm">Select your luxury escape below</p>
          <div className="relative mt-3">
            <FaSearch className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={13} />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search properties..."
              className="w-full rounded-xl border border-gray-200 bg-gray-50 py-2.5 pl-9 pr-4 text-sm text-gray-900 outline-none transition focus:border-accent focus:ring-2 focus:ring-accent/20 placeholder-gray-400"
            />
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-4">
          {initialProperties.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="animate-pulse bg-gray-100 rounded-xl h-24"></div>
              ))}
            </div>
          ) : filteredProperties.length === 0 ? (
            <div className="text-center py-8 text-gray-400 text-sm">No properties match "{searchQuery}"</div>
          ) : (
            <div className="space-y-3">
              {visibleProperties.map((property) => {
                const compactBathroomSummary = getCompactBathroomSummary(property);
                return (
                <div
                  key={property.slug}
                  onClick={() => handlePropertySelect(property.bookingPropertyId)}
                  className={`
                    group cursor-pointer rounded-xl border-2 transition-all duration-300 overflow-hidden
                    ${selectedPropertyId === property.bookingPropertyId
                      ? 'border-accent bg-accent/5 shadow-lg'
                      : 'border-gray-100 hover:border-accent/30 hover:shadow-md bg-white'}
                  `}
                >
                  <div className="flex gap-3 p-3">
                    <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                      <img
                        src={property.image}
                        alt={property.title}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                      />
                    </div>

                    <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                      <div>
                        <h3 className={`font-bold text-base truncate transition-colors ${selectedPropertyId === property.bookingPropertyId ? 'text-accent' : 'text-gray-900 group-hover:text-accent'}`}>
                          {property.title}
                        </h3>
                        <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{property.location}</p>
                      </div>
                      <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                        <span className="flex items-center gap-1"><FaBed /> {property.bedroom_count}</span>
                        <span className="flex items-center gap-1"><FaBath /> {compactBathroomSummary || "-"}</span>
                        <span className="flex items-center gap-1"><FaUsers /> {property.guests_max}</span>
                      </div>
                    </div>

                    <div className={`flex items-center transition-all duration-300 ${selectedPropertyId === property.bookingPropertyId ? 'text-accent' : 'text-gray-300 group-hover:text-accent group-hover:translate-x-1'}`}>
                      <FaChevronRight size={14} />
                    </div>
                  </div>
                </div>
                );
              })}

              {totalPages > 1 && (
                <div className="rounded-2xl border border-gray-200 bg-gray-50 px-4 py-3">
                  <div className="flex items-center justify-between gap-3">
                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.max(page - 1, 0))}
                      disabled={visiblePage === 0}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Prev
                    </button>

                    <div className="text-center">
                      <p className="text-xs font-semibold uppercase tracking-[0.2em] text-gray-500">
                        Page {visiblePage + 1} of {totalPages}
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Showing {pageStart + 1}-{Math.min(pageStart + propertiesPerPage, filteredProperties.length)} of {filteredProperties.length}
                      </p>
                    </div>

                    <button
                      type="button"
                      onClick={() => setCurrentPage((page) => Math.min(page + 1, totalPages - 1))}
                      disabled={visiblePage >= totalPages - 1}
                      className="rounded-full border border-gray-200 bg-white px-4 py-2 text-sm font-semibold text-gray-700 transition disabled:cursor-not-allowed disabled:opacity-40"
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="p-4 border-t border-gray-100 bg-gray-50/80">
          <p className="text-xs text-gray-500 text-center">
            Questions about a property? <a href="/contact" className="text-accent font-semibold hover:underline">Contact us</a>
          </p>
        </div>
      </div>

      <div
        ref={bookingPanelRef}
        className={`relative flex min-h-[70vh] flex-1 scroll-mt-24 flex-col transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}
      >
        {!selectedPropertyId ? (
          <div className="h-full w-full relative hidden lg:flex items-center justify-center">
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {initialProperties.slice(0, 4).map((property) => (
                <div key={property.slug} className="relative overflow-hidden">
                  <img
                    src={property.image}
                    alt={property.title}
                    className="w-full h-full object-cover scale-105 hover:scale-110 transition-transform duration-1000"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-gray-900/80 via-gray-900/40 to-gray-900/20"></div>
                </div>
              ))}
            </div>

            <div className="relative z-10 text-center text-white p-12 max-w-2xl">
              <div className="inline-block px-4 py-2 bg-accent/90 rounded-full text-sm font-bold uppercase tracking-widest mb-6">
                Luxury Awaits
              </div>
              <h2 className="text-5xl font-bold mb-6 leading-tight">
                Find Your Perfect<br />Getaway
              </h2>
              <p className="text-xl text-gray-300 mb-8 font-light">
                Select a property from our curated collection to check availability and book your unforgettable stay.
              </p>
              <div className="flex items-center justify-center gap-2 text-gray-400">
                <span className="animate-pulse">←</span>
                <span className="text-sm">Choose a property to begin</span>
              </div>
            </div>
          </div>
        ) : !selectedProperty?.hospitablePropertyId ? (
          <div className="flex items-center justify-center h-full text-white p-8 bg-gray-800">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Booking Unavailable</h3>
              <p className="text-gray-400 max-w-md">This property&apos;s booking system is currently being configured. Please contact us for assistance.</p>
            </div>
          </div>
        ) : (
          <div className="w-full bg-gray-50 flex-1 overflow-y-auto">
            <div className="relative h-48 lg:h-56 overflow-hidden flex-shrink-0">
              <img
                src={selectedProperty?.image}
                alt={selectedProperty?.title}
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-gray-900/90 via-gray-900/50 to-transparent"></div>
              <div className="absolute bottom-0 left-0 right-0 p-6 text-white">
                <div className="flex items-center gap-2 text-accent text-sm mb-2">
                  <FaMapMarkerAlt />
                  <span className="uppercase tracking-wider font-medium">{selectedProperty?.location}</span>
                </div>
                <h2 className="text-3xl font-bold">{selectedProperty?.title}</h2>
                <div className="flex items-center gap-4 mt-2 text-sm text-gray-300">
                  <span className="flex items-center gap-1"><FaBed /> {selectedProperty?.bedroom_count} {selectedProperty?.bedroom_count === 1 ? 'bdrm' : 'bdrms'}</span>
                  {selectedProperty?.bed_count > 0 && (
                    <span className="flex items-center gap-1"><FaBed /> {selectedProperty?.bed_count} {selectedProperty?.bed_count === 1 ? 'bed' : 'beds'}</span>
                  )}
                  <span className="flex items-center gap-1"><FaBath /> {getCompactBathroomSummary(selectedProperty) || "-"}</span>
                  <span className="flex items-center gap-1"><FaUsers /> Up to {selectedProperty?.guests_max} guests</span>
                </div>
              </div>
            </div>

            <div className="w-full p-4 lg:p-8 pb-32">
              <div className="mx-auto w-full max-w-6xl">
                <AvailabilityCalendar
                  propertyId={selectedProperty.hospitablePropertyId}
                  maxGuests={selectedProperty.guests_max}
                />
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Booking;
