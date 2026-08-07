import classes from "./Landing.module.scss";
import { useRef, useEffect, useState, useContext } from "react";
import ValidUserContext from "../authCheck";
import menuIcon from "../assets/fa-menu.svg";
import { useSwipeable } from "react-swipeable";
import Dashboard from "./Dashboard";
import oarLogo from "../assets/oar-logo-transparent-replit.png";
import PortalHome from "./PortalHome";
import AdminPanel from "./AdminPanel";
import ProjectTimeline from "./ProjectTimeline";
import heroFallback from "../assets/portal-hero.webp";
import {
  fetchAdminDistricts,
  fetchDistrictBranding,
  fetchDashboardFilters,
} from "./ApiService";

const SITE_ADMIN_ROLE = "SiteAdministratorCreator";
const DEFAULT_BRAND_COLOR = "#e6b422";
const DEFAULT_LOGO_URL =
  "https://storage.googleapis.com/bp_portal_artifacts/bradleypayne.png";

const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

const FILTER_ORDER = ["Category", "Location Type", "Location"];
const TOP_FILTER_ORDER = ["Location Type", "Location"];
/** Still cleared on the Tableau viz when resetting filters (workbook field). */
const TABLEAU_EXTRA_CLEAR_FILTERS = ["Type"];
const CATEGORY_FILTER = "Category";
/** Tableau may expose the department dimension as Category or Department. */
const DEPARTMENT_FILTER_ALIASES = ["Category", "Department"];
const WORKBOOK_NAME = "Xeo Testing II";

/**
 * Build Tableau-shaped filter metadata from BigQuery capital-plan rows.
 * Categories are ordered by total expense descending; Location Type / Location
 * cascade from the current selections.
 */
const buildFiltersFromRows = (rows, selections = {}) => {
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
  const selectedLocation = selections.Location;

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

  const appliedFor = (fieldName, selected) =>
    selected ? [selected] : [];

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
      fieldName: "Location",
      worksheetNames: [],
      values: locations,
      appliedValues: appliedFor("Location", selectedLocation),
      isAllSelected: !selectedLocation,
      filterType: "categorical",
    },
  ];
};

const orderTopFilters = (filters) =>
  TOP_FILTER_ORDER.map((name) => (filters || []).find((f) => f.fieldName === name)).filter(
    Boolean
  );

const normalizeFieldName = (fieldName) =>
  String(fieldName || "")
    .replace(/[\[\]]/g, "")
    .trim()
    .toLowerCase();

/** True when a Tableau field should drive the Departments side nav. */
const isDepartmentFieldName = (fieldName) => {
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

const findDepartmentFilterInList = (filters) => {
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

const findDepartmentValuesInFilters = (filters) => {
  const department = findDepartmentFilterInList(filters);
  if (!department || !Array.isArray(department.values)) {
    return [];
  }
  return department.values.filter(
    (value) => value && value !== "(All)" && value !== "All Departments"
  );
};

/** Department list from in-memory BigQuery-backed filter state. */
const getDepartmentValues = (_dashboardKey, dashboardFilters) =>
  findDepartmentValuesInFilters(dashboardFilters);

const sheetNameFromLink = (link) => (link || "").split("/").pop() || "";

const matchSheetRole = (link) => {
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

/** Resolve fixed sheet roles from the Xeo Testing II workbook only. */
const resolveXeoSheetMap = (navigationEntries) => {
  const empty = {
    overview: null,
    detail: null,
    forecast: null,
    financing: null,
  };
  const workbook = (navigationEntries || []).find(
    ([, entry]) => entry && entry.name === WORKBOOK_NAME
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

const Landing = ({ idleCountParam }) => {
  const currentNav = Object.entries(JSON.parse(localStorage.getItem("navigation")) || {});
  const filteredNav = currentNav.filter(([, b]) => !b.name.includes("Curves Export"));
  const sortedNav = filteredNav.sort((a, b) => (a[1].name > b[1].name ? 1 : -1));

  const clientGroupRaw = JSON.parse(localStorage.getItem("client_list"));
  const clientGroup =
    typeof clientGroupRaw === "string" && clientGroupRaw ? clientGroupRaw : null;
  const group = JSON.parse(localStorage.getItem("group")) ?? "default";
  const role = JSON.parse(localStorage.getItem("role")) ?? "";
  const isSiteAdmin = role === SITE_ADMIN_ROLE;

  const sheetMap = resolveXeoSheetMap(sortedNav);
  const detailLink = sheetMap.detail?.link || "";
  const overviewLink = sheetMap.overview?.link || detailLink;
  const overviewId = sheetMap.overview?.id || sheetMap.detail?.id;

  const [portalView, setPortalView] = useState("home");
  const [embedContent, setEmbedContent] = useState("dashboard"); // dashboard | timeline
  const [activeNavRole, setActiveNavRole] = useState("overview"); // overview | detail | forecast | financing | timeline
  const [menuOpen, setMenuOpen] = useState(!isMobileDevice());
  const [adminDistrictNames, setAdminDistrictNames] = useState([]);
  const [brandLogoUrl, setBrandLogoUrl] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("logo_url")) || "";
    } catch {
      return "";
    }
  });
  const [brandColor, setBrandColor] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("custom_color")) || DEFAULT_BRAND_COLOR;
    } catch {
      return DEFAULT_BRAND_COLOR;
    }
  });

  const [activeDashboard, setActiveDashboard] = useState(true);
  const [activeURL, setActiveURL] = useState(overviewLink);
  // Stable Tableau embed src. Sheet switches within Xeo Testing II prefer
  // activateSheetAsync so filters can be applied without reloading the JWT viz.
  const [vizSrcLink, setVizSrcLink] = useState(overviewLink);
  const [activeDashboardId, setActiveDashboardId] = useState(overviewId);
  const [displayTabs, setDisplayTabs] = useState(false);

  const [defaultGroup, setDefaultGroup] = useState(() => {
    if (group === "Admin") {
      return clientGroup || "default";
    }
    return clientGroup || group;
  });

  const [dashboardFilters, setDashboardFilters] = useState([]);
  const [filterSelections, setFilterSelections] = useState({});
  const [vizReady, setVizReady] = useState(false);

  const [detailsOverlayOpen, setDetailsOverlayOpen] = useState(false);
  const [detailsImageUrl, setDetailsImageUrl] = useState(null);

  const [idleCount, setIdleCount] = useState(idleCountParam);

  const containerRef = useRef(null);
  const dashboardRef = useRef(null);
  const sidebarRef = useRef(null);
  const vizRef = useRef(null);
  const activeURLRef = useRef(overviewLink);
  const activeNavRoleRef = useRef("overview");
  const filterOpSeqRef = useRef(0);
  const vizOpChainRef = useRef(Promise.resolve());
  const dashboardFiltersRef = useRef(dashboardFilters);
  const pendingDepartmentRef = useRef(null); // null | "__ALL__" | department name
  const sheetMapRef = useRef(sheetMap);
  const filterRowsRef = useRef(null);
  const filterRowsPromiseRef = useRef(null);

  useEffect(() => {
    activeURLRef.current = activeURL;
  }, [activeURL]);

  useEffect(() => {
    activeNavRoleRef.current = activeNavRole;
  }, [activeNavRole]);

  useEffect(() => {
    dashboardFiltersRef.current = dashboardFilters;
  }, [dashboardFilters]);

  useEffect(() => {
    sheetMapRef.current = sheetMap;
  }, [sheetMap]);

  const validUserContext = useContext(ValidUserContext);

  const ensureFilterRows = async () => {
    if (Array.isArray(filterRowsRef.current)) {
      return filterRowsRef.current;
    }
    if (filterRowsPromiseRef.current) {
      return filterRowsPromiseRef.current;
    }
    filterRowsPromiseRef.current = fetchDashboardFilters()
      .then((data) => {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        filterRowsRef.current = rows;
        return rows;
      })
      .catch((error) => {
        console.error("Error loading dashboard filters from database:", error);
        filterRowsRef.current = filterRowsRef.current || [];
        return filterRowsRef.current;
      })
      .finally(() => {
        filterRowsPromiseRef.current = null;
      });
    return filterRowsPromiseRef.current;
  };

  // Prefetch filter domains from BigQuery so Departments are ready before Tableau.
  // Also drop the legacy Tableau extract cache if it is still present.
  useEffect(() => {
    try {
      localStorage.removeItem("dashboard_filter_cache");
    } catch (error) {
      // ignore
    }
    let cancelled = false;
    ensureFilterRows().then((rows) => {
      if (cancelled || !rows?.length) {
        return;
      }
      if (
        !dashboardFiltersRef.current?.length ||
        findDepartmentValuesInFilters(dashboardFiltersRef.current).length === 0
      ) {
        setDashboardFilters(buildFiltersFromRows(rows, {}));
      }
    });
    return () => {
      cancelled = true;
    };
    // intentionally once on mount for the signed-in session
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (idleCountParam !== idleCount) {
      setIdleCount(idleCountParam);
      handleBackgroundRefresh();
    }
  }, [idleCountParam]);

  useEffect(() => {
    if (group !== "Admin") {
      return undefined;
    }
    let cancelled = false;
    fetchAdminDistricts()
      .then((data) => {
        if (cancelled) return;
        const names = (data.districts || [])
          .map((d) => d.district_name)
          .filter(Boolean);
        setAdminDistrictNames(names);
        setDefaultGroup((current) => {
          if (names.includes(current)) return current;
          return names[0] || clientGroup || current || "default";
        });
      })
      .catch(() => {
        if (!cancelled && clientGroup) {
          setAdminDistrictNames([clientGroup]);
        }
      });
    return () => {
      cancelled = true;
    };
  }, [group, clientGroup]);

  const activeDistrictName = clientGroup || defaultGroup;

  useEffect(() => {
    const districtName = (activeDistrictName || "").trim();
    if (!districtName || districtName === "default" || districtName === "Admin") {
      return undefined;
    }
    let cancelled = false;
    fetchDistrictBranding({ districtName })
      .then((data) => {
        if (cancelled) return;
        const branding = data.branding || {};
        setBrandLogoUrl(branding.logo_url || "");
        setBrandColor(branding.custom_color || DEFAULT_BRAND_COLOR);
        localStorage.setItem("logo_url", JSON.stringify(branding.logo_url || ""));
        localStorage.setItem(
          "custom_color",
          JSON.stringify(branding.custom_color || DEFAULT_BRAND_COLOR)
        );
      })
      .catch(() => {
        // Keep login-cached branding when the lookup fails.
      });
    return () => {
      cancelled = true;
    };
  }, [activeDistrictName]);

  const handleOutsideClick = (event) => {
    if (!isMobileDevice()) {
      return;
    }
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setMenuOpen(false);
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => setMenuOpen(false),
    preventDefaultTouchmoveEvent: true,
    trackMouse: true,
  });

  useEffect(() => {
    if (menuOpen) {
      document.addEventListener("mousedown", handleOutsideClick);
    } else {
      document.removeEventListener("mousedown", handleOutsideClick);
    }
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, [menuOpen]);

  const handleLogoutClick = () => {
    validUserContext.logoutUser();
  };

  const handleExportPNGClick = () => {
    try {
      const viz =
        vizRef.current || dashboardRef.current?.firstChild?.firstChild?.childNodes?.[1];
      if (viz && viz.exportImageAsync) {
        viz.exportImageAsync();
      }
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  const handleBackgroundRefresh = () => {
    try {
      const viz =
        vizRef.current || dashboardRef.current?.firstChild?.firstChild?.childNodes?.[1];
      if (viz && viz.refreshDataAsync) {
        viz.refreshDataAsync().catch((error) => {
          console.error("Error refreshing dashboard:", error);
        });
      }
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  };

  const getDepartmentFieldName = (filters = dashboardFiltersRef.current) => {
    const match = findDepartmentFilterInList(filters);
    return match?.fieldName || CATEGORY_FILTER;
  };

  const getSelectedDepartment = (selections = filterSelections) => {
    for (const name of DEPARTMENT_FILTER_ALIASES) {
      if (selections[name] !== undefined) {
        return selections[name];
      }
    }
    return undefined;
  };

  const activateWorkbookSheet = async (viz, link) => {
    if (!viz?.workbook || !link) {
      return false;
    }
    const target = sheetNameFromLink(link);
    if (!target) {
      return false;
    }
    const published = viz.workbook.publishedSheetsInfo || [];
    const match =
      published.find((sheet) => sheet.name === target) ||
      published.find(
        (sheet) =>
          (sheet.name || "").replace(/\s+/g, "").toLowerCase() ===
          target.replace(/\s+/g, "").toLowerCase()
      ) ||
      published.find((sheet) =>
        (sheet.url || "").toLowerCase().includes(target.toLowerCase())
      );
    if (!match) {
      return false;
    }
    try {
      await viz.workbook.activateSheetAsync(match.name);
      return true;
    } catch (error) {
      console.warn(`Unable to activate sheet "${match.name}":`, error);
      return false;
    }
  };

  const applyFilterValue = async (viz, filter, value) => {
    if (!viz || !filter?.fieldName) {
      return;
    }
    const activeSheet = viz.workbook?.activeSheet;
    if (!activeSheet) {
      console.warn("No active sheet available to apply filter");
      return;
    }
    const worksheets =
      activeSheet.sheetType === "dashboard" ? activeSheet.worksheets : [activeSheet];

    let applied = false;
    for (const worksheet of worksheets) {
      if ((worksheet.name || "").toUpperCase().includes("TOTAL CAPITAL")) {
        continue;
      }
      try {
        if (value === "__ALL__") {
          await worksheet.clearFilterAsync(filter.fieldName);
        } else {
          await worksheet.applyFilterAsync(filter.fieldName, [value], "replace");
        }
        applied = true;
      } catch (error) {
        // Worksheet may not expose this field — continue trying others.
      }
    }

    if (!applied) {
      console.warn(`Unable to apply filter "${filter.fieldName}" to any worksheet`);
    }
  };

  const resolveFilterMeta = (fieldName, fallback) => {
    const fromState = dashboardFiltersRef.current.find((f) => f.fieldName === fieldName);
    if (fromState) {
      return fromState;
    }
    if (fallback && fallback.fieldName === fieldName) {
      return fallback;
    }
    return {
      fieldName,
      worksheetNames: [],
      values: [],
    };
  };

  const syncFiltersFromRows = (selections) => {
    const rows = filterRowsRef.current;
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    const fresh = buildFiltersFromRows(rows, selections || {});
    setDashboardFilters(fresh);
    return fresh;
  };

  const enqueueVizOp = (op) => {
    const next = vizOpChainRef.current.then(op).catch((error) => {
      console.error("Error in queued viz operation:", error);
    });
    vizOpChainRef.current = next;
    return next;
  };

  const backgroundRefresh = async (_viz, dashboardKey, selections, seq) => {
    const rows = await ensureFilterRows();
    if (!rows?.length) {
      console.warn("No capital-plan filter rows returned from database.");
      return [];
    }

    const fresh = buildFiltersFromRows(rows, selections || {});
    const onDetailDashboard =
      !dashboardKey || activeURLRef.current === dashboardKey;
    if (seq === filterOpSeqRef.current && onDetailDashboard) {
      setDashboardFilters(fresh);
    } else if (
      findDepartmentValuesInFilters(dashboardFiltersRef.current).length === 0
    ) {
      // Keep Departments side nav populated even when not on Detail.
      setDashboardFilters(buildFiltersFromRows(rows, {}));
    }
    return fresh;
  };

  const clearTableauExtraFilters = async (viz) => {
    for (const name of TABLEAU_EXTRA_CLEAR_FILTERS) {
      await applyFilterValue(viz, { fieldName: name }, "__ALL__");
    }
  };

  const applyDepartmentOnViz = async (viz, departmentValue, dashboardKey) => {
    const seq = ++filterOpSeqRef.current;
    const departmentField = getDepartmentFieldName();
    const newSelections = departmentValue
      ? { [departmentField]: departmentValue }
      : {};
    setFilterSelections(newSelections);
    syncFiltersFromRows(newSelections);

    await enqueueVizOp(async () => {
      const categoryFilter = resolveFilterMeta(departmentField);
      if (departmentValue) {
        await applyFilterValue(viz, categoryFilter, departmentValue);
      } else {
        await applyFilterValue(viz, categoryFilter, "__ALL__");
        for (const alias of DEPARTMENT_FILTER_ALIASES) {
          if (alias !== departmentField) {
            await applyFilterValue(viz, { fieldName: alias }, "__ALL__");
          }
        }
      }
      for (const name of TOP_FILTER_ORDER) {
        const downstreamFilter = resolveFilterMeta(name);
        await applyFilterValue(viz, downstreamFilter, "__ALL__");
      }
      await clearTableauExtraFilters(viz);
      await backgroundRefresh(viz, dashboardKey, newSelections, seq);
    });
  };

  const isDetailRole = (role) => role === "detail";

  const runDetailReady = (viz, { pending } = {}) => {
    vizRef.current = viz;
    const dashboardKey =
      sheetMapRef.current.detail?.link || activeURLRef.current;
    setVizReady(true);

    const seq = ++filterOpSeqRef.current;
    const pendingValue =
      pending !== undefined ? pending : pendingDepartmentRef.current;
    pendingDepartmentRef.current = null;

    const departmentField = getDepartmentFieldName();
    const initialSelections =
      pendingValue && pendingValue !== "__ALL__"
        ? { [departmentField]: pendingValue }
        : {};
    setFilterSelections(initialSelections);
    syncFiltersFromRows(initialSelections);

    enqueueVizOp(async () => {
      // Load filter domains from BigQuery, then apply to Tableau.
      const fresh = await backgroundRefresh(
        viz,
        dashboardKey,
        initialSelections,
        seq
      );
      const liveDepartmentField = getDepartmentFieldName(
        fresh?.length ? fresh : dashboardFiltersRef.current
      );

      if (pendingValue && pendingValue !== "__ALL__") {
        await applyFilterValue(
          viz,
          resolveFilterMeta(liveDepartmentField),
          pendingValue
        );
        for (const name of TOP_FILTER_ORDER) {
          await applyFilterValue(viz, resolveFilterMeta(name), "__ALL__");
        }
        await clearTableauExtraFilters(viz);
        await backgroundRefresh(viz, dashboardKey, initialSelections, seq);
      } else {
        await applyFilterValue(
          viz,
          resolveFilterMeta(liveDepartmentField),
          "__ALL__"
        );
        for (const alias of DEPARTMENT_FILTER_ALIASES) {
          if (alias !== liveDepartmentField) {
            await applyFilterValue(viz, { fieldName: alias }, "__ALL__");
          }
        }
        for (const name of TOP_FILTER_ORDER) {
          await applyFilterValue(viz, resolveFilterMeta(name), "__ALL__");
        }
        await clearTableauExtraFilters(viz);
      }
    });
  };

  const handleDashboardReady = (viz) => {
    vizRef.current = viz;
    const role = activeNavRoleRef.current;
    setVizReady(true);

    // Overview / Funding: no filter extraction.
    if (!isDetailRole(role)) {
      setFilterSelections({});
      return;
    }

    runDetailReady(viz);
  };

  const handleTopFilterChange = (filter, value) => {
    if (!vizReady || activeNavRole !== "detail") {
      return;
    }
    const viz = vizRef.current;
    if (!viz) {
      return;
    }
    validUserContext.localAuthCheck(false);
    const dashboardKey = activeURLRef.current;

    const indexInOrder = FILTER_ORDER.indexOf(filter.fieldName);
    const downstream = FILTER_ORDER.slice(indexInOrder + 1);
    const newSelections = { ...filterSelections };
    if (!value) {
      delete newSelections[filter.fieldName];
    } else {
      newSelections[filter.fieldName] = value;
    }
    downstream.forEach((name) => {
      delete newSelections[name];
    });

    const seq = ++filterOpSeqRef.current;
    setFilterSelections(newSelections);
    syncFiltersFromRows(newSelections);

    enqueueVizOp(async () => {
      const liveFilter = resolveFilterMeta(filter.fieldName, filter);
      if (!value) {
        await applyFilterValue(viz, liveFilter, "__ALL__");
      } else {
        await applyFilterValue(viz, liveFilter, value);
      }
      for (const name of downstream) {
        const downstreamFilter = resolveFilterMeta(name);
        await applyFilterValue(viz, downstreamFilter, "__ALL__");
      }
      if (filter.fieldName !== "Location") {
        await clearTableauExtraFilters(viz);
      }
      await backgroundRefresh(viz, dashboardKey, newSelections, seq);
    });
  };

  const openSheet = (role, { clearFilters = true } = {}) => {
    const sheet = sheetMapRef.current[role];
    if (!sheet?.link) {
      console.warn(`No sheet mapped for role: ${role}`);
      return;
    }
    validUserContext.localAuthCheck(false);
    setEmbedContent("dashboard");
    setActiveNavRole(role);
    activeNavRoleRef.current = role;
    setActiveDashboard(true);
    setDisplayTabs(false);
    pendingDepartmentRef.current = null;

    if (clearFilters && role !== "detail") {
      setFilterSelections({});
    }

    if (activeURLRef.current === sheet.link && vizReady && vizRef.current) {
      if (isMobileDevice()) {
        setMenuOpen(false);
      }
      return false;
    }

    filterOpSeqRef.current++;
    activeURLRef.current = sheet.link;
    setActiveURL(sheet.link);
    setActiveDashboardId(sheet.id);
    if (role === "detail") {
      syncFiltersFromRows(filterSelections);
    }

    const viz = vizRef.current;
    if (vizReady && viz?.workbook) {
      setVizReady(false);
      enqueueVizOp(async () => {
        const activated = await activateWorkbookSheet(viz, sheet.link);
        if (activated) {
          if (role === "detail") {
            runDetailReady(viz, { pending: null });
          } else {
            setVizReady(true);
          }
        } else {
          setVizSrcLink(sheet.link);
          setVizReady(false);
        }
      });
    } else {
      setVizSrcLink(sheet.link);
      setVizReady(false);
    }

    if (isMobileDevice()) {
      setMenuOpen(false);
    }
    return true;
  };

  const handleDepartmentSelect = (value) => {
    validUserContext.localAuthCheck(false);
    if (!value) {
      return;
    }

    const detail = sheetMapRef.current.detail;
    if (!detail?.link) {
      console.warn("CapitalPlanDetail sheet not found in Xeo Testing II navigation");
      return;
    }

    const wasShowingDetail =
      embedContent === "dashboard" &&
      activeURLRef.current === detail.link &&
      activeNavRole === "detail" &&
      vizReady &&
      !!vizRef.current;

    setEmbedContent("dashboard");
    setActiveNavRole("detail");
    activeNavRoleRef.current = "detail";

    // Already on Detail: apply the department filter.
    if (wasShowingDetail) {
      applyDepartmentOnViz(vizRef.current, value, detail.link);
      if (isMobileDevice()) {
        setMenuOpen(false);
      }
      return;
    }

    pendingDepartmentRef.current = value;
    const departmentField = getDepartmentFieldName();
    setFilterSelections({ [departmentField]: value });
    filterOpSeqRef.current++;
    activeURLRef.current = detail.link;
    setActiveURL(detail.link);
    setActiveDashboardId(detail.id);
    setActiveDashboard(true);
    syncFiltersFromRows({ [departmentField]: value });
    setDisplayTabs(false);

    const viz = vizRef.current;
    if (embedContent === "dashboard" && vizReady && viz?.workbook) {
      setVizReady(false);
      enqueueVizOp(async () => {
        const activated = await activateWorkbookSheet(viz, detail.link);
        if (activated) {
          runDetailReady(viz, { pending: value });
        } else {
          setVizSrcLink(detail.link);
          setVizReady(false);
        }
      });
    } else {
      setVizSrcLink(detail.link);
      setVizReady(false);
    }

    if (isMobileDevice()) {
      setMenuOpen(false);
    }
  };

  const handleClearTopFilters = () => {
    if (!vizReady || activeNavRole !== "detail") {
      return;
    }
    const viz = vizRef.current;
    if (!viz) {
      return;
    }
    validUserContext.localAuthCheck(false);
    const dashboardKey = activeURLRef.current;
    const newSelections = {};
    const selectedDept = getSelectedDepartment(filterSelections);
    const departmentField = getDepartmentFieldName();
    if (selectedDept !== undefined) {
      newSelections[departmentField] = selectedDept;
    }
    const seq = ++filterOpSeqRef.current;
    setFilterSelections(newSelections);
    syncFiltersFromRows(newSelections);

    enqueueVizOp(async () => {
      for (const name of TOP_FILTER_ORDER) {
        const downstreamFilter = resolveFilterMeta(name);
        await applyFilterValue(viz, downstreamFilter, "__ALL__");
      }
      await clearTableauExtraFilters(viz);
      await backgroundRefresh(viz, dashboardKey, newSelections, seq);
    });
  };

  const buildDetailsUrl = (segments) => {
    const encoded = segments.map((s) => encodeURIComponent(s)).join("/");
    return `https://storage.googleapis.com/bp_portal_artifacts/details/${encoded}/display.jpg`;
  };

  const getDetailsCandidateSegments = () => {
    const client = clientGroup || defaultGroup;
    const departmentField = getDepartmentFieldName();
    const orderedNames = [departmentField, ...TOP_FILTER_ORDER];
    const filterSegments = orderedNames
      .filter((name) => filterSelections[name] !== undefined)
      .map((name) => filterSelections[name]);
    return [client, ...filterSegments];
  };

  const handleOpenDetails = () => {
    setDetailsImageUrl(buildDetailsUrl(getDetailsCandidateSegments()));
    setDetailsOverlayOpen(true);
  };

  const handleDetailsImageError = () => {
    setDetailsImageUrl((current) => {
      if (!current) {
        return null;
      }
      const base = "https://storage.googleapis.com/bp_portal_artifacts/details/";
      const withoutBase = current.replace(base, "").replace("/display.jpg", "");
      const parts = withoutBase.split("/").map(decodeURIComponent);
      if (parts.length <= 2) {
        return null;
      }
      return buildDetailsUrl(parts.slice(0, -1));
    });
  };

  const handleTimelineClick = () => {
    validUserContext.localAuthCheck(false);
    setEmbedContent("timeline");
    setActiveNavRole("timeline");
    setFilterSelections({});
    if (isMobileDevice()) {
      setMenuOpen(false);
    }
  };

  const handleOverviewClick = () => {
    pendingDepartmentRef.current = null;
    openSheet("overview", { clearFilters: true });
  };

  const handleFundingClick = (role) => {
    pendingDepartmentRef.current = null;
    openSheet(role, { clearFilters: true });
  };

  const handleMenuClick = () => {
    setMenuOpen((open) => !open);
  };

  const renderContent = () => {
    const timelineClient = (clientGroup || defaultGroup || "").toLowerCase();
    return (
      <>
        {activeDashboard && activeURL ? (
          <div
            style={{
              display: embedContent === "timeline" ? "none" : "contents",
            }}
          >
            <Dashboard
              dashboardLinkProp={vizSrcLink}
              displayTabs={displayTabs}
              idleCount={idleCount}
              onDashboardReady={handleDashboardReady}
            />
          </div>
        ) : null}
        {embedContent === "timeline" ? (
          <ProjectTimeline clientKey={timelineClient} />
        ) : null}
      </>
    );
  };

  const setSelectedClient = (event) => {
    setDefaultGroup(event);
    setVizReady(false);
    setEmbedContent("dashboard");
    setActiveNavRole("overview");
    pendingDepartmentRef.current = null;
    filterOpSeqRef.current++;
    setFilterSelections({});
    const overview = sheetMapRef.current.overview;
    if (overview?.link) {
      activeURLRef.current = overview.link;
      setActiveURL(overview.link);
      setVizSrcLink(overview.link);
      setActiveDashboardId(overview.id);
      syncFiltersFromRows({});
    }
  };

  const renderDetailsOverlay = () => {
    if (!detailsOverlayOpen) {
      return null;
    }
    const selectionCrumbs = [getDepartmentFieldName(), ...TOP_FILTER_ORDER]
      .filter((name) => filterSelections[name] !== undefined)
      .map((name) => filterSelections[name]);

    return (
      <div className={classes.detailsOverlay} onClick={() => setDetailsOverlayOpen(false)}>
        <div className={classes.detailsModal} onClick={(e) => e.stopPropagation()}>
          <div className={classes.detailsModalHeader}>
            <div className={classes.detailsBreadcrumb}>
              {[defaultGroup, ...selectionCrumbs].join(" › ")}
            </div>
            <button
              className={classes.detailsCloseBtn}
              onClick={() => setDetailsOverlayOpen(false)}
              aria-label="Close"
            >
              ✕
            </button>
          </div>
          <div className={classes.detailsModalBody}>
            {detailsImageUrl ? (
              <img
                className={classes.detailsImage}
                src={detailsImageUrl}
                alt="Details"
                onError={handleDetailsImageError}
              />
            ) : (
              <div className={classes.detailsNoContent}>
                <div>No details available for this selection.</div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  const departmentValues = getDepartmentValues(detailLink, dashboardFilters);
  const selectedDepartment = getSelectedDepartment(filterSelections);
  const topFilters = orderTopFilters(dashboardFilters);
  const hasTopSelection = TOP_FILTER_ORDER.some(
    (name) => filterSelections[name] !== undefined
  );
  const onDetail = embedContent === "dashboard" && activeNavRole === "detail";

  const randomNumber = Math.floor(Math.random() * 1000000);
  const logoKey = (clientGroup || defaultGroup).toLowerCase();
  const displayName = clientGroup || defaultGroup;
  const legacyLogoLink = `https://storage.googleapis.com/bp_portal_artifacts/${logoKey}.png?v=${randomNumber}`;
  const defaultLink = `${DEFAULT_LOGO_URL}?v=${randomNumber}`;
  const companyLink = brandLogoUrl
    ? `${brandLogoUrl}${brandLogoUrl.includes("?") ? "&" : "?"}v=${randomNumber}`
    : legacyLogoLink;
  const themeStyle = { "--client-accent": brandColor || DEFAULT_BRAND_COLOR };

  const handleLogoError = (event) => {
    if (event.target.dataset.fallback === "legacy" || !brandLogoUrl) {
      event.target.src = defaultLink;
      return;
    }
    event.target.dataset.fallback = "legacy";
    event.target.src = legacyLogoLink;
  };

  const renderSidebarNav = () => (
    <>
      <div className={classes.navSection}>
        <div className={classes.navSectionTitle}>At a Glance</div>
        <div
          className={`${classes.sideButton} ${
            embedContent === "timeline" ? classes.active : ""
          }`}
          onClick={handleTimelineClick}
        >
          Project Timeline
        </div>
        {sheetMap.overview && (
          <div
            className={`${classes.sideButton} ${
              embedContent === "dashboard" && activeNavRole === "overview"
                ? classes.active
                : ""
            }`}
            onClick={handleOverviewClick}
          >
            Capital Plan Overview
          </div>
        )}
      </div>

      <div className={classes.navSection}>
        <div className={classes.navSectionTitle}>Departments</div>
        {departmentValues.map((value) => (
          <div
            key={value}
            className={`${classes.sideButton} ${
              onDetail && selectedDepartment === value ? classes.active : ""
            }`}
            onClick={() => handleDepartmentSelect(value)}
          >
            {value}
          </div>
        ))}
      </div>

      {(sheetMap.forecast || sheetMap.financing) && (
        <div className={classes.navSection}>
          <div className={classes.navSectionTitle}>Funding</div>
          {sheetMap.forecast && (
            <div
              className={`${classes.sideButton} ${
                embedContent === "dashboard" && activeNavRole === "forecast"
                  ? classes.active
                  : ""
              }`}
              onClick={() => handleFundingClick("forecast")}
            >
              Forecast
            </div>
          )}
          {sheetMap.financing && (
            <div
              className={`${classes.sideButton} ${
                embedContent === "dashboard" && activeNavRole === "financing"
                  ? classes.active
                  : ""
              }`}
              onClick={() => handleFundingClick("financing")}
            >
              Financing
            </div>
          )}
        </div>
      )}
    </>
  );

  const renderTopFilters = () => {
    if (!onDetail) {
      return null;
    }
    const interactionDisabled = !vizReady;
    const filtersToShow =
      topFilters.length > 0
        ? topFilters
        : TOP_FILTER_ORDER.map((fieldName) => ({
            fieldName,
            values: [],
            worksheetNames: [],
          }));

    return (
      <div className={classes.contextBar}>
        <div className={classes.contextBarFilters}>
          <span className={classes.contextBarLabel}>Filter by</span>
          {filtersToShow.map((filter) => {
            const selected = filterSelections[filter.fieldName] ?? "";
            return (
              <div className={classes.contextBarItem} key={filter.fieldName}>
                <div className={classes.contextBarSelectWrapper}>
                  <select
                    className={classes.contextBarSelect}
                    disabled={interactionDisabled || !(filter.values || []).length}
                    value={selected}
                    onChange={(e) => handleTopFilterChange(filter, e.target.value)}
                  >
                    <option value="">
                      All {filter.fieldName.replace(/Type$/, "Types")}
                    </option>
                    {(filter.values || []).map((value, valueIndex) => (
                      <option key={valueIndex} value={value}>
                        {value}
                      </option>
                    ))}
                  </select>
                  <span className={classes.contextBarArrow}>▾</span>
                </div>
              </div>
            );
          })}
        </div>
        {hasTopSelection && (
          <button
            className={`${classes.contextBarClear} ${
              interactionDisabled ? classes.contextBarClearDisabled : ""
            }`}
            onClick={handleClearTopFilters}
            disabled={interactionDisabled}
          >
            Clear
          </button>
        )}
        {selectedDepartment !== undefined && (
          <button
            className={classes.detailsButton}
            onClick={handleOpenDetails}
            title="View details for current selection"
            type="button"
          >
            Details
          </button>
        )}
      </div>
    );
  };

  const renderAppTopBar = () => (
    <header className={classes.appTopBar}>
      <div className={classes.appTopBarLeft}>
        {isMobileDevice() && (
          <img
            className={classes.menuicon}
            src={menuIcon}
            alt="Menu"
            onClick={handleMenuClick}
          />
        )}
        <img
          className={classes.appTopBarLogo}
          src={companyLink}
          alt={displayName}
          onError={handleLogoError}
        />
        <div className={classes.appTopBarText}>
          <div className={classes.appTopBarTitle}>
            {displayName}
            <span className={classes.appTopBarSep}>|</span>
            <span className={classes.appTopBarTag}>Empower · Challenge · Support</span>
          </div>
          <div className={classes.appTopBarSub}>
            Capital Plan Portal · FY 2026–2035
          </div>
        </div>
      </div>
      <div className={classes.appTopBarActions}>
        <button
          type="button"
          className={classes.appTopBarBtn}
          onClick={() => setPortalView("home")}
        >
          ← Portal
        </button>
        <button
          type="button"
          className={classes.appTopBarBtnPrimary}
          onClick={handleExportPNGClick}
        >
          Export Capital Plan
        </button>
        <button type="button" className={classes.appTopBarBtn} onClick={handleLogoutClick}>
          Log out
        </button>
      </div>
    </header>
  );

  const renderEmbedShell = () => (
    <div className={classes.landing} style={themeStyle}>
      {renderDetailsOverlay()}
      {renderAppTopBar()}
      <div className={classes.embedBody}>
        {isMobileDevice() && menuOpen && <div className={classes.overlay} />}
        <div
          ref={(node) => {
            sidebarRef.current = node;
            containerRef.current = node;
          }}
          className={`${menuOpen ? classes.sidebar : classes.sidebarClosed}`}
        >
          <div className={classes.sidebartop}>
            {group === "Admin" && (
              <div className={classes.sideState}>
                <div className={classes.selectDropdownWrapper}>
                  <select
                    value={defaultGroup}
                    onChange={(e) => setSelectedClient(e.target.value)}
                    className={classes.selectDropdown}
                  >
                    {adminDistrictNames.map((client) => (
                      <option key={client} value={client}>
                        {client}
                      </option>
                    ))}
                  </select>
                  <span className={classes.selectArrow}>▼</span>
                </div>
              </div>
            )}
            {renderSidebarNav()}
          </div>
          <div className={classes.sidebarBrand}>
            <div className={classes.poweredByLabel}>Powered by</div>
            <img src={oarLogo} className={classes.sidebarBrandLogo} alt="OAR" />
          </div>
        </div>
        <div
          className={`${
            menuOpen && !isMobileDevice()
              ? classes.contentblock
              : classes.contentblockMobile
          }`}
        >
          {renderTopFilters()}
          <div
            className={`${classes.dashboardblock} ${
              embedContent === "timeline" || !onDetail
                ? classes.dashboardblockTall
                : ""
            }`}
            ref={dashboardRef}
          >
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  if (portalView === "admin" && isSiteAdmin) {
    return (
      <div style={themeStyle}>
        <AdminPanel
          onBack={() => setPortalView("home")}
          onLogout={handleLogoutClick}
        />
      </div>
    );
  }

  if (portalView === "home") {
    return (
      <div style={themeStyle}>
        <PortalHome
          clientName={displayName}
          clientLogoUrl={companyLink}
          fallbackLogoUrl={defaultLink}
          heroImageUrl={heroFallback}
          showAdmin={isSiteAdmin}
          onOpenAdmin={() => setPortalView("admin")}
          onOpenCapitalPlan={() => {
            setActiveNavRole("overview");
            setEmbedContent("dashboard");
            if (sheetMap.overview?.link) {
              activeURLRef.current = sheetMap.overview.link;
              setActiveURL(sheetMap.overview.link);
              setVizSrcLink(sheetMap.overview.link);
              setActiveDashboardId(sheetMap.overview.id);
            }
            setPortalView("capital-plan");
          }}
          onLogout={handleLogoutClick}
        />
      </div>
    );
  }

  return isMobileDevice() ? (
    <div {...handlers}>{renderEmbedShell()}</div>
  ) : (
    renderEmbedShell()
  );
};

export default Landing;
