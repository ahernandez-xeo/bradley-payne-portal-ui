import classes from "./Landing.module.scss";
import { useRef, useEffect, useState, useContext } from "react";
import ValidUserContext from "../authCheck";
import menuIcon from "../assets/fa-menu.svg";
import { useSwipeable } from "react-swipeable";
import Dashboard from "./Dashboard";
import oarLogo from "../assets/oar-logo-transparent-replit.png";
import PortalHome from "./PortalHome";
import heroFallback from "../assets/portal-hero.webp";

const isMobileDevice = () => /Mobi|Android/i.test(navigator.userAgent);

// Selection-key order for cache paths. Category is sidebar-driven; the rest are
// always-visible top dropdowns (no progressive reveal).
const FILTER_ORDER = ["Category", "Location Type", "Location", "Type"];
const TOP_FILTER_ORDER = ["Location Type", "Location", "Type"];
const CATEGORY_FILTER = "Category";

const orderTopFilters = (filters) =>
  TOP_FILTER_ORDER.map((name) => (filters || []).find((f) => f.fieldName === name)).filter(
    Boolean
  );

const FILTER_CACHE_KEY = "dashboard_filter_cache";

const makeSelectionKey = (selections) =>
  FILTER_ORDER.filter((name) => selections && selections[name] !== undefined)
    .map((name) => `${name}=${selections[name]}`)
    .join("|");

const readFilterCache = () => {
  try {
    return JSON.parse(localStorage.getItem(FILTER_CACHE_KEY)) || {};
  } catch (error) {
    return {};
  }
};

const getCachedFilters = (dashboardKey, selectionKey = "") => {
  if (!dashboardKey) {
    return [];
  }
  const cache = readFilterCache();
  const entry = cache[dashboardKey];
  if (!entry || typeof entry !== "object" || Array.isArray(entry)) {
    return [];
  }
  return Array.isArray(entry[selectionKey]) ? entry[selectionKey] : [];
};

const setCachedFilters = (dashboardKey, selectionKey, filters) => {
  if (!dashboardKey) {
    return;
  }
  try {
    const cache = readFilterCache();
    if (
      !cache[dashboardKey] ||
      typeof cache[dashboardKey] !== "object" ||
      Array.isArray(cache[dashboardKey])
    ) {
      cache[dashboardKey] = {};
    }
    cache[dashboardKey][selectionKey] = filters;
    localStorage.setItem(FILTER_CACHE_KEY, JSON.stringify(cache));
  } catch (error) {
    // Ignore serialization / quota errors – caching is best-effort.
  }
};

const findCategoryValuesInFilters = (filters) => {
  const category = (filters || []).find((f) => f.fieldName === CATEGORY_FILTER);
  return category && Array.isArray(category.values) ? category.values : [];
};

/** Prefer live/state filters, then any cached Category domain for this dashboard. */
const getDepartmentValues = (dashboardKey, dashboardFilters) => {
  const fromState = findCategoryValuesInFilters(dashboardFilters);
  if (fromState.length > 0) {
    return fromState;
  }
  if (!dashboardKey) {
    return [];
  }
  const cache = readFilterCache();
  const entry = cache[dashboardKey];
  if (!entry || typeof entry !== "object") {
    return [];
  }
  for (const key of Object.keys(entry)) {
    const values = findCategoryValuesInFilters(entry[key]);
    if (values.length > 0) {
      return values;
    }
  }
  return [];
};

const isFundingNavLabel = (label) =>
  /forecast|finance|funding/i.test(label || "");

const Landing = ({ idleCountParam }) => {
  const currentNav = Object.entries(JSON.parse(localStorage.getItem("navigation")));

  const filteredNav = currentNav.filter(([, b]) => !b.name.includes("Curves Export"));

  const sortedNav = filteredNav.sort((a, b) => (a[1].name > b[1].name ? 1 : -1));
  const clientGroupRaw = JSON.parse(localStorage.getItem("client_list"));
  const clientGroup =
    typeof clientGroupRaw === "string" && clientGroupRaw ? clientGroupRaw : null;
  const clientList = Array.isArray(clientGroupRaw) ? clientGroupRaw : [];
  const group = JSON.parse(localStorage.getItem("group")) ?? "default";

  const clientFilteredNav = sortedNav;

  const flattenNav = (nav) =>
    nav.flatMap(([, entry]) =>
      entry.dashboards.map((dashboard, i) => ({
        label:
          entry.dashboards.length > 1
            ? `${entry.name} - ${dashboard.split("/").pop()}`
            : entry.name,
        link: dashboard,
        id: entry.dashboard_ids[i],
      }))
    );

  const flatNav = flattenNav(clientFilteredNav);
  const buttons = flatNav.map((n) => n.label);
  const links = flatNav.map((n) => n.link);
  const dashboardids = flatNav.map((n) => n.id);

  const [portalView, setPortalView] = useState("home");
  const [menuOpen, setMenuOpen] = useState(!isMobileDevice());

  const [activeButton, setActiveButton] = useState(0);
  const [activeDashboard, setActiveDashboard] = useState(true);
  const [activeURL, setActiveURL] = useState(links[0]);
  const [activeDashboardId, setActiveDashboardId] = useState(dashboardids[0]);
  const [displayTabs, setDisplayTabs] = useState(false);

  const [defaultGroup, setDefaultGroup] = useState(() => {
    if (group === "Admin") {
      return clientList.length > 0 ? clientList[0] : "default";
    }
    return group;
  });

  const [currentButtons, setCurrentButtons] = useState(buttons);
  const [currentLinks, setCurrentLinks] = useState(links);
  const [currentIds, setCurrentIds] = useState(dashboardids);

  const [dashboardFilters, setDashboardFilters] = useState(() =>
    getCachedFilters(links[0])
  );
  const [filterSelections, setFilterSelections] = useState({});
  const [vizReady, setVizReady] = useState(false);
  const [filterLoading, setFilterLoading] = useState(false);

  const [detailsOverlayOpen, setDetailsOverlayOpen] = useState(false);
  const [detailsImageUrl, setDetailsImageUrl] = useState(null);

  const [idleCount, setIdleCount] = useState(idleCountParam);

  const containerRef = useRef(null);
  const dashboardRef = useRef(null);
  const sidebarRef = useRef(null);
  const vizRef = useRef(null);
  const activeURLRef = useRef(links[0]);
  const filterOpSeqRef = useRef(0);
  const vizOpChainRef = useRef(Promise.resolve());
  const dashboardFiltersRef = useRef(dashboardFilters);

  useEffect(() => {
    activeURLRef.current = activeURL;
  }, [activeURL]);

  useEffect(() => {
    dashboardFiltersRef.current = dashboardFilters;
  }, [dashboardFilters]);

  const validUserContext = useContext(ValidUserContext);

  useEffect(() => {
    if (idleCountParam !== idleCount) {
      setIdleCount(idleCountParam);
      handleBackgroundRefresh();
    }
  }, [idleCountParam]);

  const handleOutsideClick = (event) => {
    // Only auto-close the drawer on mobile; desktop keeps the sidebar open.
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
      const viz = vizRef.current || dashboardRef.current?.firstChild?.firstChild?.childNodes?.[1];
      if (viz && viz.exportImageAsync) {
        viz.exportImageAsync();
      }
    } catch (error) {
      console.error("Error exporting PNG:", error);
    }
  };

  const handleBackgroundRefresh = () => {
    try {
      const viz = vizRef.current || dashboardRef.current?.firstChild?.firstChild?.childNodes?.[1];
      if (viz && viz.refreshDataAsync) {
        viz.refreshDataAsync().catch((error) => {
          console.error("Error refreshing dashboard:", error);
        });
      }
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  };

  const FILTER_SOURCE_WORKSHEETS = ["All Years (10yr)"];

  const extractFiltersFromViz = async (viz) => {
    const activeSheet = viz.workbook.activeSheet;
    const allWorksheets =
      activeSheet.sheetType === "dashboard" ? activeSheet.worksheets : [activeSheet];

    const worksheets = allWorksheets.filter((ws) =>
      FILTER_SOURCE_WORKSHEETS.includes(ws.name)
    );
    const effectiveWorksheets = worksheets.length > 0 ? worksheets : allWorksheets;

    const filterMap = {};

    for (const worksheet of effectiveWorksheets) {
      const worksheetFilters = await worksheet.getFiltersAsync();
      for (const filter of worksheetFilters) {
        if (filter.filterType !== "categorical") {
          continue;
        }
        const key = filter.fieldName;
        const appliedValues = (filter.appliedValues || []).map(
          (v) => v.formattedValue ?? v.value
        );

        const fetchFilterValues = async () => {
          try {
            const domain = await filter.getDomainAsync("relevant");
            return (domain.values || []).map((v) => v.formattedValue ?? v.value);
          } catch (domainError) {
            return appliedValues;
          }
        };

        if (!filterMap[key]) {
          filterMap[key] = {
            fieldName: filter.fieldName,
            worksheetNames: [worksheet.name],
            values: await fetchFilterValues(),
            appliedValues,
            isAllSelected: !!filter.isAllSelected,
          };
        } else {
          if (!filterMap[key].worksheetNames.includes(worksheet.name)) {
            filterMap[key].worksheetNames.push(worksheet.name);
          }
          if (filterMap[key].values.length === 0) {
            const retriedValues = await fetchFilterValues();
            if (retriedValues.length > 0) {
              filterMap[key].values = retriedValues;
              if (appliedValues.length > 0) {
                filterMap[key].appliedValues = appliedValues;
              }
            }
          }
        }
      }
    }
    return Object.values(filterMap);
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

  const showCachedFor = (dashboardKey, selections) => {
    const cached = getCachedFilters(dashboardKey, makeSelectionKey(selections));
    if (cached.length > 0) {
      setDashboardFilters(cached);
    }
    return cached;
  };

  const enqueueVizOp = (op) => {
    const next = vizOpChainRef.current.then(op).catch((error) => {
      console.error("Error in queued viz operation:", error);
    });
    vizOpChainRef.current = next;
    return next;
  };

  const backgroundRefresh = async (viz, dashboardKey, selections, seq) => {
    const fresh = await extractFiltersFromViz(viz);
    if (fresh.length === 0) {
      return;
    }
    setCachedFilters(dashboardKey, makeSelectionKey(selections), fresh);
    if (seq === filterOpSeqRef.current && activeURLRef.current === dashboardKey) {
      setDashboardFilters(fresh);
    }
  };

  const handleDashboardReady = (viz) => {
    vizRef.current = viz;
    const dashboardKey = activeURLRef.current;
    const seq = ++filterOpSeqRef.current;
    setFilterSelections({});
    showCachedFor(dashboardKey, {});
    setVizReady(true);
    enqueueVizOp(() => backgroundRefresh(viz, dashboardKey, {}, seq));
  };

  const handleTopFilterChange = (filter, value) => {
    if (!vizReady || filterLoading) {
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
    showCachedFor(dashboardKey, newSelections);
    setFilterLoading(true);

    enqueueVizOp(async () => {
      try {
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
      } finally {
        // Hide overlay once the viz has been updated; option refresh can continue.
        setFilterLoading(false);
      }
      await backgroundRefresh(viz, dashboardKey, newSelections, seq);
    });
  };

  const handleDepartmentSelect = (value) => {
    if (!vizReady || filterLoading) {
      return;
    }
    const viz = vizRef.current;
    if (!viz) {
      return;
    }
    validUserContext.localAuthCheck(false);
    const dashboardKey = activeURLRef.current;
    const newSelections = { [CATEGORY_FILTER]: value };
    const seq = ++filterOpSeqRef.current;
    setFilterSelections(newSelections);
    showCachedFor(dashboardKey, newSelections);
    setFilterLoading(true);

    enqueueVizOp(async () => {
      try {
        const categoryFilter = resolveFilterMeta(CATEGORY_FILTER);
        await applyFilterValue(viz, categoryFilter, value);
        for (const name of TOP_FILTER_ORDER) {
          const downstreamFilter = resolveFilterMeta(name);
          await applyFilterValue(viz, downstreamFilter, "__ALL__");
        }
      } finally {
        setFilterLoading(false);
      }
      await backgroundRefresh(viz, dashboardKey, newSelections, seq);
    });
  };

  const handleClearTopFilters = () => {
    if (!vizReady || filterLoading) {
      return;
    }
    const viz = vizRef.current;
    if (!viz) {
      return;
    }
    validUserContext.localAuthCheck(false);
    const dashboardKey = activeURLRef.current;
    const newSelections = {};
    if (filterSelections[CATEGORY_FILTER] !== undefined) {
      newSelections[CATEGORY_FILTER] = filterSelections[CATEGORY_FILTER];
    }
    const seq = ++filterOpSeqRef.current;
    setFilterSelections(newSelections);
    showCachedFor(dashboardKey, newSelections);
    setFilterLoading(true);

    enqueueVizOp(async () => {
      try {
        for (const name of TOP_FILTER_ORDER) {
          const downstreamFilter = resolveFilterMeta(name);
          await applyFilterValue(viz, downstreamFilter, "__ALL__");
        }
      } finally {
        setFilterLoading(false);
      }
      await backgroundRefresh(viz, dashboardKey, newSelections, seq);
    });
  };

  const buildDetailsUrl = (segments) => {
    const encoded = segments.map((s) => encodeURIComponent(s)).join("/");
    return `https://storage.googleapis.com/bp_portal_artifacts/details/${encoded}/display.jpg`;
  };

  const getDetailsCandidateSegments = () => {
    const client = clientGroup || defaultGroup;
    const filterSegments = FILTER_ORDER.filter(
      (name) => filterSelections[name] !== undefined
    ).map((name) => filterSelections[name]);
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

  const handleButtonClick = (tabIndex, tabText) => {
    validUserContext.localAuthCheck(false);
    setActiveButton(tabIndex);
    setActiveURL(currentLinks[tabIndex]);
    setActiveDashboard(true);
    setActiveDashboardId(currentIds[tabIndex]);
    setVizReady(false);
    setFilterLoading(false);
    filterOpSeqRef.current++;
    setDashboardFilters(getCachedFilters(currentLinks[tabIndex]));
    setFilterSelections({});
    setDisplayTabs(false);
    if (isMobileDevice()) {
      setMenuOpen(false);
    }
  };

  const handleMenuClick = () => {
    setMenuOpen((open) => !open);
  };

  const renderContent = () => {
    if (activeDashboard && activeURL) {
      return (
        <Dashboard
          dashboardLinkProp={activeURL}
          displayTabs={displayTabs}
          idleCount={idleCount}
          onDashboardReady={handleDashboardReady}
        />
      );
    }
    return <div />;
  };

  const setSelectedClient = (event) => {
    const newFilteredNav = sortedNav.filter(([, value]) => value.client === event);
    const nextFlat = flattenNav(newFilteredNav);
    const nextButtons = nextFlat.map((n) => n.label);
    const nextLinks = nextFlat.map((n) => n.link);
    const nextIds = nextFlat.map((n) => n.id);

    setVizReady(false);
    setFilterLoading(false);
    filterOpSeqRef.current++;
    setDashboardFilters(getCachedFilters(nextLinks[0]));
    setFilterSelections({});
    setDefaultGroup(event);
    setCurrentButtons(nextButtons);
    setCurrentLinks(nextLinks);
    setCurrentIds(nextIds);
    setActiveButton(0);
    setActiveURL(nextLinks[0]);
    setActiveDashboardId(nextIds[0]);
  };

  const renderDetailsOverlay = () => {
    if (!detailsOverlayOpen) {
      return null;
    }
    const selectionCrumbs = FILTER_ORDER.filter(
      (name) => filterSelections[name] !== undefined
    ).map((name) => filterSelections[name]);

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

  const glanceItems = currentButtons
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => !isFundingNavLabel(label));
  const fundingItems = currentButtons
    .map((label, index) => ({ label, index }))
    .filter(({ label }) => isFundingNavLabel(label));

  const departmentValues = getDepartmentValues(activeURL, dashboardFilters);
  const selectedDepartment = filterSelections[CATEGORY_FILTER];
  const topFilters = orderTopFilters(dashboardFilters);
  const hasTopSelection = TOP_FILTER_ORDER.some(
    (name) => filterSelections[name] !== undefined
  );

  const randomNumber = Math.floor(Math.random() * 1000000);
  const logoKey = (clientGroup || defaultGroup).toLowerCase();
  const displayName = clientGroup || defaultGroup;
  const companyLink = `https://storage.googleapis.com/bp_portal_artifacts/${logoKey}.png?v=${randomNumber}`;
  const defaultLink = `https://storage.googleapis.com/bp_portal_artifacts/bradleypayne.png?v=${randomNumber}`;

  const handleLogoError = (event) => {
    event.target.src = defaultLink;
  };

  const renderSidebarNav = () => (
    <>
      <div className={classes.navSection}>
        <div className={classes.navSectionTitle}>At a Glance</div>
        {glanceItems.map(({ label, index }) => (
          <div
            key={`glance-${index}`}
            className={`${classes.sideButton} ${
              activeButton === index && !selectedDepartment ? classes.active : ""
            }`}
            onClick={() => handleButtonClick(index, label)}
          >
            {label.replace(/^\d+\.\s*/, "")}
          </div>
        ))}
      </div>

      <div className={classes.navSection}>
        <div className={classes.navSectionTitle}>Departments</div>
        {departmentValues.length === 0 ? (
          <div className={classes.navEmpty}>Loading departments…</div>
        ) : (
          departmentValues.map((value) => (
            <div
              key={value}
              className={`${classes.sideButton} ${
                selectedDepartment === value ? classes.active : ""
              } ${filterLoading ? classes.sideButtonDisabled : ""}`}
              onClick={() => handleDepartmentSelect(value)}
            >
              {value}
            </div>
          ))
        )}
      </div>

      {fundingItems.length > 0 && (
        <div className={classes.navSection}>
          <div className={classes.navSectionTitle}>Funding</div>
          {fundingItems.map(({ label, index }) => (
            <div
              key={`funding-${index}`}
              className={`${classes.sideButton} ${
                activeButton === index && !selectedDepartment ? classes.active : ""
              }`}
              onClick={() => handleButtonClick(index, label)}
            >
              {label.replace(/^\d+\.\s*/, "")}
            </div>
          ))}
        </div>
      )}
    </>
  );

  const renderTopFilters = () => {
    if (!activeDashboard) {
      return null;
    }
    const interactionDisabled = !vizReady || filterLoading;
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
        {filterSelections[CATEGORY_FILTER] !== undefined && (
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
    <div className={classes.landing}>
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
                    {clientList.map((client, index) => (
                      <option key={index} value={client}>
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
          <div className={classes.dashboardblock} ref={dashboardRef}>
            {filterLoading && (
              <div className={classes.filterLoadingOverlay} aria-live="polite">
                <div className={classes.filterLoadingCard}>
                  <div className={classes.filterLoadingSpinner} />
                  <div className={classes.filterLoadingText}>Updating view…</div>
                </div>
              </div>
            )}
            {renderContent()}
          </div>
        </div>
      </div>
    </div>
  );

  if (portalView === "home") {
    return (
      <PortalHome
        clientName={displayName}
        clientLogoUrl={companyLink}
        fallbackLogoUrl={defaultLink}
        heroImageUrl={heroFallback}
        onOpenCapitalPlan={() => setPortalView("capital-plan")}
        onLogout={handleLogoutClick}
      />
    );
  }

  return isMobileDevice() ? (
    <div {...handlers}>{renderEmbedShell()}</div>
  ) : (
    renderEmbedShell()
  );
};

export default Landing;
