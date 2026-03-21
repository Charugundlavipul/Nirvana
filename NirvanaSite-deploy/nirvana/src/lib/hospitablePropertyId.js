const HOSPITABLE_PROPERTY_ID_REGEX =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export function normalizeHospitablePropertyId(value) {
  return `${value || ""}`.trim().toLowerCase();
}

export function isValidHospitablePropertyId(value) {
  const normalizedValue = normalizeHospitablePropertyId(value);
  return Boolean(normalizedValue) && HOSPITABLE_PROPERTY_ID_REGEX.test(normalizedValue);
}
