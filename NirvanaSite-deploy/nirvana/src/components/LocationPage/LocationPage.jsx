import React, { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { FaMapMarkerAlt, FaStar, FaChevronRight } from 'react-icons/fa';

// SEO Template for Location-Based Landing Pages
// Aimed to rank for: "[Location] luxury vacation rentals", "Cabins in [Location]"

const LocationPage = () => {
    const { locationSlug } = useParams();
    
    // In a real implementation, you would fetch these based on the locationSlug.
    // Here we provide placeholder fallbacks to demonstrate the SEO-rich structure.
    const locationName = locationSlug ? locationSlug.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ') : "The Mountains";
    const description = `Experience the ultimate luxury mountain escape in the heart of ${locationName}.`;
    const properties = []; // Replace with API call to get properties for this location
    
    // Dynamic SEO update for Client-Side Rendering
    useEffect(() => {
        document.title = `Luxury Cabins & Vacation Rentals in ${locationName} | NirvanaLuxe`;
        
        let metaDescription = document.querySelector('meta[name="description"]');
        if (!metaDescription) {
            metaDescription = document.createElement('meta');
            metaDescription.name = "description";
            document.head.appendChild(metaDescription);
        }
        metaDescription.content = `Discover premium luxury cabins in ${locationName}. Book your perfect mountain getaway with direct pricing, high-end amenities, and breathtaking views.`;
    }, [locationName]);

    // JSON-LD Schema for LocalBusiness / Aggregate Listing
    const locationSchema = {
        "@context": "https://schema.org",
        "@type": "ItemList",
        "name": `Luxury Vacation Rentals in ${locationName}`,
        "description": `Browse luxury cabins located in ${locationName}.`,
        "itemListElement": properties.map((prop, index) => ({
            "@type": "ListItem",
            "position": index + 1,
            "url": `https://www.nirvanaluxe.com/properties/${prop.slug}`
        }))
    };

    return (
        <div className="font-sans text-gray-800 bg-slate-50 min-h-screen">
            {/* Inject Schema */}
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(locationSchema) }}
            />

            {/* Hero Section */}
            <section className="site-hero site-hero--md flex w-full items-center justify-center overflow-hidden bg-slate-900">
                <div className="absolute inset-0 bg-black/50 z-10" />
                <img 
                    src={`/images/locations/${locationSlug}-hero.jpg`} 
                    alt={`Beautiful view of ${locationName}`}
                    className="absolute inset-0 w-full h-full object-cover"
                    fetchpriority="high"
                />
                
                <div className="relative z-20 text-center px-6 text-white max-w-4xl">
                    <p className="text-accent uppercase tracking-[0.3em] text-sm font-semibold mb-4">Premium Getaways</p>
                    <h1 className="text-5xl md:text-7xl font-bold mb-6">Explore {locationName}</h1>
                    <p className="text-xl md:text-2xl font-light text-slate-200">
                        {description || `Experience the ultimate luxury mountain escape in the heart of ${locationName}.`}
                    </p>
                </div>
            </section>

            {/* Breadcrumbs for SEO */}
            <nav className="bg-white border-b border-slate-200 py-4 px-6 md:px-12 max-w-7xl mx-auto text-sm text-slate-500">
                <ol className="flex items-center space-x-2">
                    <li><Link to="/" className="hover:text-accent transition-colors">Home</Link></li>
                    <li><FaChevronRight size={10} className="mx-2" /></li>
                    <li><Link to="/destinations" className="hover:text-accent transition-colors">Destinations</Link></li>
                    <li><FaChevronRight size={10} className="mx-2" /></li>
                    <li className="text-slate-900 font-semibold">{locationName}</li>
                </ol>
            </nav>

            {/* Properties Grid */}
            <section className="py-20 px-6 md:px-12 max-w-7xl mx-auto">
                <div className="mb-12">
                    <h2 className="text-3xl md:text-4xl font-bold text-slate-900 mb-4">
                        Luxury Properties in {locationName}
                    </h2>
                    <p className="text-slate-600 text-lg">
                        Select from our curated portfolio of {properties.length} exclusive cabins.
                    </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {properties.map(property => (
                        <Link 
                            key={property.id} 
                            to={`/properties/${property.slug}`}
                            className="group block bg-white rounded-2xl overflow-hidden shadow-lg hover:shadow-2xl transition-all duration-300"
                        >
                            <div className="relative aspect-[4/3] overflow-hidden bg-slate-200">
                                <img 
                                    src={property.image_url} 
                                    alt={`Exterior of ${property.name}`} 
                                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                                    loading="lazy"
                                />
                                <div className="absolute top-4 left-4 bg-white/90 backdrop-blur-sm px-3 py-1 rounded-full text-xs font-bold text-slate-900">
                                    <FaStar className="inline text-accent mr-1" /> {property.rating || '4.9'}
                                </div>
                            </div>
                            <div className="p-6">
                                <h3 className="text-xl font-bold text-slate-900 mb-2">{property.name}</h3>
                                <div className="flex items-center text-slate-500 text-sm mb-4">
                                    <FaMapMarkerAlt className="mr-2 text-accent" />
                                    <span>{property.location}</span>
                                </div>
                                <div className="flex justify-between items-center border-t border-slate-100 pt-4">
                                    <span className="text-slate-600 text-sm">{property.bedrooms} Beds • Up to {property.guests} Guests</span>
                                    <span className="text-accent font-bold">View property &rarr;</span>
                                </div>
                            </div>
                        </Link>
                    ))}
                </div>
            </section>
            
            {/* SEO Content Section (For "Near Me" searches and long-tail keywords) */}
            <section className="py-20 bg-white">
                <div className="max-w-4xl mx-auto px-6 prose prose-slate lg:prose-lg">
                    <h2>Why Choose a Luxury Cabin in {locationName}?</h2>
                    <p>
                        When booking a vacation rental in {locationName}, settling for an average stay means missing out on the spectacular mountain views and premium amenities that make a trip unforgettable. At NirvanaLuxe, our cabins in {locationName} feature private hot tubs, expansive decks, game rooms, and meticulously designed interiors.
                    </p>
                    <h3>Top Attractions Near {locationName}</h3>
                    <ul>
                        <li><strong>Scenic Drives:</strong> Experience the beauty of the surrounding lush forests.</li>
                        <li><strong>Local Dining:</strong> From casual southern comfort food to premium dining experiences just minutes away.</li>
                        <li><strong>Outdoor Adventures:</strong> Hiking, zip-lining, and exploring the Great Smoky Mountains National Park.</li>
                    </ul>
                    <p>
                        Skip the fees of popular booking platforms and reserve your {locationName} luxury cabin directly through our platform for the guaranteed best rates.
                    </p>
                </div>
            </section>
        </div>
    );
};

export default LocationPage;
