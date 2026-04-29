export const STANDARD_KNOWLEDGE_SECTION_TITLES = Object.freeze([
  "Access Codes",
  "Accessibility",
  "Amenities",
  "Air Mattress Setup",
  "Appliances & Kitchen Equipment",
  "Arrival / Check-in Instructions / Early Check-in",
  "Boat, Docking & Water Access / Rentals",
  "Booking Policy / Payment / Reservation Changes",
  "Contact Details",
  "Departure / Check-out Instructions",
  "Deliveries, Packages & Mail",
  "Entertainment / Smart TV / Game Room",
  "Fireplace Operation",
  "Good to Know",
  "Heating & Cooling / HVAC",
  "House Rules / Smoking / Parties / Occupancy",
  "Laundry",
  "Local Attractions, Dining & Nearby Stores",
  "Lost & Found",
  "Maintenance, Repairs & Troubleshooting / Property Maintenance",
  "Nearby Properties",
  "Outdoor Amenities / Lighting / Grill & Propane",
  "Parking & EV Charging",
  "Pet Policy",
  "Pests, Bugs, Mosquitoes & Wildlife / Outdoor Preparation",
  "Pool & Hot Tub",
  "Pricing & Discounts / Return Guest Discount",
  "Property Address",
  "Property Layout, Features & Furniture",
  "Safety, Emergency, Weather & Power Outages",
  "Septic System Care",
  "Sleeping Arrangements",
  "Smith Creek Reserve Waterpark",
  "Supplies, Towels, Linens & Toiletries / What to Bring",
  "Transportation to/from Property",
  "Trash & Recycling",
  "Wi-Fi & Internet",
]);

export function slugifyKnowledgeSectionTitle(value) {
  return `${value || ""}`
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 120);
}

export const STANDARD_KNOWLEDGE_SECTIONS = Object.freeze(
  STANDARD_KNOWLEDGE_SECTION_TITLES.map((title, index) =>
    Object.freeze({
      title,
      slug: slugifyKnowledgeSectionTitle(title),
      displayOrder: index,
    })
  )
);

const STANDARD_SECTION_BY_SLUG = new Map(
  STANDARD_KNOWLEDGE_SECTIONS.map((section) => [section.slug, section])
);

export function getStandardKnowledgeSectionBySlug(slug) {
  return STANDARD_SECTION_BY_SLUG.get(`${slug || ""}`.trim()) || null;
}

export function getStandardKnowledgeSectionByTitle(title) {
  return getStandardKnowledgeSectionBySlug(slugifyKnowledgeSectionTitle(title));
}

export function isStandardKnowledgeSectionSlug(slug) {
  return STANDARD_SECTION_BY_SLUG.has(`${slug || ""}`.trim());
}
