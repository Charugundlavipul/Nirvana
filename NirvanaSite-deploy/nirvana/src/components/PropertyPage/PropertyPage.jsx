import React, { useState, useEffect, useRef } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaArrowLeft, FaArrowRight, FaTimes, FaBed, FaBath, FaUsers, FaMapMarkerAlt, FaStar, FaHiking, FaComments, FaChevronDown, FaPlay } from 'react-icons/fa';
import { getAmenityIcon } from '../../lib/amenityIcons.jsx';
import { fetchPropertyBundleBySlug } from '../../lib/contentApi';
import { createRichTextExcerpt } from '../../lib/richText';
import RichTextContent from '../common/RichTextContent';

const PropertyPage = () => {
    const { slug } = useParams();
    const [loading, setLoading] = useState(true);
    const [property, setProperty] = useState(null);
    const [lightboxImage, setLightboxImage] = useState(null);
    const [lightboxType, setLightboxType] = useState('');
    const heroRef = useRef(null);
    const [currentIndex, setCurrentIndex] = useState(0);
    const [galleryImages, setGalleryImages] = useState([]);
    const [amenities, setAmenities] = useState([]);
    const [curatedImages, setCuratedImages] = useState({ home: '', bg: '', secondary: '' });

    useEffect(() => {
        const loadProperty = async () => {
            setLoading(true);
            try {
                const data = await fetchPropertyBundleBySlug(slug);
                if (data) {
                    setProperty(data.property);
                    setGalleryImages(data.galleryImages || []);
                    setAmenities(data.amenities || []);
                    setCuratedImages({
                        home: data.curated?.home || '',
                        bg: data.curated?.bg || '',
                        secondary: data.curated?.secondary || '',
                    });
                }
            } catch (error) {
                console.error(`Error loading property ${slug}:`, error);
            } finally {
                setLoading(false);
            }
        };
        if (slug) loadProperty();
    }, [slug]);

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
        window.scrollTo(0, 0);
    }, [slug]);

    const sliderImages = galleryImages;

    const getVisibleImages = () => {
        const visible = [];
        const len = sliderImages.length;
        if (!len) return [];
        for (let i = currentIndex - 2; i <= currentIndex + 2; i++) {
            const idx = ((i % len) + len) % len;
            visible.push(sliderImages[idx]);
        }
        return visible;
    };

    const isMobile = typeof window !== 'undefined' && window.innerWidth <= 768;
    const visibleImages = isMobile ? sliderImages : getVisibleImages();

    const scrollLeft = () => {
        if (!sliderImages.length) return;
        setCurrentIndex((prev) => (prev - 1 + sliderImages.length) % sliderImages.length);
    };

    const scrollRight = () => {
        if (!sliderImages.length) return;
        setCurrentIndex((prev) => (prev + 1) % sliderImages.length);
    };

    const openLightbox = (imageSrc, type = '') => {
        setLightboxImage(imageSrc);
        setLightboxType(type);
        document.body.style.overflow = 'hidden';
    };

    const closeLightbox = () => {
        setLightboxImage(null);
        setLightboxType('');
        document.body.style.overflow = 'auto';
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

    if (loading) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="flex flex-col items-center gap-4">
                    <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin"></div>
                    <p className="text-slate-500 font-medium">Loading property...</p>
                </div>
            </div>
        );
    }

    if (!property) {
        return (
            <div className="h-screen flex items-center justify-center bg-slate-50">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-slate-900 mb-2">Property Not Found</h2>
                    <p className="text-slate-500 mb-6">The property you're looking for doesn't exist.</p>
                    <Link to="/properties" className="inline-block bg-accent text-white font-semibold px-6 py-3 rounded-full hover:bg-accent/90 transition-all">
                        Browse All Properties
                    </Link>
                </div>
            </div>
        );
    }

    const heroImageSrc = curatedImages.bg || curatedImages.home;
    const introImageSrc = curatedImages.secondary || curatedImages.home;
    const descriptionPreview = createRichTextExcerpt(property.description, 420);

    return (
        <div className="font-sans text-gray-800 bg-slate-50">
            {/* Hero Section */}
            <section
                className="h-[85vh] w-full relative overflow-hidden bg-cover bg-center bg-no-repeat"
                ref={heroRef}
                style={{ backgroundImage: `url(${heroImageSrc})` }}
            >
                <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-black/40 to-black/70"></div>

                <div className="absolute inset-0 flex flex-col items-center justify-center text-center text-white z-10 px-6">
                    <p className="text-accent uppercase tracking-[0.3em] text-sm font-semibold mb-4">Luxury Retreat</p>
                    <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg">{property.name}</h1>

                    <div className="flex items-center gap-2 mb-6">
                        <FaMapMarkerAlt className="text-accent" />
                        <span className="text-xl font-light tracking-wide">{property.location}</span>
                    </div>

                    {/* Property Stats */}
                    <div className="flex flex-wrap justify-center gap-6 mb-8 text-white/90">
                        {property.bedroom_count && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <FaBed className="text-accent" />
                                <span>{property.bedroom_count} Bedrooms</span>
                            </div>
                        )}
                        {property.bathroom_count && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <FaBath className="text-accent" />
                                <span>{property.bathroom_count} Bathrooms</span>
                            </div>
                        )}
                        {property.guest_count && (
                            <div className="flex items-center gap-2 bg-white/10 backdrop-blur-sm rounded-full px-4 py-2">
                                <FaUsers className="text-accent" />
                                <span>Up to {property.guest_count} Guests</span>
                            </div>
                        )}
                    </div>

                    <div className="flex flex-col sm:flex-row gap-4">
                        <Link
                            to={`/book/${slug}`}
                            className="inline-block px-10 py-4 bg-accent hover:bg-accent/90 text-white text-lg font-bold uppercase tracking-wider transition-all shadow-2xl hover:shadow-accent/30"
                        >
                            Book Your Stay
                        </Link>
                        <button
                            onClick={() => document.getElementById('gallery').scrollIntoView({ behavior: 'smooth' })}
                            className="inline-flex items-center justify-center gap-2 px-10 py-4 bg-white/10 backdrop-blur-sm hover:bg-white/20 text-white text-lg font-semibold border border-white/30 transition-all"
                        >
                            <FaPlay size={12} /> View Gallery
                        </button>
                    </div>
                </div>

                {/* Scroll Indicator */}
                <div className="absolute bottom-8 left-1/2 -translate-x-1/2 animate-bounce">
                    <FaChevronDown className="text-white/60 text-2xl" />
                </div>
            </section>

            {/* Property Introduction */}
            <section className="py-24 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="flex flex-col lg:flex-row items-center gap-16">
                    <div className="flex-1 space-y-8">
                        <div>
                            <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">About This Property</p>
                            <h2 className="text-4xl md:text-5xl font-bold text-slate-900 leading-tight">Welcome to {property.name}</h2>
                        </div>
                        <div>
                            <p className="text-xl text-slate-600 leading-relaxed font-light">{descriptionPreview.text}</p>
                            {descriptionPreview.isTruncated && (
                                <button
                                    type="button"
                                    onClick={() => openLightbox(null, 'description')}
                                    className="mt-4 inline-flex items-center gap-2 rounded-full border border-accent/30 px-5 py-2 text-sm font-semibold text-accent hover:bg-accent hover:text-white transition-colors"
                                >
                                    Read more
                                </button>
                            )}
                        </div>

                        {/* Quick Stats */}
                        <div className="grid grid-cols-3 gap-6 pt-6 border-t border-slate-200">
                            <div className="text-center">
                                <p className="text-3xl font-bold text-accent">{property.bedroom_count || '5'}</p>
                                <p className="text-sm text-slate-500 uppercase tracking-wider">Bedrooms</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-accent">{property.bathroom_count || '4'}</p>
                                <p className="text-sm text-slate-500 uppercase tracking-wider">Bathrooms</p>
                            </div>
                            <div className="text-center">
                                <p className="text-3xl font-bold text-accent">{property.guest_count || '12'}</p>
                                <p className="text-sm text-slate-500 uppercase tracking-wider">Guests</p>
                            </div>
                        </div>
                    </div>

                    <div className="flex-1 w-full relative group">
                        <div className="absolute -inset-4 bg-gradient-to-br from-accent/20 to-transparent rounded-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
                        <div className="relative overflow-hidden rounded-2xl shadow-2xl">
                            <img
                                src={introImageSrc}
                                alt="Property Exterior"
                                className="w-full aspect-[4/3] object-cover cursor-pointer transform group-hover:scale-105 transition-transform duration-700"
                                onClick={() => openLightbox(introImageSrc)}
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                            <button
                                onClick={() => openLightbox(introImageSrc)}
                                className="absolute bottom-6 right-6 bg-white/90 backdrop-blur-sm text-slate-900 font-semibold px-4 py-2 rounded-full opacity-0 group-hover:opacity-100 transition-all duration-300 hover:bg-white"
                            >
                                View Full Image
                            </button>
                        </div>
                    </div>
                </div>
            </section>

            {/* Amenities Section */}
            <section className="py-24 bg-white">
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
                                className="group flex flex-col items-center gap-4 p-6 rounded-2xl bg-slate-50 border border-slate-100 hover:bg-accent hover:border-accent transition-all duration-300 cursor-pointer"
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

            {/* Experience Cards */}
            <section className="py-24 px-6 max-w-7xl mx-auto">
                <div className="text-center mb-16">
                    <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Explore More</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900">Make The Most of Your Stay</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {/* Reviews Card */}
                    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-slate-900 to-slate-800 p-10 text-white min-h-[340px] flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-accent/20 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-accent/20 rounded-2xl flex items-center justify-center mb-6">
                                <FaComments className="text-accent text-2xl" />
                            </div>
                            <h3 className="text-3xl font-bold mb-4">Guest Reviews</h3>
                            <p className="text-slate-300 text-lg leading-relaxed">Discover heartfelt experiences from guests who've stayed here. See why they keep coming back.</p>
                        </div>
                        <Link
                            to={`/review/${slug}`}
                            className="relative z-10 inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-white text-slate-900 font-bold rounded-xl hover:bg-accent hover:text-white transition-all duration-300 group-hover:shadow-lg"
                        >
                            <FaStar className="text-amber-500 group-hover:text-white" />
                            Read Reviews
                            <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>

                    {/* Activities Card */}
                    <div className="group relative overflow-hidden rounded-3xl bg-gradient-to-br from-accent to-emerald-600 p-10 text-white min-h-[340px] flex flex-col justify-between">
                        <div className="absolute top-0 right-0 w-48 h-48 bg-white/10 rounded-full blur-3xl"></div>
                        <div className="relative z-10">
                            <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mb-6">
                                <FaHiking className="text-white text-2xl" />
                            </div>
                            <h3 className="text-3xl font-bold mb-4">Nearby Activities</h3>
                            <p className="text-white/90 text-lg leading-relaxed">From hiking trails to local dining, explore the best activities and hidden gems nearby.</p>
                        </div>
                        <Link
                            to={`/activities/${slug}`}
                            className="relative z-10 inline-flex items-center justify-center gap-2 w-full px-6 py-4 bg-white text-accent font-bold rounded-xl hover:bg-slate-900 hover:text-white transition-all duration-300 group-hover:shadow-lg"
                        >
                            <FaMapMarkerAlt />
                            Explore Activities
                            <FaArrowRight className="ml-2 group-hover:translate-x-1 transition-transform" />
                        </Link>
                    </div>
                </div>
            </section>

            {/* Photo Gallery */}
            <section id="gallery" className="py-24 bg-white overflow-hidden">
                <div className="text-center mb-16 px-6">
                    <p className="text-accent uppercase tracking-[0.2em] text-sm font-semibold mb-3">Visual Tour</p>
                    <h2 className="text-4xl md:text-5xl font-bold text-slate-900 mb-4">Property Gallery</h2>
                    <p className="text-xl text-slate-500 max-w-2xl mx-auto font-light">Take a closer look at your future escape</p>
                </div>

                <div className="relative flex items-center justify-center max-w-[95vw] mx-auto">
                    <button
                        className="absolute left-4 z-20 w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-slate-800 hover:bg-accent hover:text-white hover:scale-110 transition-all hidden md:flex"
                        onClick={scrollLeft}
                    >
                        <FaArrowLeft size={18} />
                    </button>

                    <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-8 px-4 w-full md:justify-center md:overflow-visible">
                        {visibleImages.map((imgSrc, i) => {
                            if (!imgSrc) return null;
                            const isCenter = i === 2;
                            return (
                                <div
                                    key={i}
                                    className={`
                                        flex-shrink-0 relative rounded-2xl overflow-hidden cursor-pointer transition-all duration-500 ease-out
                                        ${isMobile
                                            ? 'w-[80vw] aspect-video shadow-xl'
                                            : (isCenter
                                                ? 'w-[600px] h-[400px] shadow-2xl scale-100 z-10'
                                                : 'w-[200px] h-[150px] opacity-50 hover:opacity-80 grayscale hover:grayscale-0'
                                            )
                                        }
                                    `}
                                    onClick={() => openLightbox(imgSrc)}
                                >
                                    <img src={imgSrc} alt={`Gallery ${i}`} className="w-full h-full object-cover" />
                                    {isCenter && !isMobile && (
                                        <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 hover:opacity-100 transition-opacity duration-300 flex items-end justify-center pb-6">
                                            <span className="text-white font-semibold bg-black/30 backdrop-blur-sm px-4 py-2 rounded-full text-sm">Click to enlarge</span>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>

                    <button
                        className="absolute right-4 z-20 w-14 h-14 bg-white rounded-full shadow-2xl flex items-center justify-center text-slate-800 hover:bg-accent hover:text-white hover:scale-110 transition-all hidden md:flex"
                        onClick={scrollRight}
                    >
                        <FaArrowRight size={18} />
                    </button>
                </div>

                {/* Gallery Navigation Dots */}
                <div className="flex justify-center gap-2 mt-8">
                    {sliderImages.slice(0, 8).map((_, idx) => (
                        <button
                            key={idx}
                            onClick={() => setCurrentIndex(idx)}
                            className={`w-2.5 h-2.5 rounded-full transition-all duration-300 ${currentIndex === idx ? 'bg-accent w-8' : 'bg-slate-300 hover:bg-slate-400'
                                }`}
                        />
                    ))}
                </div>
            </section>

            {/* CTA Section */}
            <section className="relative py-32 bg-slate-900 overflow-hidden">
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
                            to={`/book/${slug}`}
                            className="inline-block px-12 py-5 bg-accent hover:bg-accent/90 text-white text-lg font-bold uppercase tracking-wider transition-all shadow-2xl"
                        >
                            Book Now
                        </Link>
                        <Link
                            to="/properties"
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
                                <img
                                    src={lightboxImage}
                                    alt="Fullscreen"
                                    className="max-h-[85vh] max-w-full rounded-2xl shadow-2xl object-contain"
                                />
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
