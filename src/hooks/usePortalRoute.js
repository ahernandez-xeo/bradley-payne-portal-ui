import { useCallback } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import { DEPARTMENT_FILTER_ALIASES } from "../utils/tableauFilters";

export const ROUTES = {
  home: "/",
  capitalPlan: "/capital-plan",
  timeline: "/capital-plan/timeline",
  adminUsers: "/admin/users",
  adminNarratives: "/admin/narratives",
};

/** Query params that mirror the Detail sheet's filter selections. */
export const FILTER_PARAMS = {
  Category: "dept",
  "Location Type": "locationType",
  LOCATION: "location",
};

/**
 * Tableau exposes the department dimension as either Category or Department
 * depending on the workbook, and both belong in the same `dept` param.
 */
const paramForField = (field) =>
  FILTER_PARAMS[field] ||
  (DEPARTMENT_FILTER_ALIASES.includes(field) ? FILTER_PARAMS.Category : null);

/**
 * Maps the authenticated shell's view state onto the URL so views are
 * bookmarkable, the back button works, and a refresh keeps your place.
 */
export const usePortalRoute = () => {
  const location = useLocation();
  const navigate = useNavigate();

  const path = location.pathname;
  const portalView = path.startsWith("/admin")
    ? "admin"
    : path.startsWith("/capital-plan")
    ? "capital-plan"
    : "home";
  const embedContent = path === ROUTES.timeline ? "timeline" : "dashboard";
  const adminTab = path === ROUTES.adminNarratives ? "narrative" : "users";

  const goHome = useCallback(() => navigate(ROUTES.home), [navigate]);
  const goAdmin = useCallback(
    (tab = "users") =>
      navigate(tab === "narrative" ? ROUTES.adminNarratives : ROUTES.adminUsers),
    [navigate]
  );
  const goTimeline = useCallback(() => navigate(ROUTES.timeline), [navigate]);

  /** Navigate to the dashboard view, optionally rewriting filter params. */
  const goDashboard = useCallback(
    (selections) => {
      if (selections === undefined) {
        navigate({ pathname: ROUTES.capitalPlan, search: location.search });
        return;
      }
      const params = new URLSearchParams();
      Object.entries(selections).forEach(([field, value]) => {
        const param = paramForField(field);
        if (param && value) {
          params.set(param, value);
        }
      });
      const search = params.toString();
      navigate({
        pathname: ROUTES.capitalPlan,
        search: search ? `?${search}` : "",
      });
    },
    [navigate, location.search]
  );

  /** Filter selections encoded in the current URL. */
  const selectionsFromUrl = useCallback(() => {
    const params = new URLSearchParams(location.search);
    const selections = {};
    Object.entries(FILTER_PARAMS).forEach(([field, param]) => {
      const value = params.get(param);
      if (value) {
        selections[field] = value;
      }
    });
    return selections;
  }, [location.search]);

  return {
    portalView,
    embedContent,
    adminTab,
    goHome,
    goAdmin,
    goTimeline,
    goDashboard,
    selectionsFromUrl,
  };
};

export default usePortalRoute;
