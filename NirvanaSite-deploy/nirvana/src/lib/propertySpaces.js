const createLocalId = (prefix) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;

const parsePossiblySerializedValue = (value) => {
  if (Array.isArray(value)) return value;
  if (!value) return [];
  if (typeof value === "string") {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return [];
};

export const inferImageNameFromUrl = (url, fallback = "Image") => {
  if (!url || typeof url !== "string") return fallback;
  try {
    const parsed = new URL(url);
    const rawFile = parsed.pathname.split("/").filter(Boolean).pop() || "";
    const fileWithoutExt = rawFile.replace(/\.[a-z0-9]+$/i, "");
    const decoded = decodeURIComponent(fileWithoutExt || "");
    const normalized = decoded.replace(/[-_]+/g, " ").trim();
    return normalized || fallback;
  } catch {
    const parts = String(url).split("?")[0].split("/");
    const rawFile = parts[parts.length - 1] || "";
    const fileWithoutExt = rawFile.replace(/\.[a-z0-9]+$/i, "");
    const normalized = decodeURIComponent(fileWithoutExt || "").replace(/[-_]+/g, " ").trim();
    return normalized || fallback;
  }
};

const normalizeSpaceImage = (image, imageIndex) => {
  if (!image || typeof image !== "object") return null;
  const url = typeof image.url === "string" ? image.url.trim() : "";
  if (!url) return null;

  const nameFromInput = typeof image.name === "string" ? image.name.trim() : "";
  const id = typeof image.id === "string" && image.id.trim()
    ? image.id.trim()
    : createLocalId(`img-${imageIndex + 1}`);

  return {
    id,
    name: nameFromInput,
    url,
  };
};

const normalizeSpace = (space, spaceIndex) => {
  if (!space || typeof space !== "object") return null;
  const id = typeof space.id === "string" && space.id.trim()
    ? space.id.trim()
    : createLocalId(`space-${spaceIndex + 1}`);
  const providedName = typeof space.name === "string" ? space.name.trim() : "";
  const imagesRaw = Array.isArray(space.images) ? space.images : [];

  const seenUrls = new Set();
  const images = imagesRaw
    .map((image, imageIndex) => normalizeSpaceImage(image, imageIndex))
    .filter(Boolean)
    .filter((image) => {
      if (seenUrls.has(image.url)) return false;
      seenUrls.add(image.url);
      return true;
    });

  return {
    id,
    name: providedName || `Space ${spaceIndex + 1}`,
    images,
  };
};

export const normalizePropertySpaces = (value) => {
  const parsed = parsePossiblySerializedValue(value);
  return parsed
    .map((space, spaceIndex) => normalizeSpace(space, spaceIndex))
    .filter(Boolean);
};

export const summarizeSpaces = (value) => {
  const spaces = normalizePropertySpaces(value);
  if (!spaces.length) return "No spaces";
  const totalImages = spaces.reduce((count, space) => count + (space.images?.length || 0), 0);
  return `${spaces.length} spaces, ${totalImages} images`;
};

export const flattenPropertySpaceImages = (value) => {
  const spaces = normalizePropertySpaces(value);
  const items = [];
  spaces.forEach((space, spaceIndex) => {
    (space.images || []).forEach((image, imageIndex) => {
      items.push({
        key: `${space.id}-${image.id}`,
        spaceId: space.id,
        spaceName: space.name,
        spaceIndex,
        imageId: image.id,
        imageIndex,
        name: image.name,
        url: image.url,
      });
    });
  });
  return items;
};
