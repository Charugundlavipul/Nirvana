import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import {
  fetchActivitiesBySlug,
  fetchPropertyBySlug,
  getFallbackMetaForSlug,
} from "../../lib/contentApi";

const CREDITS_MAP = {
  'nirvana': { label: 'Southern Living', url: 'https://www.southernliving.com/' },
  'shoreside': { label: 'Visit Mooresville', url: 'https://visitmooresville.com/' },
  'halftime': { label: 'Southern Living', url: 'https://www.southernliving.com/' },
};

const ActivitiesPage = ({ slug: propSlug, creditsLabel: propCreditsLabel, creditsUrl: propCreditsUrl }) => {
  const { slug: routeSlug } = useParams();
  const slug = propSlug || routeSlug;

  const credits = CREDITS_MAP[slug] || {};
  const creditsLabel = propCreditsLabel || credits.label;
  const creditsUrl = propCreditsUrl || credits.url;

  const fallbackMeta = getFallbackMetaForSlug(slug);
  const [heroImage, setHeroImage] = useState(
    fallbackMeta?.fallback?.bgImage || fallbackMeta?.fallback?.homeImage || ""
  );
  const [activities, setActivities] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      try {
        setIsLoading(true);
        const [property, activityRows] = await Promise.all([
          fetchPropertyBySlug(slug),
          fetchActivitiesBySlug(slug),
        ]);

        if (property?.curated?.bg || property?.curated?.home) {
          setHeroImage(property.curated.bg || property.curated.home);
        }
        // Fallback for hero image if specific property fetch fails or returns empty
        else if (fallbackMeta?.fallback?.bgImage) {
          setHeroImage(fallbackMeta.fallback.bgImage);
        }

        setActivities(activityRows || []);
      } catch (error) {
        console.error(`Error loading activities for ${slug}:`, error);
        setActivities([]);
      } finally {
        setIsLoading(false);
      }
    };
    if (slug) loadData();
  }, [slug]);

  return (
    <div className="bg-gray-50 min-h-screen font-sans text-gray-800">
      {/* Hero Section */}
      <div
        className="relative h-[60vh] bg-cover bg-center flex items-center justify-center -mt-[50px]"
        style={{ backgroundImage: `url(${heroImage})` }}
      >
        <div className="absolute inset-0 bg-black/50 backdrop-blur-[2px]"></div>
        <div className="relative z-10 text-center text-white px-4">
          <h1 className="text-5xl md:text-7xl font-bold mb-4 drop-shadow-lg">Nearby Activities</h1>
          <p className="text-xl md:text-2xl font-light opacity-90 max-w-2xl mx-auto">
            Explore exciting adventures around our property
          </p>
        </div>
      </div>

      {/* Activities Grid */}
      <div className="max-w-7xl mx-auto py-20 px-6">
        {isLoading && (
          <div className="text-center text-xl text-primary font-medium">Loading activities...</div>
        )}

        {!isLoading && !activities.length && (
          <div className="text-center text-gray-500 text-lg">No activities available at the moment.</div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {!isLoading &&
            activities.map((activity) => (
              <div
                key={activity.id}
                className="bg-white rounded-2xl shadow-card hover:shadow-xl transition-all duration-300 overflow-hidden group flex flex-col h-full"
              >
                <div className="h-64 overflow-hidden relative">
                  <img
                    src={activity.image_url}
                    alt={activity.title}
                    className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
                  />
                  <div className="absolute inset-0 bg-black/10 group-hover:bg-transparent transition-colors"></div>
                </div>

                <div className="p-8 flex flex-col flex-grow">
                  <h2 className="text-2xl font-bold text-gray-900 mb-4 group-hover:text-primary transition-colors">{activity.title}</h2>
                  <p className="text-gray-600 mb-6 leading-relaxed line-clamp-4 flex-grow">{activity.description}</p>

                  {activity.link_url && (
                    <a
                      href={activity.link_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block text-center w-full py-3 border-2 border-primary text-primary font-semibold rounded-full hover:bg-primary hover:text-white transition-all duration-300"
                    >
                      Learn More
                    </a>
                  )}
                </div>
              </div>
            ))}
        </div>
      </div>

      {/* Credits */}
      {creditsLabel && creditsUrl && (
        <div className="text-center pb-12 text-gray-400 text-sm">
          Credits:{" "}
          <a
            href={creditsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-hover hover:underline transition-colors"
          >
            {creditsLabel}
          </a>
        </div>
      )}
    </div>
  );
};

export default ActivitiesPage;
