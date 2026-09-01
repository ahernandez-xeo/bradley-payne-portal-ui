import { useCallback, useRef, useState } from "react";

import { sheetNameFromLink } from "../utils/tableauFilters";

/** Worksheet excluded from filtering in the published workbook definition. */
const UNFILTERED_WORKSHEET = "TOTAL CAPITAL PLAN";

/**
 * Owns the live `<tableau-viz>` handle and every interaction with it.
 *
 * Tableau's Embedding API rejects overlapping calls on the same viz, so all
 * work goes through a single promise chain (`enqueueVizOp`) rather than being
 * fired off in parallel from event handlers.
 */
export const useTableauViz = ({ resolveFallbackViz } = {}) => {
  const vizRef = useRef(null);
  const vizOpChainRef = useRef(Promise.resolve());
  const [vizReady, setVizReady] = useState(false);
  // Outstanding queued operations. Nested enqueues (a sheet activation that
  // goes on to apply filters) register before their parent settles, so this
  // stays above zero for the whole transition rather than dipping between
  // steps.
  const [pendingOps, setPendingOps] = useState(0);

  // The viz element is normally captured from the `firstinteractive` handler;
  // the DOM walk is a fallback for the first export before that fires.
  const fallbackRef = useRef(resolveFallbackViz);
  fallbackRef.current = resolveFallbackViz;

  const getViz = useCallback(() => vizRef.current || fallbackRef.current?.() || null, []);

  const enqueueVizOp = useCallback((op) => {
    setPendingOps((count) => count + 1);
    const next = vizOpChainRef.current
      .then(op)
      .catch((error) => {
        console.error("Error in queued viz operation:", error);
      })
      .finally(() => {
        setPendingOps((count) => Math.max(0, count - 1));
      });
    vizOpChainRef.current = next;
    return next;
  }, []);

  /**
   * Switch sheets in place. Preferred over swapping the embed `src` because the
   * Tableau JWT is single-use, so a reload would drop the session.
   */
  const activateWorkbookSheet = useCallback(async (viz, link) => {
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
  }, []);

  /**
   * Set Tableau workbook parameters. Used so Overview/Funding load with
   * Department Selected and Category Selected = False, and so sheet switches
   * after the first paint stay in sync (viz-parameter is init-only).
   */
  const applyWorkbookParameters = useCallback(async (viz, parameters) => {
    if (!viz?.workbook || !parameters?.length) {
      return;
    }
    for (const { name, value } of parameters) {
      if (!name) {
        continue;
      }
      try {
        await viz.workbook.changeParameterValueAsync(name, value);
      } catch (error) {
        console.warn(`Unable to set parameter "${name}" to "${value}":`, error);
      }
    }
  }, []);

  /** Apply (or clear, with `__ALL__`) one field across the active sheet. */
  const applyFilterValue = useCallback(async (viz, filter, value) => {
    if (!viz || !filter?.fieldName) {
      return;
    }
    const activeSheet = viz.workbook?.activeSheet;
    if (!activeSheet) {
      console.warn("No active sheet available to apply filter");
      return;
    }

    // Apply per worksheet so sheets excluded in the Tableau workbook definition
    // are not forced through a dashboard-level filter.
    const worksheets =
      activeSheet.sheetType === "dashboard" ? activeSheet.worksheets : [activeSheet];

    const targets = worksheets.filter(
      (worksheet) =>
        (worksheet.name || "").trim().toUpperCase() !== UNFILTERED_WORKSHEET
    );

    const results = await Promise.all(
      targets.map(async (worksheet) => {
        try {
          if (value === "__ALL__") {
            await worksheet.clearFilterAsync(filter.fieldName);
          } else {
            await worksheet.applyFilterAsync(filter.fieldName, [value], "replace");
          }
          return true;
        } catch (error) {
          // Worksheet may not expose this field — ignore and continue.
          return false;
        }
      })
    );

    if (!results.some(Boolean)) {
      console.warn(`Unable to apply filter "${filter.fieldName}" to any worksheet`);
    }
  }, []);

  /** Returns "unavailable" | "ok" | "failed" so the caller owns the messaging. */
  const exportImage = useCallback(async () => {
    const viz = getViz();
    if (!viz || !viz.exportImageAsync) {
      return "unavailable";
    }
    try {
      await viz.exportImageAsync();
      return "ok";
    } catch (error) {
      console.error("Error exporting PNG:", error);
      return "failed";
    }
  }, [getViz]);

  /** Best-effort data refresh, used when the user returns from being idle. */
  const refreshData = useCallback(() => {
    try {
      const viz = getViz();
      if (viz && viz.refreshDataAsync) {
        viz.refreshDataAsync().catch((error) => {
          console.error("Error refreshing dashboard:", error);
        });
      }
    } catch (error) {
      console.error("Error refreshing dashboard:", error);
    }
  }, [getViz]);

  return {
    vizRef,
    vizReady,
    setVizReady,
    /** True while any queued sheet or filter work is still in flight. */
    vizBusy: pendingOps > 0,
    enqueueVizOp,
    activateWorkbookSheet,
    applyWorkbookParameters,
    applyFilterValue,
    exportImage,
    refreshData,
  };
};

export default useTableauViz;
