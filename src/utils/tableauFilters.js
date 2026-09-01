import { CAPITAL_PLAN_WORKBOOK } from "../portalConfig";

export const FILTER_ORDER = ["Category", "Location Type", "LOCATION"];
export const TOP_FILTER_ORDER = ["Location Type", "LOCATION"];
export const CATEGORY_FILTER = "Category";
/** Exact Tableau caption — Embedding API field names are case-sensitive. */
export const LOCATION_FILTER = "LOCATION";
/** Tableau may expose the department dimension as Category or Department. */
export const DEPARTMENT_FILTER_ALIASES = ["Category", "Department"];

const FILTER_DISPLAY_NAMES = {
  Category: "Category",
  "Location Type": "Location Type",
  LOCATION: "Location",
};

export const filterDisplayName = (fieldName) =>
  FILTER_DISPLAY_NAMES[fieldName] || fieldName;

/**
 * Build Tableau-shaped filter metadata from BigQuery capital-plan rows.
 * Categories are ordered by total expense descending; Location Type / Location
 * cascade from the current selections.
 */
export const buildFiltersFromRows = (rows, selections = {}) => {
  const list = Array.isArray(rows) ? rows : [];
  const selectedDepartment = (() => {
    for (const name of DEPARTMENT_FILTER_ALIASES) {
      if (selections[name] !== undefined) {
        return selections[name];
      }
    }
    return undefined;
  })();
  const selectedLocationType = selections["Location Type"];
  const selectedLocation = selections[LOCATION_FILTER];

  const categoryExpense = {};
  for (const row of list) {
    const category = (row.category || "").trim();
    if (!category) {
      continue;
    }
    categoryExpense[category] =
      (categoryExpense[category] || 0) + (Number(row.expense_amount) || 0);
  }
  const categories = Object.keys(categoryExpense).sort(
    (a, b) => categoryExpense[b] - categoryExpense[a] || a.localeCompare(b)
  );

  let scoped = list;
  if (selectedDepartment) {
    scoped = scoped.filter(
      (row) => (row.category || "").trim() === selectedDepartment
    );
  }

  const locationTypeExpense = {};
  for (const row of scoped) {
    const locationType = (row.location_type || "").trim();
    if (!locationType) {
      continue;
    }
    locationTypeExpense[locationType] =
      (locationTypeExpense[locationType] || 0) +
      (Number(row.expense_amount) || 0);
  }
  const locationTypes = Object.keys(locationTypeExpense).sort(
    (a, b) =>
      locationTypeExpense[b] - locationTypeExpense[a] || a.localeCompare(b)
  );

  if (selectedLocationType) {
    scoped = scoped.filter(
      (row) => (row.location_type || "").trim() === selectedLocationType
    );
  }

  const locationExpense = {};
  for (const row of scoped) {
    const location = (row.location || "").trim();
    if (!location) {
      continue;
    }
    locationExpense[location] =
      (locationExpense[location] || 0) + (Number(row.expense_amount) || 0);
  }
  const locations = Object.keys(locationExpense).sort(
    (a, b) => locationExpense[b] - locationExpense[a] || a.localeCompare(b)
  );

  const appliedFor = (fieldName, selected) => (selected ? [selected] : []);

  return [
    {
      fieldName: CATEGORY_FILTER,
      worksheetNames: [],
      values: categories,
      appliedValues: appliedFor(CATEGORY_FILTER, selectedDepartment),
      isAllSelected: !selectedDepartment,
      filterType: "categorical",
    },
    {
      fieldName: "Location Type",
      worksheetNames: [],
      values: locationTypes,
      appliedValues: appliedFor("Location Type", selectedLocationType),
      isAllSelected: !selectedLocationType,
      filterType: "categorical",
    },
    {
      fieldName: LOCATION_FILTER,
      worksheetNames: [],
      values: locations,
      appliedValues: appliedFor(LOCATION_FILTER, selectedLocation),
      isAllSelected: !selectedLocation,
      filterType: "categorical",
    },
  ];
};

export const orderTopFilters = (filters) =>
  TOP_FILTER_ORDER.map((name) =>
    (filters || []).find((f) => f.fieldName === name)
  ).filter(Boolean);

export const normalizeFieldName = (fieldName) =>
  String(fieldName || "")
    .replace(/[[\]]/g, "")
    .trim()
    .toLowerCase();

/** True when a Tableau field should drive the Departments side nav. */
export const isDepartmentFieldName = (fieldName) => {
  const n = normalizeFieldName(fieldName);
  if (!n) {
    return false;
  }
  // Never treat top-bar filters as departments.
  if (TOP_FILTER_ORDER.some((name) => normalizeFieldName(name) === n)) {
    return false;
  }
  if (DEPARTMENT_FILTER_ALIASES.some((name) => normalizeFieldName(name) === n)) {
    return true;
  }
  return (
    n === "departments" ||
    n === "dept" ||
    n === "category name" ||
    n.endsWith(" category") ||
    n.startsWith("category ") ||
    n.includes("department")
  );
};

export const findDepartmentFilterInList = (filters) => {
  const list = filters || [];
  // Prefer exact Category / Department matches, then fuzzy department-like names.
  for (const name of DEPARTMENT_FILTER_ALIASES) {
    const match = list.find(
      (f) => normalizeFieldName(f.fieldName) === normalizeFieldName(name)
    );
    if (match) {
      return match;
    }
  }
  const fuzzy = list.find((f) => isDepartmentFieldName(f.fieldName));
  return fuzzy || null;
};

export const findDepartmentValuesInFilters = (filters) => {
  const department = findDepartmentFilterInList(filters);
  if (!department || !Array.isArray(department.values)) {
    return [];
  }
  return department.values.filter(
    (value) => value && value !== "(All)" && value !== "All Departments"
  );
};

/** Department list from in-memory BigQuery-backed filter state. */
export const getDepartmentValues = (_dashboardKey, dashboardFilters) =>
  findDepartmentValuesInFilters(dashboardFilters);

export const sheetNameFromLink = (link) => (link || "").split("/").pop() || "";

/** Tableau boolean parameters that tell the workbook a department is in view. */
export const DEPARTMENT_SELECTED_PARAM = "Department Selected";
export const CATEGORY_SELECTED_PARAM = "Category Selected";
export const LOCATION_SELECTED_PARAM = "Location Selected";

/** The Departments sidebar opens the Detail sheet; every other role does not. */
export const isDepartmentSheetRole = (role) => role === "detail";

export const hasLocationSelection = (selections) =>
  Boolean(selections && selections[LOCATION_FILTER]);

/**
 * Values to pass as <viz-parameter> (and via changeParameterValueAsync).
 * Dashboards outside Departments load with the flags False so Tableau does not
 * treat the overview/funding views as a selected department. Location Selected
 * is True only on the Departments sheet when a Location filter is applied.
 */
export const selectionParametersForRole = (role, { locationSelected } = {}) => {
  const selected = isDepartmentSheetRole(role) ? "True" : "False";
  return [
    { name: DEPARTMENT_SELECTED_PARAM, value: selected },
    { name: CATEGORY_SELECTED_PARAM, value: selected },
    {
      name: LOCATION_SELECTED_PARAM,
      value: selected === "True" && locationSelected ? "True" : "False",
    },
  ];
};

export const locationSelectedParameter = (selected) => ({
  name: LOCATION_SELECTED_PARAM,
  value: selected ? "True" : "False",
});

export const matchSheetRole = (link) => {
  const path = (link || "").toLowerCase();
  if (path.includes("capitalplanoverview")) {
    return "overview";
  }
  if (path.includes("capitalplandetail")) {
    return "detail";
  }
  if (path.endsWith("/forecast") || path.includes("/forecast")) {
    return "forecast";
  }
  if (path.includes("financ")) {
    return "financing";
  }
  return null;
};

/**
 * Work out whether an entry URL should open the Detail sheet pre-filtered.
 *
 * Returns null when the URL carries no filters, or when the workbook has no
 * Detail sheet to open. Otherwise the caller has everything it needs to seed
 * its first render, including `declarative`: the filters to hand to Tableau as
 * <viz-filter> children so the very first paint is already narrowed.
 *
 * `declarative` names the department dimension `Category`. Some workbooks call
 * it `Department` instead, and that is only discoverable after the filter rows
 * load. A miss is harmless — Tableau ignores an unknown field and the regular
 * post-load filter pass still applies it.
 */
export const resolveEntryRestore = ({
  portalView,
  embedContent,
  selections = {},
  detailLink,
} = {}) => {
  if (portalView !== "capital-plan" || embedContent !== "dashboard") {
    return null;
  }
  if (!detailLink) {
    return null;
  }

  const department = selections[CATEGORY_FILTER] || null;
  const topFilters = {};
  TOP_FILTER_ORDER.forEach((name) => {
    if (selections[name]) {
      topFilters[name] = selections[name];
    }
  });
  if (!department && Object.keys(topFilters).length === 0) {
    return null;
  }

  const declarative = [];
  const declare = (field, value) => {
    // <viz-filter> treats value as a comma-delimited list, so a name that
    // contains a comma would be split into two values that match nothing.
    // Leave those to the API pass, which takes a real array.
    if (value && !value.includes(",")) {
      declarative.push({ field, value });
    }
  };
  if (department) {
    declare(CATEGORY_FILTER, department);
  }
  TOP_FILTER_ORDER.forEach((name) => declare(name, topFilters[name]));

  return { selections, department, topFilters, detailLink, declarative };
};

/** Resolve fixed sheet roles from the capital-plan workbook only. */
export const resolveCapitalPlanSheetMap = (navigationEntries) => {
  const empty = {
    overview: null,
    detail: null,
    forecast: null,
    financing: null,
  };
  const workbook = (navigationEntries || []).find(
    ([, entry]) => entry && entry.name === CAPITAL_PLAN_WORKBOOK
  );
  if (!workbook) {
    return empty;
  }
  const [, entry] = workbook;
  const map = { ...empty };
  (entry.dashboards || []).forEach((link, i) => {
    const role = matchSheetRole(link);
    if (!role || map[role]) {
      return;
    }
    map[role] = {
      link,
      id: (entry.dashboard_ids || [])[i],
      label: (link || "").split("/").pop(),
      role,
    };
  });
  return map;
};
