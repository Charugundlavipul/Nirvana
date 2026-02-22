import React, { useEffect, useMemo, useRef, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { FaArrowLeft, FaArrowRight, FaExpand, FaSearchMinus, FaTimes } from "react-icons/fa";
import { fetchPropertyBundleBySlug } from "../../lib/contentApi";
import { normalizePropertySpaces } from "../../lib/propertySpaces";

const dedupeUrls = (urls = []) => {
  const seen = new Set();
  return urls.filter((url) => {
    const normalized = typeof url === "string" ? url.trim() : "";
    if (!normalized || seen.has(normalized)) return false;
    seen.add(normalized);
    return true;
  });
};

const normalizeSectionImages = (images = [], fallbackSpaceId = "space") =>
  images
    .map((image, index) => {
      if (!image || typeof image !== "object") return null;
      const url = typeof image.url === "string" ? image.url.trim() : "";
      if (!url) return null;
      const name = typeof image.name === "string" ? image.name.trim() : "";
      const id = typeof image.id === "string" && image.id.trim()
        ? image.id.trim()
        : `${fallbackSpaceId}-img-${index + 1}`;
      return { id, url, name };
    })
    .filter(Boolean);

const buildSpaceSections = ({ property, curated, galleryImages, highlightImages }) => {
  const curatedUrls = dedupeUrls([curated?.home, curated?.bg, curated?.secondary]);
  const allPropertyUrls = dedupeUrls([
    ...curatedUrls,
    ...(galleryImages || []),
    ...(highlightImages || []),
  ]);

  const spaces = normalizePropertySpaces(property?.spaces || []);
  const sections = spaces.map((space, index) => ({
    id: space.id || `space-${index + 1}`,
    name: space.name || `Space ${index + 1}`,
    images: normalizeSectionImages(space.images || [], space.id || `space-${index + 1}`),
  }));

  const assignedUrls = new Set(
    sections.flatMap((section) => section.images.map((image) => image.url))
  );
  const unassignedUrls = allPropertyUrls.filter((url) => !assignedUrls.has(url));

  if (unassignedUrls.length) {
    sections.push({
      id: "space-unassigned",
      name: "More Photos",
      images: unassignedUrls.map((url, index) => ({
        id: `unassigned-${index + 1}`,
        url,
        name: "",
      })),
    });
  }

  const nonEmptySections = sections.filter((section) => section.images.length > 0);
  if (nonEmptySections.length) return nonEmptySections;

  if (!allPropertyUrls.length) return [];
  return [
    {
      id: "space-gallery",
      name: "Gallery",
      images: allPropertyUrls.map((url, index) => ({
        id: `gallery-${index + 1}`,
        url,
        name: "",
      })),
    },
  ];
};

const PropertyGalleryPage = () => {
  const { slug } = useParams();
  const [loading, setLoading] = useState(true);
  const [property, setProperty] = useState(null);
  const [curated, setCurated] = useState({ home: "", bg: "", secondary: "" });
  const [galleryImages, setGalleryImages] = useState([]);
  const [highlightImages, setHighlightImages] = useState([]);
  const [activeImageIndex, setActiveImageIndex] = useState(null);
  const [zoomed, setZoomed] = useState(false);
  const sectionRefs = useRef({});

  useEffect(() => {
    let isMounted = true;
    const loadProperty = async () => {
      setLoading(true);
      try {
        const data = await fetchPropertyBundleBySlug(slug);
        if (!isMounted) return;
        setProperty(data?.property || null);
        setCurated(data?.curated || { home: "", bg: "", secondary: "" });
        setGalleryImages(data?.galleryImages || []);
        setHighlightImages(data?.highlightImages || []);
      } catch (error) {
        console.error(`Failed loading gallery page for property "${slug}":`, error);
        if (!isMounted) return;
        setProperty(null);
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    if (slug) {
      loadProperty();
    }

    return () => {
      isMounted = false;
    };
  }, [slug]);

  const sections = useMemo(
    () =>
      buildSpaceSections({
        property,
        curated,
        galleryImages,
        highlightImages,
      }),
    [property, curated, galleryImages, highlightImages]
  );

  const timeline = useMemo(() => {
    const items = [];
    sections.forEach((section, sectionIndex) => {
      section.images.forEach((image, imageIndex) => {
        items.push({
          key: `${section.id}-${image.id}`,
          sectionId: section.id,
          sectionName: section.name,
          sectionIndex,
          imageIndex,
          ...image,
        });
      });
    });
    return items;
  }, [sections]);

  const timelineIndexByKey = useMemo(() => {
    const map = new Map();
    timeline.forEach((item, index) => {
      map.set(item.key, index);
    });
    return map;
  }, [timeline]);

  useEffect(() => {
    if (activeImageIndex === null) {
      document.body.style.overflow = "";
      return;
    }
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "";
    };
  }, [activeImageIndex]);

  useEffect(() => {
    if (activeImageIndex === null) return;
    setZoomed(false);
  }, [activeImageIndex]);

  useEffect(() => {
    const onKeyDown = (event) => {
      if (activeImageIndex === null || !timeline.length) return;
      if (event.key === "Escape") {
        setActiveImageIndex(null);
      } else if (event.key === "ArrowRight") {
        setActiveImageIndex((prev) => ((prev ?? 0) + 1) % timeline.length);
      } else if (event.key === "ArrowLeft") {
        setActiveImageIndex((prev) => ((prev ?? 0) - 1 + timeline.length) % timeline.length);
      }
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [activeImageIndex, timeline.length]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
          <p className="text-slate-500 font-medium">Loading gallery...</p>
        </div>
      </div>
    );
  }

  if (!property) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center px-6">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-slate-900 mb-2">Property Not Found</h1>
          <p className="text-slate-600 mb-6">The requested gallery could not be loaded.</p>
          <Link
            to="/properties"
            className="inline-block rounded-full bg-accent px-6 py-3 text-white font-semibold hover:bg-accent/90 transition-colors"
          >
            Browse Properties
          </Link>
        </div>
      </div>
    );
  }

  const activeImage = activeImageIndex !== null ? timeline[activeImageIndex] : null;

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900">
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-10">
        <div className="mb-8 border-b border-slate-200 pb-6">
          <Link
            to={`/${slug}`}
            className="inline-flex items-center gap-2 rounded-full border border-slate-300 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-100 transition-colors"
          >
            <FaArrowLeft size={12} />
            Back to Property
          </Link>
          <h1 className="mt-4 text-4xl font-bold text-slate-900">{property.name}</h1>
          <p className="mt-2 text-slate-600">
            {sections.length} spaces, {timeline.length} photos
          </p>
        </div>

        {sections.length > 0 ? (
          <section className="mb-10">
            <h2 className="text-2xl font-bold text-slate-900 mb-5">Photo Tour</h2>
            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
              {sections.map((section) => (
                <button
                  key={`tour-${section.id}`}
                  type="button"
                  onClick={() => sectionRefs.current[section.id]?.scrollIntoView({ behavior: "smooth", block: "start" })}
                  className="text-left rounded-xl border border-slate-200 bg-white p-2 hover:border-accent hover:shadow-sm transition-all"
                >
                  {section.images[0] ? (
                    <img
                      src={section.images[0].url}
                      alt={section.name}
                      className="w-full h-24 object-cover rounded-lg"
                    />
                  ) : (
                    <div className="w-full h-24 rounded-lg border border-dashed border-slate-300 bg-slate-100" />
                  )}
                  <p className="mt-2 text-sm font-medium text-slate-800 leading-tight">{section.name}</p>
                </button>
              ))}
            </div>
          </section>
        ) : null}

        {sections.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center text-slate-500">
            No gallery images found for this property yet.
          </div>
        ) : (
          <div className="space-y-14">
            {sections.map((section) => (
              <section
                key={section.id}
                ref={(node) => {
                  sectionRefs.current[section.id] = node;
                }}
              >
                <div className="mb-5 flex items-end justify-between gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-[0.18em] text-accent font-semibold">Space</p>
                    <h2 className="text-3xl font-bold text-slate-900">{section.name}</h2>
                  </div>
                  <p className="text-sm text-slate-500">{section.images.length} photos</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {section.images.map((image) => {
                    const timelineIndex = timelineIndexByKey.get(`${section.id}-${image.id}`) ?? -1;
                    return (
                      <button
                        key={image.id}
                        type="button"
                        onClick={() => {
                          if (timelineIndex >= 0) setActiveImageIndex(timelineIndex);
                        }}
                        className="group overflow-hidden rounded-2xl border border-slate-200 bg-white text-left shadow-sm transition-all hover:-translate-y-1 hover:shadow-lg"
                      >
                        <div className="relative">
                          <img
                            src={image.url}
                            alt={image.name}
                            className="h-56 w-full object-cover transition-transform duration-500 group-hover:scale-105"
                          />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/40 to-transparent opacity-0 group-hover:opacity-100 transition-opacity" />
                        </div>
                        <div className="px-4 py-3">
                          {image.name ? (
                            <p className="text-sm font-semibold text-slate-900">{image.name}</p>
                          ) : null}
                          <p className={`text-xs text-slate-500 ${image.name ? "mt-0.5" : ""}`}>Click to view full image</p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {activeImage ? (
        <div
          className="fixed inset-0 z-[120] bg-black/95 backdrop-blur-sm"
          onClick={() => setActiveImageIndex(null)}
        >
          <button
            type="button"
            onClick={() => setActiveImageIndex(null)}
            className="absolute top-4 right-4 z-20 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <FaTimes size={20} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setActiveImageIndex((prev) => ((prev ?? 0) - 1 + timeline.length) % timeline.length);
            }}
            className="absolute left-3 md:left-8 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <FaArrowLeft size={20} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setActiveImageIndex((prev) => ((prev ?? 0) + 1) % timeline.length);
            }}
            className="absolute right-3 md:right-8 top-1/2 -translate-y-1/2 z-20 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            <FaArrowRight size={20} />
          </button>

          <button
            type="button"
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((prev) => !prev);
            }}
            className="absolute top-4 left-4 z-20 rounded-full bg-white/10 p-3 text-white hover:bg-white/20"
          >
            {zoomed ? <FaSearchMinus size={18} /> : <FaExpand size={18} />}
          </button>

          <div
            className={`h-full w-full p-10 md:p-16 overflow-auto ${zoomed ? "cursor-zoom-out" : "cursor-zoom-in"}`}
            onClick={(event) => {
              event.stopPropagation();
              setZoomed((prev) => !prev);
            }}
          >
            <div className="h-full w-full flex items-center justify-center">
              <img
                src={activeImage.url}
                alt={activeImage.name}
                className="max-h-full max-w-full rounded-xl shadow-2xl object-contain transition-transform duration-300"
                style={{ transform: zoomed ? "scale(1.9)" : "scale(1)" }}
              />
            </div>
          </div>

          <div className="absolute bottom-0 left-0 right-0 z-20 border-t border-white/10 bg-black/45 px-6 py-4 text-white backdrop-blur">
            <p className="text-sm uppercase tracking-[0.14em] text-white/70">{activeImage.sectionName}</p>
            {activeImage.name ? <p className="text-lg font-semibold">{activeImage.name}</p> : null}
            <p className="text-xs text-white/60 mt-1">
              {activeImageIndex + 1} of {timeline.length}
            </p>
          </div>
        </div>
      ) : null}
    </div>
  );
};

export default PropertyGalleryPage;
