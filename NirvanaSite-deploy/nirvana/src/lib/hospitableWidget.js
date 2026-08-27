export const HOSPITABLE_WIDGET_LOADER_SRC =
  "https://cdn.hsptb.com/direct-booking-widget/widget-loader.prod.js";

const ALLOWED_ATTRIBUTES = new Set([
  "src",
  "data-site-uuid",
  "data-property-id",
  "data-theme",
  "data-height",
]);

const SITE_UUID_PATTERN =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const PROPERTY_ID_PATTERN = /^\d+$/;
const THEME_PATTERN = /^[a-z0-9_-]{1,32}$/i;
const HEIGHT_PATTERN = /^[1-9]\d{1,3}px$/;

function readScriptAttributes(value) {
  const completeTag = /^\s*<script\b([\s\S]*?)>\s*<\/script\s*>\s*$/i.exec(value);
  const openingTagOnly = /^\s*<script\b([\s\S]*?)>\s*$/i.exec(value);
  const match = completeTag || openingTagOnly;

  if (!match) {
    return {
      error: "Paste one complete Hospitable <script> tag.",
      attributes: null,
    };
  }

  const attributeText = match[1];
  const attributes = {};
  const attributePattern = /([a-zA-Z_:][a-zA-Z0-9_:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
  let lastIndex = 0;
  let attributeMatch;

  while ((attributeMatch = attributePattern.exec(attributeText)) !== null) {
    if (attributeText.slice(lastIndex, attributeMatch.index).trim()) {
      return { error: "The script tag contains an unsupported attribute format.", attributes: null };
    }

    const name = attributeMatch[1].toLowerCase();
    if (!ALLOWED_ATTRIBUTES.has(name)) {
      return { error: `The ${name} attribute is not allowed.`, attributes: null };
    }
    if (Object.prototype.hasOwnProperty.call(attributes, name)) {
      return { error: `The ${name} attribute is duplicated.`, attributes: null };
    }

    attributes[name] = attributeMatch[2] ?? attributeMatch[3] ?? "";
    lastIndex = attributePattern.lastIndex;
  }

  if (attributeText.slice(lastIndex).trim()) {
    return { error: "The script tag contains unsupported content.", attributes: null };
  }

  return { error: null, attributes };
}

function escapeAttribute(value) {
  return `${value}`
    .replaceAll("&", "&amp;")
    .replaceAll('"', "&quot;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function buildNormalizedCode(config) {
  const attributes = [
    `src="${HOSPITABLE_WIDGET_LOADER_SRC}"`,
    `data-site-uuid="${escapeAttribute(config.siteUuid)}"`,
    `data-property-id="${escapeAttribute(config.propertyId)}"`,
  ];

  if (config.theme) attributes.push(`data-theme="${escapeAttribute(config.theme)}"`);
  if (config.height) attributes.push(`data-height="${escapeAttribute(config.height)}"`);

  return `<script\n  ${attributes.join("\n  ")}>\n</script>`;
}

export function parseHospitableWidgetCode(value) {
  const input = `${value || ""}`.trim();
  if (!input) {
    return { config: null, error: null, normalizedCode: "" };
  }

  const { attributes, error } = readScriptAttributes(input);
  if (error) return { config: null, error, normalizedCode: "" };

  if (attributes.src !== HOSPITABLE_WIDGET_LOADER_SRC) {
    return {
      config: null,
      error: "Only the official Hospitable direct-booking widget loader is allowed.",
      normalizedCode: "",
    };
  }

  const siteUuid = `${attributes["data-site-uuid"] || ""}`.trim().toLowerCase();
  const propertyId = `${attributes["data-property-id"] || ""}`.trim();
  const theme = `${attributes["data-theme"] || ""}`.trim();
  const height = `${attributes["data-height"] || ""}`.trim();

  if (!SITE_UUID_PATTERN.test(siteUuid)) {
    return { config: null, error: "The widget site UUID is missing or invalid.", normalizedCode: "" };
  }
  if (!PROPERTY_ID_PATTERN.test(propertyId)) {
    return { config: null, error: "The widget property ID is missing or invalid.", normalizedCode: "" };
  }
  if (theme && !THEME_PATTERN.test(theme)) {
    return { config: null, error: "The widget theme is invalid.", normalizedCode: "" };
  }
  if (height && !HEIGHT_PATTERN.test(height)) {
    return {
      config: null,
      error: "The widget height must be a pixel value such as 900px.",
      normalizedCode: "",
    };
  }

  const config = {
    src: HOSPITABLE_WIDGET_LOADER_SRC,
    siteUuid,
    propertyId,
    theme,
    height,
  };
  return { config, error: null, normalizedCode: buildNormalizedCode(config) };
}

export function normalizeHospitableWidgetCode(value) {
  const result = parseHospitableWidgetCode(value);
  if (result.error) throw new Error(result.error);
  return result.normalizedCode;
}
