import classes from "./Landing.module.scss";
import { useRef, useEffect, useState, useContext } from "react";
import ValidUserContext from "../authCheck";
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
  impersonateDistrict,
} from "./ApiService";
import {
  CAPITAL_PLAN_WORKBOOK,
  DEFAULT_BRAND_COLOR,
  DEFAULT_LOGO_URL,
  taglineFor,
} from "../portalConfig";
import { useToast } from "./Toast/ToastProvider";

import {
  buildFiltersFromRows,
  DEPARTMENT_FILTER_ALIASES,
  FILTER_ORDER,
  getDepartmentValues,
  hasLocationSelection,
  locationSelectedParameter,
  orderTopFilters,
  resolveCapitalPlanSheetMap,
  resolveEntryRestore,
  selectionParametersForRole,
  TOP_FILTER_ORDER,
} from "../utils/tableauFilters";
import { useIsCompactLayout, useIsTouchDevice } from "../hooks/useMediaQuery";
import { Navigate } from "react-router-dom";
import { usePortalRoute, ROUTES } from "../hooks/usePortalRoute";
import { useDashboardFilters } from "../hooks/useDashboardFilters";
import { useTableauViz } from "../hooks/useTableauViz";
import AppTopBar from "./shell/AppTopBar";
import SidebarNav from "./shell/SidebarNav";
import ContextFilterBar from "./shell/ContextFilterBar";
import DistrictSelect from "./shell/DistrictSelect";

const SITE_ADMIN_ROLE = "SiteAdministratorCreator";

const Landing = ({ idleCountParam }) => {
  const isCompact = useIsCompactLayout();
  const isTouch = useIsTouchDevice();

  const currentNav = Object.entries(JSON.parse(localStorage.getItem("navigation")) || {});
  const filteredNav = currentNav.filter(([, b]) => !b.name.includes("Curves Export"));
  const sortedNav = filteredNav.sort((a, b) => (a[1].name > b[1].name ? 1 : -1));

  const clientGroupRaw = JSON.parse(localStorage.getItem("client_list"));
  const clientGroup =
    typeof clientGroupRaw === "string" && clientGroupRaw ? clientGroupRaw : null;
  const group = JSON.parse(localStorage.getItem("group")) ?? "default";
  const role = JSON.parse(localStorage.getItem("role")) ?? "";
  const isSiteAdmin = role === SITE_ADMIN_ROLE;

  const sheetMap = resolveCapitalPlanSheetMap(sortedNav);
  const detailLink = sheetMap.detail?.link || "";
  const overviewLink = sheetMap.overview?.link || detailLink;

  // View state lives in the URL rather than component state so each view is
  // bookmarkable and the browser back button works.
  const {
    portalView,
    embedContent,
    adminTab,
    goHome,
    goAdmin,
    goTimeline,
    goDashboard,
    selectionsFromUrl,
  } = usePortalRoute();

  // Resolved during the first render, before <Dashboard> mounts, because
  // Tableau only reads declarative <viz-filter> children at initialization.
  // Deferring this to an effect would mount the viz unfiltered and force a
  // visible re-filter once it painted.
  const entryRestoreRef = useRef(undefined);
  if (entryRestoreRef.current === undefined) {
    entryRestoreRef.current = resolveEntryRestore({
      portalView,
      embedContent,
      selections: selectionsFromUrl(),
      detailLink: sheetMap.detail?.link,
    });
  }
  const entryRestore = entryRestoreRef.current;

  const [activeNavRole, setActiveNavRole] = useState(
    entryRestore ? "detail" : "overview"
  ); // overview | detail | forecast | financing | timeline
  const [menuOpen, setMenuOpen] = useState(!isCompact);
  const [adminDistricts, setAdminDistricts] = useState([]);
  const [selectedDistrictId, setSelectedDistrictId] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("district_id")) || "";
    } catch {
      return "";
    }
  });
  const [districtSwitching, setDistrictSwitching] = useState(false);
  const [vizRemountKey, setVizRemountKey] = useState(0);
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
  const [activeURL, setActiveURL] = useState(
    entryRestore ? entryRestore.detailLink : overviewLink
  );
  // Stable Tableau embed src. Sheet switches within the capital-plan workbook
  // prefer activateSheetAsync so filters apply without reloading the JWT viz.
  const [vizSrcLink, setVizSrcLink] = useState(
    entryRestore ? entryRestore.detailLink : overviewLink
  );
  // Masks the viz while a sheet switch and its follow-up filters are in
  // flight, so the user never sees the unfiltered intermediate state.
  const [sheetSwitching, setSheetSwitching] = useState(false);

  const [defaultGroup, setDefaultGroup] = useState(() => {
    if (group === "Admin" || isSiteAdmin) {
      return clientGroup || "default";
    }
    return clientGroup || group;
  });

  const [idleCount, setIdleCount] = useState(idleCountParam);

  const containerRef = useRef(null);
  const dashboardRef = useRef(null);
  const sidebarRef = useRef(null);
  const activeURLRef = useRef(
    entryRestore ? entryRestore.detailLink : overviewLink
  );
  const activeNavRoleRef = useRef(entryRestore ? "detail" : "overview");
  const pendingDepartmentRef = useRef(entryRestore?.department ?? null); // null | "__ALL__" | department name
  const pendingTopFiltersRef = useRef(entryRestore?.topFilters ?? null); // Location Type / Location from the URL
  // Fields already narrowed by <viz-filter> at mount. Re-applying an identical
  // value through the API would cost a round trip and a second re-render, so
  // the first filter pass after mount skips them.
  const declarativeFiltersRef = useRef(entryRestore?.declarative ?? null);
  // Tableau only reads <viz-parameter> at initialization, same as filters.
  const initialParametersRef = useRef(
    selectionParametersForRole(entryRestore ? "detail" : "overview", {
      locationSelected: hasLocationSelection(entryRestore?.topFilters),
    })
  );
  const sheetMapRef = useRef(sheetMap);
  const logoCacheRef = useRef({ identity: null, key: 0 });

  const validUserContext = useContext(ValidUserContext);
  const { showToast } = useToast();

  const {
    vizRef,
    vizReady,
    setVizReady,
    vizBusy,
    enqueueVizOp,
    activateWorkbookSheet,
    applyWorkbookParameters,
    applyFilterValue,
    exportImage,
    refreshData,
  } = useTableauViz({
    resolveFallbackViz: () =>
      dashboardRef.current?.firstChild?.firstChild?.childNodes?.[1],
  });

  const {
    dashboardFilters,
    setDashboardFilters,
    filterSelections,
    setFilterSelections,
    filtersLoading,
    filtersError,
    ensureFilterRows,
    syncFiltersFromRows,
    refreshFilterDomains,
    resolveFilterMeta,
    getDepartmentFieldName,
    getSelectedDepartment,
    nextFilterOpSeq,
    resetFilters,
  } = useDashboardFilters({
    initialSelections: entryRestore?.selections,
    getActiveUrl: () => activeURLRef.current,
    onLoadError: () =>
      showToast(
        "Could not load the department and location filters. The sidebar may be incomplete — try reloading the portal.",
        { variant: "error", title: "Filters unavailable" }
      ),
  });

  useEffect(() => {
    activeURLRef.current = activeURL;
  }, [activeURL]);

  useEffect(() => {
    activeNavRoleRef.current = activeNavRole;
  }, [activeNavRole]);

  useEffect(() => {
    sheetMapRef.current = sheetMap;
  }, [sheetMap]);

  // Drop the transition mask once the queued sheet/filter work has drained.
  useEffect(() => {
    if (sheetSwitching && !vizBusy) {
      setSheetSwitching(false);
    }
  }, [sheetSwitching, vizBusy]);

  useEffect(() => {
    if (idleCountParam !== idleCount) {
      setIdleCount(idleCountParam);
      refreshData();
    }
  }, [idleCountParam, idleCount, refreshData]);

  useEffect(() => {
    if (!isSiteAdmin && group !== "Admin") {
      return undefined;
    }
    let cancelled = false;
    fetchAdminDistricts()
      .then((data) => {
        if (cancelled) return;
        const list = (data.districts || []).filter(
          (d) => d.district_id && d.district_name
        );
        setAdminDistricts(list);
        setSelectedDistrictId((current) => {
          if (current && list.some((d) => d.district_id === current)) {
            return current;
          }
          const byName = list.find((d) => d.district_name === clientGroup);
          return byName?.district_id || list[0]?.district_id || "";
        });
        setDefaultGroup((current) => {
          const names = list.map((d) => d.district_name);
          if (names.includes(current)) return current;
          return (
            list.find((d) => d.district_id === selectedDistrictId)?.district_name ||
            clientGroup ||
            list[0]?.district_name ||
            current ||
            "default"
          );
        });
      })
      .catch(() => {
        if (!cancelled && clientGroup) {
          setAdminDistricts([
            {
              district_id: selectedDistrictId || "unknown",
              district_name: clientGroup,
            },
          ]);
        }
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [group, clientGroup, isSiteAdmin]);

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
    if (!isCompact) {
      return;
    }
    if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
      setMenuOpen(false);
    }
  };

  const handlers = useSwipeable({
    onSwipedLeft: () => setMenuOpen(false),
    preventDefaultTouchmoveEvent: true,
    trackMouse: false,
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [menuOpen, isCompact]);

  // Follow the viewport across the breakpoint: pinned open on wide screens,
  // collapsed to a drawer when it gets narrow.
  useEffect(() => {
    setMenuOpen(!isCompact);
  }, [isCompact]);

  const handleLogoutClick = () => {
    validUserContext.logoutUser();
  };

  const handleExportPNGClick = async () => {
    const result = await exportImage();
    if (result === "unavailable") {
      showToast(
        "The capital plan is still loading. Wait for the dashboard to finish, then try the export again.",
        { variant: "info", title: "Nothing to export yet" }
      );
    } else if (result === "failed") {
      showToast("Could not export the capital plan image. Please try again.", {
        variant: "error",
        title: "Export failed",
      });
    }
  };

  const applyDepartmentOnViz = async (viz, departmentValue, dashboardKey) => {
    const seq = nextFilterOpSeq();
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
      await applyWorkbookParameters(viz, [locationSelectedParameter(false)]);
      await refreshFilterDomains(dashboardKey, newSelections, seq);
    });
  };

  const isDetailRole = (role) => role === "detail";

  const runDetailReady = (viz, { pending } = {}) => {
    vizRef.current = viz;
    const dashboardKey =
      sheetMapRef.current.detail?.link || activeURLRef.current;
    setVizReady(true);

    const seq = nextFilterOpSeq();
    const pendingValue =
      pending !== undefined ? pending : pendingDepartmentRef.current;
    pendingDepartmentRef.current = null;
    // Set when the view was restored from a URL carrying Location Type /
    // Location params; empty for an ordinary department click.
    const pendingTop = pendingTopFiltersRef.current || {};
    pendingTopFiltersRef.current = null;

    // Consumed once: any field Tableau already narrowed at initialization does
    // not need a second, identical round trip.
    const declarative = declarativeFiltersRef.current;
    declarativeFiltersRef.current = null;
    const appliedAtInit = (field, value) =>
      Boolean(
        declarative?.some((item) => item.field === field && item.value === value)
      );

    const departmentField = getDepartmentFieldName();
    const initialSelections = {};
    if (pendingValue && pendingValue !== "__ALL__") {
      initialSelections[departmentField] = pendingValue;
    }
    TOP_FILTER_ORDER.forEach((name) => {
      if (pendingTop[name]) {
        initialSelections[name] = pendingTop[name];
      }
    });
    setFilterSelections(initialSelections);
    syncFiltersFromRows(initialSelections);

    enqueueVizOp(async () => {
      await applyWorkbookParameters(
        viz,
        selectionParametersForRole("detail", {
          locationSelected: hasLocationSelection(initialSelections),
        })
      );
      // Load filter domains from BigQuery, then apply to Tableau.
      const fresh = await refreshFilterDomains(
        dashboardKey,
        initialSelections,
        seq
      );
      // Undefined falls back to the current filter state inside the hook.
      const liveDepartmentField = getDepartmentFieldName(
        fresh?.length ? fresh : undefined
      );

      if (pendingValue && pendingValue !== "__ALL__") {
        if (!appliedAtInit(liveDepartmentField, pendingValue)) {
          await applyFilterValue(
            viz,
            resolveFilterMeta(liveDepartmentField),
            pendingValue
          );
        }
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
      }
      for (const name of TOP_FILTER_ORDER) {
        const value = pendingTop[name] || "__ALL__";
        if (!appliedAtInit(name, value)) {
          await applyFilterValue(viz, resolveFilterMeta(name), value);
        }
      }
      await refreshFilterDomains(dashboardKey, initialSelections, seq);
    });
  };

  const handleDashboardReady = (viz) => {
    vizRef.current = viz;
    const role = activeNavRoleRef.current;
    setVizReady(true);

    // Overview / Funding: no filter extraction. Keep the selection parameters
    // False so Tableau does not treat these views as a selected department.
    if (!isDetailRole(role)) {
      setFilterSelections({});
      enqueueVizOp(async () => {
        await applyWorkbookParameters(viz, selectionParametersForRole(role));
      });
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

    const seq = nextFilterOpSeq();
    setFilterSelections(newSelections);
    syncFiltersFromRows(newSelections);
    goDashboard(newSelections);

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
      await applyWorkbookParameters(viz, [
        locationSelectedParameter(hasLocationSelection(newSelections)),
      ]);
      await refreshFilterDomains(dashboardKey, newSelections, seq);
    });
  };

  const openSheet = (role, { clearFilters = true } = {}) => {
    const sheet = sheetMapRef.current[role];
    if (!sheet?.link) {
      console.warn(`No sheet mapped for role: ${role}`);
      return;
    }
    validUserContext.localAuthCheck(false);
    setActiveNavRole(role);
    activeNavRoleRef.current = role;
    setActiveDashboard(true);
    pendingDepartmentRef.current = null;

    if (clearFilters && role !== "detail") {
      setFilterSelections({});
      goDashboard({});
    } else {
      goDashboard();
    }

    if (activeURLRef.current === sheet.link && vizReady && vizRef.current) {
      if (isCompact) {
        setMenuOpen(false);
      }
      return false;
    }

    nextFilterOpSeq();
    activeURLRef.current = sheet.link;
    setActiveURL(sheet.link);
    if (role === "detail") {
      syncFiltersFromRows(filterSelections);
    }

    const viz = vizRef.current;
    if (vizReady && viz?.workbook) {
      setVizReady(false);
      setSheetSwitching(true);
      enqueueVizOp(async () => {
        const activated = await activateWorkbookSheet(viz, sheet.link);
        if (activated) {
          if (role === "detail") {
            runDetailReady(viz, { pending: null });
          } else {
            await applyWorkbookParameters(
              viz,
              selectionParametersForRole(role)
            );
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

    if (isCompact) {
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
      console.warn(
        `CapitalPlanDetail sheet not found in ${CAPITAL_PLAN_WORKBOOK} navigation`
      );
      return;
    }

    const wasShowingDetail =
      embedContent === "dashboard" &&
      activeURLRef.current === detail.link &&
      activeNavRole === "detail" &&
      vizReady &&
      !!vizRef.current;

    const departmentFieldForUrl = getDepartmentFieldName();
    goDashboard({ [departmentFieldForUrl]: value });
    setActiveNavRole("detail");
    activeNavRoleRef.current = "detail";

    // Already on Detail: apply the department filter.
    if (wasShowingDetail) {
      setSheetSwitching(true);
      applyDepartmentOnViz(vizRef.current, value, detail.link);
      if (isCompact) {
        setMenuOpen(false);
      }
      return;
    }

    pendingDepartmentRef.current = value;
    const departmentField = getDepartmentFieldName();
    setFilterSelections({ [departmentField]: value });
    nextFilterOpSeq();
    activeURLRef.current = detail.link;
    setActiveURL(detail.link);
    setActiveDashboard(true);
    syncFiltersFromRows({ [departmentField]: value });

    const viz = vizRef.current;
    if (embedContent === "dashboard" && vizReady && viz?.workbook) {
      setVizReady(false);
      // Activating the sheet paints it unfiltered before the department filter
      // lands. Mask the gap so the switch reads as one step.
      setSheetSwitching(true);
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

    if (isCompact) {
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
    const seq = nextFilterOpSeq();
    setFilterSelections(newSelections);
    syncFiltersFromRows(newSelections);
    goDashboard(newSelections);

    enqueueVizOp(async () => {
      for (const name of TOP_FILTER_ORDER) {
        const downstreamFilter = resolveFilterMeta(name);
        await applyFilterValue(viz, downstreamFilter, "__ALL__");
      }
      await applyWorkbookParameters(viz, [locationSelectedParameter(false)]);
      await refreshFilterDomains(dashboardKey, newSelections, seq);
    });
  };

  const handleTimelineClick = () => {
    validUserContext.localAuthCheck(false);
    goTimeline();
    setActiveNavRole("timeline");
    setFilterSelections({});
    if (isCompact) {
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
              key={vizRemountKey}
              dashboardLinkProp={vizSrcLink}
              initialFilters={declarativeFiltersRef.current}
              initialParameters={initialParametersRef.current}
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

  const resetCapitalPlanForDistrict = (districtName) => {
    setDefaultGroup(districtName);
    setVizReady(false);
    vizRef.current = null;
    if (portalView === "capital-plan") {
      goDashboard({});
    }
    setActiveNavRole("overview");
    pendingDepartmentRef.current = null;
    pendingTopFiltersRef.current = null;
    // The new district remounts the viz on the unfiltered overview, so the
    // entry URL's filters must not ride along.
    declarativeFiltersRef.current = null;
    initialParametersRef.current = selectionParametersForRole("overview");
    resetFilters();
    const overview = sheetMapRef.current.overview;
    if (overview?.link) {
      activeURLRef.current = overview.link;
      setActiveURL(overview.link);
      setVizSrcLink(overview.link);
    }
    setVizRemountKey((key) => key + 1);
  };

  const handleImpersonateDistrict = async (districtId) => {
    if (!districtId || districtId === selectedDistrictId || districtSwitching) {
      return;
    }
    const district = adminDistricts.find((d) => d.district_id === districtId);
    if (!district) {
      return;
    }

    setDistrictSwitching(true);
    try {
      const result = await impersonateDistrict({ districtId });
      const nextId = result.district_id || district.district_id;
      const nextName = result.district_name || district.district_name;
      const branding = result.branding || {};
      const nextLogo = branding.logo_url || "";
      const nextColor = branding.custom_color || DEFAULT_BRAND_COLOR;

      localStorage.setItem("district_id", JSON.stringify(nextId));
      localStorage.setItem("district_name", JSON.stringify(nextName));
      localStorage.setItem("client_list", JSON.stringify(nextName));
      localStorage.setItem("logo_url", JSON.stringify(nextLogo));
      localStorage.setItem("custom_color", JSON.stringify(nextColor));

      setSelectedDistrictId(nextId);
      setBrandLogoUrl(nextLogo);
      setBrandColor(nextColor);

      const loginName = localStorage.getItem("login-name") || "";
      if (loginName && validUserContext.apiAuthCheck) {
        await validUserContext.apiAuthCheck(loginName, "", true);
      }

      resetCapitalPlanForDistrict(nextName);
      const rows = await ensureFilterRows();
      if (rows?.length) {
        setDashboardFilters(buildFiltersFromRows(rows, {}));
      }
      showToast(`Now viewing ${nextName}.`, {
        variant: "success",
        title: "Client switched",
      });
    } catch (error) {
      console.error("Failed to switch client district:", error);
      showToast(error.message || "Could not switch client district.", {
        variant: "error",
        title: "Switch failed",
      });
    } finally {
      setDistrictSwitching(false);
    }
  };

  const departmentValues = getDepartmentValues(detailLink, dashboardFilters);
  const selectedDepartment = getSelectedDepartment(filterSelections);
  const topFilters = orderTopFilters(dashboardFilters);
  const hasTopSelection = TOP_FILTER_ORDER.some(
    (name) => filterSelections[name] !== undefined
  );
  const onDetail = embedContent === "dashboard" && activeNavRole === "detail";

  const logoKey = (clientGroup || defaultGroup).toLowerCase();
  const displayName = clientGroup || defaultGroup;
  const tagline = taglineFor(displayName);
  // Cache-buster tied to the branding identity, not to render count. It used
  // to be Math.random() evaluated inline, so the logo src changed on every
  // render and the browser re-fetched the image each time.
  const logoIdentity = `${logoKey}|${brandLogoUrl}`;
  if (logoCacheRef.current.identity !== logoIdentity) {
    logoCacheRef.current = {
      identity: logoIdentity,
      key: Math.floor(Math.random() * 1000000),
    };
  }
  const logoCacheKey = logoCacheRef.current.key;
  const legacyLogoLink = `https://storage.googleapis.com/bp_portal_artifacts/${logoKey}.png?v=${logoCacheKey}`;
  const defaultLink = `${DEFAULT_LOGO_URL}?v=${logoCacheKey}`;
  const companyLink = brandLogoUrl
    ? `${brandLogoUrl}${brandLogoUrl.includes("?") ? "&" : "?"}v=${logoCacheKey}`
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

  const renderEmbedShell = () => (
    <div className={classes.landing} style={themeStyle}>
      <AppTopBar
        showMenuButton={isCompact}
        menuOpen={menuOpen}
        onMenuClick={handleMenuClick}
        logoUrl={companyLink}
        onLogoError={handleLogoError}
        displayName={displayName}
        tagline={tagline}
        onBackToPortal={goHome}
        onExport={handleExportPNGClick}
        onLogout={handleLogoutClick}
      />
      <div className={classes.embedBody}>
        {isCompact && menuOpen && <div className={classes.overlay} />}
        <div
          ref={(node) => {
            sidebarRef.current = node;
            containerRef.current = node;
          }}
          className={`${menuOpen ? classes.sidebar : classes.sidebarClosed}`}
        >
          <div className={classes.sidebartop}>
            {(isSiteAdmin || group === "Admin") && adminDistricts.length > 0 && (
              <DistrictSelect
                districts={adminDistricts}
                selectedDistrictId={selectedDistrictId}
                onChange={handleImpersonateDistrict}
                switching={districtSwitching}
              />
            )}
            <SidebarNav
              sheetMap={sheetMap}
              embedContent={embedContent}
              activeNavRole={activeNavRole}
              departmentValues={departmentValues}
              selectedDepartment={selectedDepartment}
              onDetail={onDetail}
              filtersLoading={filtersLoading}
              filtersError={filtersError}
              onTimelineClick={handleTimelineClick}
              onOverviewClick={handleOverviewClick}
              onDepartmentSelect={handleDepartmentSelect}
              onFundingClick={handleFundingClick}
            />
          </div>
          <div className={classes.sidebarBrand}>
            <div className={classes.poweredByLabel}>Powered by</div>
            <img src={oarLogo} className={classes.sidebarBrandLogo} alt="OAR" />
          </div>
        </div>
        <div
          className={`${
            menuOpen && !isCompact
              ? classes.contentblock
              : classes.contentblockMobile
          }`}
        >
          {onDetail && (
            <ContextFilterBar
              filters={topFilters}
              selections={filterSelections}
              vizReady={vizReady}
              hasSelection={hasTopSelection}
              onFilterChange={handleTopFilterChange}
              onClear={handleClearTopFilters}
            />
          )}
          <div
            className={`${classes.dashboardblock} ${
              embedContent === "timeline" || !onDetail
                ? classes.dashboardblockTall
                : ""
            }`}
            ref={dashboardRef}
          >
            {renderContent()}
            {sheetSwitching && embedContent !== "timeline" && (
              <div
                className={classes.filterLoadingOverlay}
                role="status"
                aria-live="polite"
              >
                <div className={classes.filterLoadingCard}>
                  <div className={classes.filterLoadingSpinner} />
                  <span className={classes.filterLoadingText}>
                    Applying filters…
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );


  if (portalView === "admin") {
    // Deep link into /admin without the role: send them back to the portal.
    if (!isSiteAdmin) {
      return <Navigate to={ROUTES.home} replace />;
    }
    return (
      <div style={themeStyle}>
        <AdminPanel
          activeTab={adminTab}
          onTabChange={goAdmin}
          onBack={goHome}
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
          districts={adminDistricts}
          selectedDistrictId={selectedDistrictId}
          onDistrictChange={handleImpersonateDistrict}
          districtSwitching={districtSwitching}
          onOpenAdmin={() => goAdmin("users")}
          onOpenCapitalPlan={() => {
            setActiveNavRole("overview");
            if (sheetMap.overview?.link) {
              activeURLRef.current = sheetMap.overview.link;
              setActiveURL(sheetMap.overview.link);
              setVizSrcLink(sheetMap.overview.link);
            }
            goDashboard({});
          }}
          onLogout={handleLogoutClick}
        />
      </div>
    );
  }

  return isCompact && isTouch ? (
    <div {...handlers}>{renderEmbedShell()}</div>
  ) : (
    renderEmbedShell()
  );
};

export default Landing;
