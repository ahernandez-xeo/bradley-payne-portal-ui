// Copy and identifiers that used to be hardcoded inline in Landing.js.
// Anything here is a candidate for moving into the per-district record served
// by the backend; keeping it in one place means the strings stop being spread
// across render functions.

/** Tableau workbook that holds the capital-plan sheets. */
export const CAPITAL_PLAN_WORKBOOK = "Xeo Testing II";

/** Fiscal window shown in the app top bar. */
export const PLAN_START_FY = 2026;
export const PLAN_END_FY = 2035;

export const planWindowLabel = () =>
  `Capital Plan Portal · FY ${PLAN_START_FY}\u2013${PLAN_END_FY}`;

/**
 * Taglines shown next to the client name in the top bar, keyed by district
 * name. The branding table only stores logo_url and custom_color today, so
 * overrides live here until it grows a tagline column.
 */
export const TAGLINES = {
  default: "Empower \u00b7 Challenge \u00b7 Support",
};

export const taglineFor = (clientName) =>
  TAGLINES[clientName] || TAGLINES.default;

export const DEFAULT_BRAND_COLOR = "#e6b422";

export const DEFAULT_LOGO_URL =
  "https://storage.googleapis.com/bp_portal_artifacts/bradleypayne.png";
