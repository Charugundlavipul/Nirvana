const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

export const normalizeBathroomCounts = (property = {}) => {
  const fullBathCount = toNumber(property.full_bath_count);
  const halfBathCount = toNumber(property.half_bath_count);
  const legacyBathroomCount = toNumber(property.bathroom_count);

  if (fullBathCount !== null || halfBathCount !== null) {
    return {
      fullBathCount: fullBathCount ?? 0,
      halfBathCount: halfBathCount ?? 0,
    };
  }

  if (legacyBathroomCount === null) {
    return {
      fullBathCount: 0,
      halfBathCount: 0,
    };
  }

  const whole = Math.trunc(legacyBathroomCount);
  const fractional = legacyBathroomCount - whole;

  return {
    fullBathCount: whole,
    halfBathCount: fractional >= 0.5 ? 1 : 0,
  };
};

export const getBathroomSummary = (property = {}) => {
  const { fullBathCount, halfBathCount } = normalizeBathroomCounts(property);
  const parts = [];

  if (fullBathCount) {
    parts.push(`${fullBathCount} Full Bath${fullBathCount === 1 ? "" : "s"}`);
  }

  if (halfBathCount) {
    parts.push(`${halfBathCount} Half Bath${halfBathCount === 1 ? "" : "s"}`);
  }

  if (!parts.length) {
    return "";
  }

  return parts.join(", ");
};

export const getCompactBathroomSummary = (property = {}) => {
  const { fullBathCount, halfBathCount } = normalizeBathroomCounts(property);
  const parts = [];

  if (fullBathCount) {
    parts.push(`${fullBathCount} full`);
  }

  if (halfBathCount) {
    parts.push(`${halfBathCount} half`);
  }

  if (!parts.length) {
    return "";
  }

  return parts.join(" / ");
};
