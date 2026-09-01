import { useCallback, useEffect, useRef, useState } from "react";

import { fetchDashboardFilters } from "../components/ApiService";
import {
  buildFiltersFromRows,
  CATEGORY_FILTER,
  DEPARTMENT_FILTER_ALIASES,
  findDepartmentFilterInList,
  findDepartmentValuesInFilters,
} from "../utils/tableauFilters";

/**
 * Owns the capital-plan filter domains and the user's current selections.
 *
 * The domains come from BigQuery rather than from Tableau's own filter
 * metadata, so the Departments sidebar can render before the viz is
 * interactive. Rows are fetched once per session and cached in a ref;
 * `buildFiltersFromRows` re-derives the cascading Location Type / Location
 * lists locally whenever the selection changes.
 *
 * @param onLoadError       Called when the fetch fails, for user-facing messaging.
 * @param getActiveUrl      Returns the sheet link currently on screen, used to
 *                          discard results that arrived after the user moved on.
 * @param initialSelections Selections restored from the entry URL, applied on
 *                          the first render so the viz can be filtered at
 *                          initialization rather than after it paints.
 */
export const useDashboardFilters = ({
  onLoadError,
  getActiveUrl,
  initialSelections,
} = {}) => {
  const [dashboardFilters, setDashboardFilters] = useState([]);
  const [filterSelections, setFilterSelections] = useState(
    initialSelections || {}
  );
  const [filtersLoading, setFiltersLoading] = useState(false);
  const [filtersError, setFiltersError] = useState(false);

  const dashboardFiltersRef = useRef(dashboardFilters);
  const filterSelectionsRef = useRef(filterSelections);
  const filterRowsRef = useRef(null);
  const filterRowsPromiseRef = useRef(null);
  // Monotonic counter used to ignore responses from superseded operations.
  const filterOpSeqRef = useRef(0);

  // Held in refs so the callbacks below stay stable and the mount-time
  // prefetch does not re-run every render.
  const onLoadErrorRef = useRef(onLoadError);
  onLoadErrorRef.current = onLoadError;
  const getActiveUrlRef = useRef(getActiveUrl);
  getActiveUrlRef.current = getActiveUrl;

  useEffect(() => {
    dashboardFiltersRef.current = dashboardFilters;
  }, [dashboardFilters]);

  useEffect(() => {
    filterSelectionsRef.current = filterSelections;
  }, [filterSelections]);

  /** Fetch the row set once, de-duplicating concurrent callers. */
  const ensureFilterRows = useCallback(async () => {
    if (Array.isArray(filterRowsRef.current)) {
      return filterRowsRef.current;
    }
    if (filterRowsPromiseRef.current) {
      return filterRowsPromiseRef.current;
    }
    setFiltersLoading(true);
    filterRowsPromiseRef.current = fetchDashboardFilters()
      .then((data) => {
        const rows = Array.isArray(data?.rows) ? data.rows : [];
        filterRowsRef.current = rows;
        setFiltersError(false);
        return rows;
      })
      .catch((error) => {
        console.error("Error loading dashboard filters from database:", error);
        setFiltersError(true);
        onLoadErrorRef.current?.(error);
        filterRowsRef.current = filterRowsRef.current || [];
        return filterRowsRef.current;
      })
      .finally(() => {
        setFiltersLoading(false);
        filterRowsPromiseRef.current = null;
      });
    return filterRowsPromiseRef.current;
  }, []);

  // Prefetch filter domains so Departments are populated before Tableau loads.
  // Also drops the legacy Tableau extract cache if it is still present.
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
  }, [ensureFilterRows]);

  /** Rebuild the cascading domains from cached rows for a given selection. */
  const syncFiltersFromRows = useCallback((selections) => {
    const rows = filterRowsRef.current;
    if (!Array.isArray(rows) || rows.length === 0) {
      return [];
    }
    const fresh = buildFiltersFromRows(rows, selections || {});
    setDashboardFilters(fresh);
    return fresh;
  }, []);

  /**
   * Re-derive domains after a viz operation, dropping the result if a newer
   * operation started or the user navigated to a different sheet meanwhile.
   */
  const refreshFilterDomains = useCallback(
    async (dashboardKey, selections, seq) => {
      const rows = await ensureFilterRows();
      if (!rows?.length) {
        console.warn("No capital-plan filter rows returned from database.");
        return [];
      }

      const fresh = buildFiltersFromRows(rows, selections || {});
      const onDetailDashboard =
        !dashboardKey || getActiveUrlRef.current?.() === dashboardKey;
      if (seq === filterOpSeqRef.current && onDetailDashboard) {
        setDashboardFilters(fresh);
      } else if (
        findDepartmentValuesInFilters(dashboardFiltersRef.current).length === 0
      ) {
        // Keep the Departments sidebar populated even when not on Detail.
        setDashboardFilters(buildFiltersFromRows(rows, {}));
      }
      return fresh;
    },
    [ensureFilterRows]
  );

  /** Current filter metadata for a field, falling back to an empty domain. */
  const resolveFilterMeta = useCallback((fieldName, fallback) => {
    const fromState = dashboardFiltersRef.current.find(
      (f) => f.fieldName === fieldName
    );
    if (fromState) {
      return fromState;
    }
    if (fallback && fallback.fieldName === fieldName) {
      return fallback;
    }
    return { fieldName, worksheetNames: [], values: [] };
  }, []);

  /** Tableau exposes the department dimension under more than one caption. */
  const getDepartmentFieldName = useCallback(
    (filters = dashboardFiltersRef.current) =>
      findDepartmentFilterInList(filters)?.fieldName || CATEGORY_FILTER,
    []
  );

  const getSelectedDepartment = useCallback(
    (selections = filterSelectionsRef.current) => {
      for (const name of DEPARTMENT_FILTER_ALIASES) {
        if (selections[name] !== undefined) {
          return selections[name];
        }
      }
      return undefined;
    },
    []
  );

  const nextFilterOpSeq = useCallback(() => ++filterOpSeqRef.current, []);

  /** Drop everything cached for the outgoing district. */
  const resetFilters = useCallback(() => {
    filterOpSeqRef.current += 1;
    filterRowsRef.current = null;
    filterRowsPromiseRef.current = null;
    setFilterSelections({});
    setDashboardFilters([]);
  }, []);

  return {
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
  };
};

export default useDashboardFilters;
