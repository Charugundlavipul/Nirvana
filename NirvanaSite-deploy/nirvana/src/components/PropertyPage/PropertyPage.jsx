'use client';

import React, { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { FaArrowLeft, FaArrowRight, FaTimes, FaBed, FaBath, FaUsers, FaMapMarkerAlt, FaStar, FaHiking, FaComments, FaChevronDown, FaPlay } from 'react-icons/fa';
import { getAmenityIcon } from '../../lib/amenityIcons.jsx';
import { createRichTextExcerpt } from '../../lib/richText';
import RichTextContent from '../common/RichTextContent';
import AvailabilityCalendar from '../common/AvailabilityCalendar';
import InlineReviews from './InlineReviews';
import InlineActivities from './InlineActivities';
import ContactForm from '../Contact/ContactForm';
import HospitableWidget from '../common/HospitableWidget';
import { getBathroomSummary, normalizeBathroomCounts } from '../../lib/bathrooms';

const PropertyPage = ({ slug, initialBundle = null, initialReviews = [], initialActivities = [] }) => {
    const [lightboxImage, setLightboxImage] = useState(null);
    const [lightboxType, setLightboxType] = useState('');
    const heroRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [isMobile, setIsMobile] = useState(false);
    const [visibleCount, setVisibleCount] = useState(10);

    const property = initialBundle?.property || null;
    const galleryImages = initialBundle?.galleryImages || [];
    const amenities = initialBundle?.amenities || [];
    const curatedImages = initialBundle?.curated || { home: '', bg: '', secondary: '' };

    useEffect(() => {
        const handleScroll = () => {
            if (heroRef.current) {
                const offset = window.pageYOffset;
                heroRef.current.style.backgroundPositionY = `calc(50% + ${offset * 0.4}px)`;
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const handleResize = () => {
            setIsMobile(window.innerWidth <= 768);
        };

        handleResize();
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        window.scrollTo(0, 0);
        setCurrentIndex(0);
        setVisibleCount(10);
    }, [slug]);

    useEffect(() => {
        if (galleryImages.length > 0 && visibleCount < galleryImages.length) {
            const timer = setTimeout(() => {
                setVisibleCount((prev) => Math.min(prev + 10, galleryImages.length));
            }, 500);
            return () => clearTimeout(timer);
        }
    }, [visibleCount, galleryImages.length]);

    const sliderImages = galleryImages;

    // Carousel logic removed for modern gallery grid style

    // Manage body scroll lock
    useEffect(() => {
        if (lightboxImage || lightboxType) {
            document.body.style.overflow = 'hidden';
        } else {
            document.body.style.overflow = '';
        }

        // Cleanup on unmount to ensure scroll is restored
        return () => {
            document.body.style.overflow = '';
        };
    }, [lightboxImage, lightboxType]);

    const openLightbox = (imageSrc, type = '') => {
        setLightboxImage(imageSrc);
        setLightboxType(type);
    };

    const closeLightbox = () => {
        setLightboxImage(null);
        setLightboxType('');
    };

    const nextLightboxImage = (e) => {
        e.stopPropagation();
        const currentIndexInImages = sliderImages.findIndex((img) => img === lightboxImage);
        if (currentIndexInImages !== -1) {
            const nextIndex = (currentIndexInImages + 1) % sliderImages.length;
            setLightboxImage(sliderImages[nextIndex]);
        }
    };

    const prevLightboxImage = (e) => {
        e.stopPropagation();
        const currentIndexInImages = sliderImages.findIndex((img) => img === lightboxImage);
        if (currentIndexInImages !== -1) {
            const prevIndex = (currentIndexInImages - 1 + sliderImages.length) % sliderImages.length;
            setLightboxImage(sliderImages[prevIndex]);
        }
    };

    if (!property) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h2>
                    <p className="text-slate-500 mb-6">The property you're looking for doesn't exist.</p>
                    <Link href="/properties" className="inline-block bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent/90 transition-all">
                        Browse All Properties
                    </Link>
                </div>
            </div>
        );
    }

    const heroImageSrc = curatedImages.bg || curatedImages.home;
    const introImageSrc = curatedImages.secondary || curatedImages.home;
    const descriptionPreview = createRichTextExcerpt(property.description, 2000, true);
    const videoUrl = `${property.video_url || ''}`.trim();
    const bathroomSummary = getBathroomSummary(property);
    const { fullBathCount, halfBathCount } = normalizeBathroomCounts(property);

    return (
        <div className="font-sans text-gray-800 bg-slate-50">
            {/* Hero Section */}
            <section
                className="site-hero site-hero--lg relative w-full overflow-hidden bg-cover bg-center bg-no-repeat"
                ref={heroRef}
                style={{ backgroundImage: `url(${heroImageSrc})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>

                <div
                    className="absolute inset-0 z-10 flex flex-col items-center justify-start px-4 pb-10 text-center text-white sm:px-6 sm:pb-12 md:justify-center"
                    style={{ paddingTop: 'var(--site-header-height)' }}
                >
                    <p className="mb-3 text-[11px] font-semibold uppercase tracking-[0.22em] text-accent sm:mb-4 sm:text-sm sm:tracking-[0.3em]">Luxury Retreat</p>
                    <h1 className="mb-3 max-w-4xl text-4xl font-bold leading-none drop-shadow-lg sm:text-5xl sm:leading-tight md:mb-4 md:text-7xl">{property.name}</h1>

                    <div className="mb-5 flex items-center gap-2 sm:mb-6">
                        <FaMapMarkerAlt className="text-accent" />
                        <span className="text-lg font-light tracking-wide sm:text-xl">{property.location}</span>
                    </div>

                    {/* Property Stats */}
                    <div className="mb-6 flex max-w-3xl flex-wrap justify-center gap-3 text-white/90 sm:mb-8 sm:gap-4 md:gap-6">
                        {property.bedroom_count > 0 && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaBed className="text-accent" />
                                <span>{property.bedroom_count} {property.bedroom_count === 1 ? 'Bedroom' : 'Bedrooms'}</span>
                            </div>
                        )}
                        {property.bed_count > 0 && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaBed className="text-accent" />
                                <span>{property.bed_count} {property.bed_count === 1 ? 'Bed' : 'Beds'}</span>
                            </div>
                        )}
                        {bathroomSummary && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaBath className="text-accent" />
                                <span>{bathroomSummary}</span>
                            </div>
                        )}
                        {property.guests_max && (
                            <div className="flex items-center gap-2 rounded-full bg-white/10 px-4 py-2 text-sm backdrop-blur-sm sm:text-base">
                                <FaUsers className="text-accent" />
                                <span>Up to {property.guests_max} Guests</span>
                            </div>
                        )}
                    </div>

                    <div className="flex w-full max-w-[18rem] flex-col gap-3 sm:w-auto sm:max-w-none sm:flex-row sm:justify-center sm:gap-4">
                        <Link
                            href={`/book/${slug}`}
                            className="inline-block bg-accent px-6 py-4 text-base font-bold uppercase tracking-[0.18em] text-white shadow-2xl transition-all hover:bg-accent/90 hover:shadow-accent/30 sm:px-10 sm:text-lg sm:tracking-wider"
                        >
                            Book Your Stay
                        </Link>
                        <Link
                            href={`/${slug}/gallery`}
                            className="inline-flex items-center justify-center gap-2 border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white transition-all backdrop-blur-sm hover:bg-white/20 sm:px-10 sm:text-lg"
                        >
                            <FaPlay size={12} /> View Gallery
                        </Link>
                        {videoUrl && (
                            <a
                                href={videoUrl}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center justify-center gap-2 border border-white/30 bg-white/10 px-6 py-4 text-base font-semibold text-white transition-all backdrop-blur-sm hover:bg-white/20 sm:px-10 sm:text-lg"
                            >
                                <FaPlay size={12} /> Watch Video
                            </a>
                        )}
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 hidden -translate-x-1/2 animate-bounce md:block">
                    <FaChevronDown className="text-white/60 text-2xl" />
                </div>
            </section>

            {/* Property Introduction */}
            <section className="mx-auto max-w-7xl px-4 py-14 sm:px-6 md:px-12 md:py-24">
                <div className="flex flex-col gap-10 md:gap-12 lg:flex-row lg:items-center lg:gap-16">
                    <div className="flex-1 space-y-6 min-w-0 md:space-y-8">
                        <div>
                            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.18em] text-accent sm:text-sm sm:tracking-[0.2em]">About This Property</p>
                            <h2 className="text-3xl font-bold leading-tight text-slate-900 sm:text-4xl md:text-5xl">Welcome to {property.name}</h2>
                        </div>
                        <div>
                            <p className="overflow-hidden text-ellipsis whitespace-pre-line text-base font-light leading-7 text-slate-600 line-clamp-6 sm:text-lg sm:leading-8 md:text-xl md:leading-relaxed md:line-clamp-[12]">
                                {descriptionPreview.text}
                            </p>
                            {(descriptionPreview.text.length > 300 || descriptionPreview.isTruncated) && (
                                <button
                                    type="button"
                                    onClick={() => openLightbox(null, 'description')}
                                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 px-5 py-2 text-sm font-semibold text-accent transition-colors hover:bg-accent hover:text-white"
                                >
                                    Read more
                                </button>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-2 gap-4 border-t border-slate-200 pt-5 sm:gap-5 md:grid-cols-5 md:gap-4 md:pt-6">
                            <div className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-2xl font-bold text-accent sm:text-3xl">
                                  {property.bedroom_count || '-'}
                                </p>
                                <p className="text-[10px] md:text-xs uppercase tracking-[0.05em] md:tracking-[0.08em] text-slate-500 whitespace-nowrap">Bedrooms</p>
                            </div>
                            <div className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-2xl font-bold text-accent sm:text-3xl">
                                  {property.bed_count || '-'}
                                </p>
                                <p className="text-[10px] md:text-xs uppercase tracking-[0.05em] md:tracking-[0.08em] text-slate-500 whitespace-nowrap">Beds</p>
                            </div>
                            <div className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-2xl font-bold text-accent sm:text-3xl">{fullBathCount || '-'}</p>
                                <p className="text-[10px] md:text-xs uppercase tracking-[0.05em] md:tracking-[0.08em] text-slate-500 whitespace-nowrap">Full Baths</p>
                            </div>
                            <div className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-2xl font-bold text-accent sm:text-3xl">{halfBathCount || '-'}</p>
                                <p className="text-[10px] md:text-xs uppercase tracking-[0.05em] md:tracking-[0.08em] text-slate-500 whitespace-nowrap">Half Baths</p>
                            </div>
                            <div className="rounded-2xl bg-white px-2 py-4 text-center shadow-sm ring-1 ring-slate-200/70">
                                <p className="text-2xl font-bold text-accent sm:text-3xl">{property.guests_max || '-'}</p>
                                <p className="text-[10px] md:text-xs uppercase tracking-[0.05em] md:tracking-[0.08em] text-slate-500 whitespace-nowrap">Guests</p>
                            </div>
                        </div>
                    </div>

                    <div className="relative w-full flex-1 group">
                        <div className="absolute -inset-3 rounded-3xl bg-gradient-to-br from-accent/20 to-transparent opacity-0 transition-opacity duration-500 md:-inset-4 group-hover:opacity-100"></div>
                        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                            <img
                                src={introImageSrc}
                                alt="Property Exterior"
                                fetchPriority="high"
                                decoding="async"
                                className="aspect-[4/3] w-full cursor-pointer object-cover transition-transform duration-700 group-hover:scale-105"
                                onClick={() => openLightbox(introImageSrc)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <button
                                onClick={() => openLightbox(introImageSrc)}
                                className="absolute bottom-4 right-4 rounded-full bg-white/90 px-4 py-2 text-sm font-semibold text-slate-900 opacity-100 shadow-md backdrop-blur-sm transition-all duration-300 hover:bg-white md:bottom-6 md:right-6 md:text-base md:opacity-0 group-hover:md:opacity-100"
                            >
                                View Full Image
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Amenities Section */}
            <section className="py-24 bg-white relative">
                <div className="max-w-7xl mx-auto px-6">
                    <div className="text-center mb-16">
                        <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">What We Offer</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Premium Amenities</h2>
                        <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">Everything you need for an unforgettable stay</p>
                    </div>

                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                        {amenities.slice(0, 12).map((amenity) => (
                            <div
                                key={amenity.id}
                                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-white border border-slate-100 hover:bg-accent hover:border-accent transition-all duration-300 cursor-pointer"
                            >
                                <div className="text-4xl text-accent group-hover:text-white transition-colors duration-300">
                                    {getAmenityIcon(amenity.title, amenity.icon_key)}
                                </div>
                                <h4 className="text-sm font-semibold text-slate-700 group-hover:text-white text-center transition-colors duration-300">{amenity.title}</h4>
                            </div>
                        ))}
                    </div>

                    {amenities.length > 12 && (
                        <div className="text-center mt-12">
                            <button
                                className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg hover:shadow-xl"
                                onClick={(e) => { e.preventDefault(); openLightbox(null, 'amenities'); }}
                            >
                                View All {amenities.length} Amenities
                            </button>
                        </div>
                    )}
                </div>
            </section>

            {/* Interactive Availability Calendar */}
            {property.hospitable_property_id && (
                <section className="pt-24 pb-12 px-6 max-w-7xl mx-auto">
                    <div className="text-center mb-16">
                        <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Plan Your Stay</p>
                        <h2 className="text-4xl md:text-5xl font-bold text-slate-900 border-b-2 border-accent/20 pb-4 inline-block mx-auto">Availability Calendar</h2>
                    </div>
                    <AvailabilityCalendar propertyId={property.hospitable_property_id} maxGuests={property.guests_max || 12} />
                </section>
            )}

            {/* Custom Review & Activity Sections */}
            <InlineReviews reviews={initialReviews} />
            <InlineActivities activities={initialActivities} slug={slug} />

            {/* Photo Gallery - Modern Grid Layout */}
            <section id="gallery" className="py-16 md:py-24 bg-white">
                <div className="text-center mb-10 md:mb-16 px-6">
                    <p className="text-accent uppercase tracking-[0.15em] md:tracking-[0.2em] text-xs md:text-sm font-semibold mb-2 md:mb-3">Visual Tour</p>
                    <h2 className="text-3xl md:text-5xl font-bold text-slate-900 mb-3 md:mb-4">Property Gallery</h2>
                    <p className="text-base md:text-xl text-slate-500 max-w-2xl mx-auto font-light">Take a closer look at your future escape</p>
                </div>

                <div className="max-w-7xl mx-auto px-6">
                    {/* Modern Grid (Desktop/Tablet) */}
                    <div className="hidden md:flex gap-4 h-[350px] lg:h-[420px] rounded-[2rem] overflow-hidden shadow-2xl">
                        {/* Main Image (Left, 50%) */}
                        <div 
                            className="w-1/2 relative group cursor-pointer overflow-hidden"
                            onClick={() => openLightbox(sliderImages[0])}
                        >
                            {sliderImages[0] && (
                                <img src={sliderImages[0]} alt="Property Main" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                            )}
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                        </div>

                        {/* 4 Grid Images (Right, 50%) */}
                        {sliderImages.length >= 5 ? (
                            <div className="w-1/2 grid grid-cols-2 grid-rows-2 gap-4">
                                {sliderImages.slice(1, 4).map((imgSrc, idx) => (
                                    <div 
                                        key={idx} 
                                        className="relative group cursor-pointer overflow-hidden"
                                        onClick={() => openLightbox(imgSrc)}
                                    >
                                        <img src={imgSrc} alt={`Property ${idx + 1}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                ))}
                                
                                {/* 5th Image with View All Overlay */}
                                <div 
                                    className="relative group cursor-pointer overflow-hidden"
                                    onClick={() => openLightbox(sliderImages[4])}
                                >
                                    <img src={sliderImages[4]} alt="Property 4" loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                    <div className="absolute inset-0 bg-black/40 transition-colors duration-300 group-hover:bg-black/50 flex flex-col items-center justify-center">
                                        <span className="text-white text-3xl font-bold mb-1">+{sliderImages.length - 5 > 0 ? sliderImages.length - 5 : ''}</span>
                                        <span className="text-white/90 text-sm font-semibold uppercase tracking-widest">View All Photos</span>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="w-1/2 flex flex-col gap-4">
                                {sliderImages.slice(1).map((imgSrc, idx) => (
                                    <div 
                                        key={idx} 
                                        className="flex-1 relative group cursor-pointer overflow-hidden"
                                        onClick={() => openLightbox(imgSrc)}
                                    >
                                        <img src={imgSrc} alt={`Property ${idx + 1}`} loading="lazy" className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105" />
                                        <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>

                    {/* Mobile Horizontal Scroll (fallback for small screens) */}
                    <div className="md:hidden flex gap-4 overflow-x-auto snap-x snap-mandatory no-scrollbar pb-6 -mx-6 px-6">
                        {sliderImages.slice(0, visibleCount).map((imgSrc, i) => (
                            <div
                                key={i}
                                className="flex-shrink-0 w-[85vw] h-[60vw] snap-center relative rounded-2xl overflow-hidden shadow-lg cursor-pointer"
                                onClick={() => openLightbox(imgSrc)}
                            >
                                <img src={imgSrc} alt={`Gallery ${i}`} loading="lazy" className="w-full h-full object-cover" />
                                <div className="absolute bottom-3 right-3 bg-black/60 backdrop-blur-md text-white text-xs font-bold px-3 py-1.5 rounded-full">
                                    {i + 1} / {sliderImages.length}
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="text-center mt-10 md:hidden">
                        <button
                            onClick={() => openLightbox(sliderImages[0])}
                            className="inline-flex items-center gap-2 px-8 py-4 bg-slate-900 text-white font-semibold rounded-full hover:bg-slate-800 transition-all shadow-lg text-sm uppercase tracking-widest"
                        >
                            View All Photos
                        </button>
                    </div>
                </div>
            </section>

            {/* Inquire / Contact Section */}
            <section className="py-20 px-6 max-w-7xl mx-auto border-t border-slate-200 bg-slate-50">
                <div className="text-center mb-16">
                    <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Still have questions?</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 border-accent/20 pb-4 inline-block mx-auto mb-4">Inquire About {property.name}</h2>
                </div>
                <ContactForm />
            </section>

            {/* Hospitable Direct Widget (for Google Vacation Rentals listing) */}
            {property.booking_url && (
                <HospitableWidget bookingUrl={property.booking_url} />
            )}

            {/* CTA Section */}
            <section className="site-viewport-section relative overflow-hidden bg-slate-900">
                <div className="absolute inset-0 opacity-30">
                    <img src={heroImageSrc} alt="" className="w-full h-full object-cover" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-r from-slate-900 via-slate-900/90 to-slate-900"></div>

                <div className="relative z-10 max-w-4xl mx-auto text-center px-6">
                    <p className="text-accent uppercase tracking-[0.3em] text-sm font-semibold mb-4">Ready to Experience Luxury?</p>
                    <h2 className="text-4xl md:text-6xl font-bold text-white mb-6">Book {property.name} Today</h2>
                    <p className="text-xl text-slate-300 mb-10 font-light max-w-2xl mx-auto">
                        Create unforgettable memories with your loved ones in this stunning {property.location} retreat.
                    </p>
                    <div className="flex flex-col sm:flex-row gap-4 justify-center">
                        <Link
                            href={`/book/${slug}`}
                            className="inline-block px-12 py-5 bg-accent hover:bg-accent/90 text-white text-lg font-bold uppercase tracking-wider transition-all shadow-2xl"
                        >
                            Book Now
                        </Link>
                        <Link
                            href="/properties"
                            className="inline-block px-12 py-5 bg-transparent border-2 border-white/30 hover:border-white hover:bg-white/10 text-white text-lg font-semibold transition-all"
                        >
                            View Other Properties
                        </Link>
                    </div>
                </div>
            </section>

            {/* Lightbox */}
            {(lightboxImage || lightboxType) && (
                <div className="fixed inset-0 z-[100] bg-black/95 backdrop-blur-xl flex items-center justify-center p-4" onClick={closeLightbox}>
                    <button
                        className="absolute top-6 right-6 text-white/70 hover:text-white p-3 rounded-full hover:bg-white/10 transition-all"
                        onClick={closeLightbox}
                    >
                        <FaTimes size={28} />
                    </button>

                    <div className="relative max-w-6xl max-h-screen p-2" onClick={(e) => e.stopPropagation()}>
                        {lightboxType === 'description' ? (
                            <div className="bg-white rounded-3xl p-8 md:p-12 max-w-4xl max-h-[85vh] overflow-y-auto">
                                <div className="text-center mb-8">
                                    <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-2">About This Property</p>
                                    <h3 className="text-4xl font-bold text-slate-900">{property.name}</h3>
                                </div>
                                <RichTextContent
                                    value={property.description}
                                    className="text-slate-700 leading-relaxed text-base md:text-lg [&_p]:mb-4 [&_ul]:mb-4 [&_ul]:list-disc [&_ul]:pl-6 [&_ol]:mb-4 [&_ol]:list-decimal [&_ol]:pl-6 [&_li]:mb-2 [&_h2]:mb-3 [&_h2]:mt-6 [&_h2]:text-2xl [&_h2]:font-bold [&_h3]:mb-2 [&_h3]:mt-5 [&_h3]:text-xl [&_h3]:font-semibold [&_blockquote]:mb-4 [&_blockquote]:border-l-4 [&_blockquote]:border-accent/30 [&_blockquote]:pl-4 [&_blockquote]:italic [&_a]:text-accent [&_a]:underline"
                                />
                            </div>
                        ) : lightboxType === 'amenities' ? (
                            <div className="bg-white rounded-3xl p-8 md:p-12 max-w-5xl max-h-[85vh] overflow-y-auto">
                                <div className="text-center mb-10">
                                    <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-2">Complete List</p>
                                    <h3 className="text-4xl font-bold text-slate-900">All Amenities</h3>
                                </div>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    {amenities.map((amenity) => (
                                        <div key={amenity.id} className="flex items-start gap-4 p-4 rounded-xl bg-slate-50 hover:bg-accent/5 transition-colors">
                                            <div className="text-2xl text-accent mt-0.5">
                                                {getAmenityIcon(amenity.title, amenity.icon_key)}
                                            </div>
                                            <div>
                                                <h4 className="font-bold text-slate-900">{amenity.title}</h4>
                                                {amenity.description && <p className="text-sm text-slate-500 mt-1">{amenity.description}</p>}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        ) : lightboxImage ? (
                            <div className="relative flex items-center justify-center">
                                <button
                                    className="absolute -left-20 text-white/50 hover:text-white transition-colors p-4 hidden md:block hover:bg-white/10 rounded-full"
                                    onClick={prevLightboxImage}
                                >
                                    <FaArrowLeft size={32} />
                                </button>
                                <div className="bg-transparent relative w-full h-[85vh] flex items-center justify-center">
                                <img
                                    src={lightboxImage}
                                    alt="Property Image"
                                    loading="lazy"
                                    className="w-full h-auto max-h-[85vh] object-contain rounded-2xl"
                                />
                                </div>
                                <button
                                    className="absolute -right-20 text-white/50 hover:text-white transition-colors p-4 hidden md:block hover:bg-white/10 rounded-full"
                                    onClick={nextLightboxImage}
                                >
                                    <FaArrowRight size={32} />
                                </button>
                            </div>
                        ) : null}
                    </div>
                </div>
            )}
        </div>
    );
};

export default PropertyPage;
