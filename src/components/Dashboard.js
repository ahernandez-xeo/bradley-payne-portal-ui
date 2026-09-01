import classes from "./Landing.module.scss";
import { useRef, useEffect, useState, useContext } from "react";
import ValidUserContext from "../authCheck";
import { useToast } from "./Toast/ToastProvider";

/** How long to wait for `firstinteractive` before telling the user. */
const VIZ_LOAD_TIMEOUT = 25000;

const Dashboard = ({
  dashboardLinkProp,
  initialFilters,
  initialParameters,
  onDashboardReady,
}) => {
  const [dashboardLink, setDashboardLink] = useState(dashboardLinkProp);
  const [loaded, setLoaded] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);
  const elementRef = useRef();
  const linkRef = useRef(dashboardLink);
  const onDashboardReadyRef = useRef(onDashboardReady);

  // Tableau reads <viz-filter> and <viz-parameter> children once, when the
  // element initializes, so these are frozen at mount.
  const initialFiltersRef = useRef(initialFilters || []);
  const initialParametersRef = useRef(initialParameters || []);

  const validUserContext = useContext(ValidUserContext);
  const { showToast } = useToast();

  useEffect(() => {
    onDashboardReadyRef.current = onDashboardReady;
  }, [onDashboardReady]);

  const buildDashboardUrl = (link) =>
    "https://us-east-1.online.tableau.com/#/site/bradleypayneplatform/views/" +
    (link || "").replace("/sheets", "") +
    "?:showVizHome=no&:embed=true&:toolbar=no&:tabs=n&refresh=yes";

  useEffect(() => {
    setDashboardLink(dashboardLinkProp);
    linkRef.current = dashboardLinkProp;
    setLoaded(false);
    setLoadFailed(false);

    // Keep the same <tableau-viz> instance (JWT is one-time redeemable).
    // Explicitly update src so sheet switches re-fire firstinteractive.
    const viz = elementRef.current;
    if (viz && dashboardLinkProp) {
      const nextSrc = buildDashboardUrl(dashboardLinkProp);
      if (viz.src !== nextSrc) {
        // Mark session still active during in-place sheet switches so the
        // idle logout timer does not fire mid-navigation.
        localStorage.setItem("tableauActive", true);
        viz.src = nextSrc;
      }
    }

    const timeoutId = setTimeout(() => {
      var tableauActive = JSON.parse(localStorage.getItem("tableauActive"));
      if (!tableauActive) {
        validUserContext.logoutUser();
      }
    }, 30000);

    return () => clearTimeout(timeoutId);
    // Keyed on the sheet link only: re-running whenever the auth context
    // changes identity would restart the inactivity timeout.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dashboardLinkProp]);

  useEffect(() => {
    const viz = elementRef.current;
    if (!viz) {
      return;
    }

    const handleFirstInteractive = async () => {
      localStorage.setItem("tableauActive", true);
      setLoaded(true);
      setLoadFailed(false);
      try {
        await viz.refreshDataAsync();
      } catch (error) {
        console.error("Error refreshing viz on load:", error);
      }
      if (onDashboardReadyRef.current) {
        onDashboardReadyRef.current(viz);
      }
    };

    const handleVizError = (event) => {
      console.error("Tableau viz error:", event?.detail || event);
      setLoadFailed(true);
      showToast(
        "The capital plan dashboard could not be loaded. Reload the portal, and contact support if it keeps failing.",
        { variant: "error", title: "Dashboard unavailable" }
      );
    };

    viz.addEventListener("firstinteractive", handleFirstInteractive);
    viz.addEventListener("vizloaderror", handleVizError);

    return () => {
      viz.removeEventListener("firstinteractive", handleFirstInteractive);
      viz.removeEventListener("vizloaderror", handleVizError);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Surface a stall even when Tableau never fires an error event.
  useEffect(() => {
    if (loaded || loadFailed) {
      return undefined;
    }
    const timeoutId = setTimeout(() => {
      setLoadFailed(true);
      showToast(
        "The capital plan dashboard is taking longer than expected to load. Reload the portal to try again.",
        { variant: "error", title: "Dashboard is not responding" }
      );
    }, VIZ_LOAD_TIMEOUT);
    return () => clearTimeout(timeoutId);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loaded, loadFailed, dashboardLink]);

  const handleTableauLoad = () => {
    validUserContext.localAuthCheck(false);
  };

  var jwtToken = JSON.parse(localStorage.getItem("tableau-login-data"));
  localStorage.setItem("tableau-login-data", JSON.stringify("redeemed"));

  var inputProps = {};

  if (jwtToken !== "redeemed") {
    inputProps.token = jwtToken;
  }
  const dashboardURL = buildDashboardUrl(dashboardLink);

  return (
    <div className={classes.dashboardContainer}>
      <tableau-viz
        class={`${classes.tabframe}`}
        onLoad={() => handleTableauLoad()}
        ref={elementRef}
        id="tableauViz"
        refresh="yes"
        width="100%"
        height="100%"
        hide-tabs="true"
        toolbar="hidden"
        src={dashboardURL}
        {...inputProps}
      >
        {initialFiltersRef.current.map(({ field, value }) => (
          <viz-filter key={field} field={field} value={value}></viz-filter>
        ))}
        {initialParametersRef.current.map(({ name, value }) => (
          <viz-parameter key={name} name={name} value={value}></viz-parameter>
        ))}
        <custom-parameter name=":refresh" value="yes"></custom-parameter>
      </tableau-viz>
      {!loaded && (
        <div className={classes.vizOverlay} aria-live="polite">
          <div className={classes.vizOverlayCard}>
            {loadFailed ? (
              <>
                <div className={classes.vizOverlayTitle}>Dashboard unavailable</div>
                <div className={classes.vizOverlayText}>
                  The capital plan could not be loaded. Reload the portal to try again.
                </div>
                <button
                  type="button"
                  className={classes.vizOverlayBtn}
                  onClick={() => window.location.reload()}
                >
                  Reload portal
                </button>
              </>
            ) : (
              <>
                <div className={classes.filterLoadingSpinner} />
                <div className={classes.vizOverlayText}>Loading capital plan…</div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;
