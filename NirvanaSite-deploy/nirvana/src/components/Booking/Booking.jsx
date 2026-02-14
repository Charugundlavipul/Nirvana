import React, { useState, useEffect } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { fetchPropertyCards } from "../../lib/contentApi";
import { FaBed, FaBath, FaUsers, FaChevronRight, FaMapMarkerAlt } from 'react-icons/fa';

const Booking = () => {
  const navigate = useNavigate();
  const { slug } = useParams();
  const [properties, setProperties] = useState([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

  useEffect(() => {
    const loadProperties = async () => {
      try {
        const cards = await fetchPropertyCards();
        setProperties(cards);
      } catch (error) {
        console.error("Error loading booking properties:", error);
      }
    };
    loadProperties();
  }, []);

  useEffect(() => {
    if (!properties.length) return;
    if (!slug) {
      setSelectedPropertyId(null);
      return;
    }
    const matched = properties.find((item) => item.slug === slug);
    if (matched) {
      setSelectedPropertyId(matched.bookingPropertyId);
    }
  }, [slug, properties]);

  const handlePropertySelect = (bookingPropertyId) => {
    const selected = properties.find((item) => item.bookingPropertyId === bookingPropertyId);
    if (!selected) return;

    setIsTransitioning(true);
    setTimeout(() => {
      navigate(`/book/${selected.slug}`);
      setSelectedPropertyId(bookingPropertyId);
      setIsTransitioning(false);
    }, 200);
  };

  const getBookingUrl = () => {
    const property = properties.find((p) => p.bookingPropertyId === selectedPropertyId);
    return property ? property.bookingUrl : "";
  };

  const selectedProperty = properties.find((p) => p.bookingPropertyId === selectedPropertyId);

  return (
    <div className="flex min-h-screen flex-col bg-gray-100 lg:flex-row">

      {/* Left Sidebar - Property Selection */}
      <div className="z-20 flex w-full flex-col border-r border-gray-200 bg-white pt-20 shadow-2xl lg:w-[360px] lg:pt-24 xl:w-[400px]">

        {/* Header */}
        <div className="px-6 pb-5 border-b border-gray-100">
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Book Your Stay</h1>
          <p className="text-gray-500 mt-1 text-sm">Select your luxury escape below</p>
        </div>

        {/* Property List */}
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto p-4">
          {properties.length === 0 ? (
            <div className="space-y-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="animate-pulse bg-gray-100 rounded-xl h-24"></div>
              ))}
            </div>
          ) : (
            properties.map((property) => (
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
                  {/* Image */}
                  <div className="w-20 h-20 rounded-lg overflow-hidden flex-shrink-0 bg-gray-200">
                    <img
                      src={property.image}
                      alt={property.title}
                      className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500"
                    />
                  </div>

                  {/* Details */}
                  <div className="flex-1 min-w-0 flex flex-col justify-between py-0.5">
                    <div>
                      <h3 className={`font-bold text-base truncate transition-colors ${selectedPropertyId === property.bookingPropertyId ? 'text-accent' : 'text-gray-900 group-hover:text-accent'}`}>
                        {property.title}
                      </h3>
                      <p className="text-xs text-gray-500 uppercase tracking-wider mt-0.5">{property.location}</p>
                    </div>
                    <div className="flex items-center gap-3 text-xs text-gray-400 mt-1">
                      <span className="flex items-center gap-1"><FaBed /> {property.bedroom_count}</span>
                      <span className="flex items-center gap-1"><FaBath /> {property.bathroom_count}</span>
                      <span className="flex items-center gap-1"><FaUsers /> {property.guests_max}</span>
                    </div>
                  </div>

                  {/* Arrow */}
                  <div className={`flex items-center transition-all duration-300 ${selectedPropertyId === property.bookingPropertyId ? 'text-accent' : 'text-gray-300 group-hover:text-accent group-hover:translate-x-1'}`}>
                    <FaChevronRight size={14} />
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer CTA */}
        <div className="p-4 border-t border-gray-100 bg-gray-50/80">
          <p className="text-xs text-gray-500 text-center">
            Need help? <a href="/contact" className="text-accent font-semibold hover:underline">Contact us</a>
          </p>
        </div>
      </div>

      {/* Right Content - Booking Widget or Hero */}
      <div className={`relative flex min-h-[70vh] flex-1 flex-col transition-opacity duration-300 ${isTransitioning ? 'opacity-50' : 'opacity-100'}`}>

        {!selectedPropertyId ? (
          /* Empty State - Immersive Hero */
          <div className="h-full w-full relative hidden lg:flex items-center justify-center">
            {/* Background Collage */}
            <div className="absolute inset-0 grid grid-cols-2 grid-rows-2">
              {properties.slice(0, 4).map((property, idx) => (
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

            {/* Overlay Content */}
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
        ) : !getBookingUrl() ? (
          /* Missing Booking URL */
          <div className="flex items-center justify-center h-full text-white p-8 bg-gray-800">
            <div className="text-center">
              <div className="w-20 h-20 bg-gray-700 rounded-full flex items-center justify-center mx-auto mb-6">
                <span className="text-3xl">⚠️</span>
              </div>
              <h3 className="text-2xl font-bold mb-2">Booking Unavailable</h3>
              <p className="text-gray-400 max-w-md">This property's booking system is currently being configured. Please contact us for assistance.</p>
            </div>
          </div>
        ) : (
          /* Booking Widget with Property Header */
          <div className="w-full bg-gray-50">

            {/* Property Hero Header */}
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
                  <span className="flex items-center gap-1"><FaBed /> {selectedProperty?.bedroom_count} beds</span>
                  <span className="flex items-center gap-1"><FaBath /> {selectedProperty?.bathroom_count} baths</span>
                  <span className="flex items-center gap-1"><FaUsers /> Up to {selectedProperty?.guests_max} guests</span>
                </div>
              </div>
            </div>

            {/* Booking Widget Container */}
            <div className="w-full overflow-x-auto p-2 sm:p-4 lg:p-6">
              <div className="mx-auto w-fit overflow-hidden rounded-2xl border border-gray-100 bg-white shadow-xl">
                <iframe
                  src={getBookingUrl()}
                  title="Booking Widget"
                  className="block border-0"
                  style={{ width: "340px", height: "640px" }}
                  referrerPolicy="origin"
                  sandbox="allow-scripts allow-forms allow-same-origin allow-popups allow-popups-to-escape-sandbox allow-top-navigation allow-target-blank"
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
