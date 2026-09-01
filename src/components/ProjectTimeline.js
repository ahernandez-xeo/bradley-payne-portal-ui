import { useEffect, useState } from "react";
import classes from "./ProjectTimeline.module.scss";
import { fetchTimeline } from "./ApiService";
import { Skeleton } from "./ui/Skeleton";
import EmptyState from "./ui/EmptyState";

const formatMoney = (amount) => {
  const value = Number(amount) || 0;
  const abs = Math.abs(value);
  const sign = value < 0 ? "-" : "";
  if (abs >= 1_000_000) {
    const m = abs / 1_000_000;
    return `${sign}$${m >= 10 ? m.toFixed(1) : m.toFixed(1)}M`.replace(".0M", "M");
  }
  if (abs >= 1_000) {
    const k = abs / 1_000;
    return `${sign}$${k >= 100 ? Math.round(k) : k.toFixed(1)}K`.replace(".0K", "K");
  }
  return `${sign}$${Math.round(abs).toLocaleString()}`;
};

const formatPlanTotal = (amount) => {
  const value = Number(amount) || 0;
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(1)}M`.replace(".0M", "M");
  }
  return formatMoney(value);
};

const ProjectTimeline = ({ clientKey }) => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [data, setData] = useState(null);

  useEffect(() => {
    let cancelled = false;
    const load = async () => {
      setLoading(true);
      setError(null);
      try {
        const result = await fetchTimeline(clientKey);
        if (!cancelled) {
          setData(result);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err.message || "Unable to load timeline");
          setData(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    };
    if (clientKey) {
      load();
    }
    return () => {
      cancelled = true;
    };
  }, [clientKey]);

  if (loading) {
    return (
      <div className={classes.wrap}>
        <div className={classes.headerRow}>
          <div className={classes.skeletonHeader}>
            <Skeleton width="240px" height={26} />
            <Skeleton width="320px" height={14} />
          </div>
          <Skeleton width="160px" height={48} radius="var(--radius-md)" />
        </div>
        <div className={classes.timeline}>
          {Array.from({ length: 4 }).map((_, index) => (
            <div className={classes.yearRow} key={index}>
              <div className={classes.rail}>
                <Skeleton width="48px" height={48} radius="50%" />
              </div>
              <div className={classes.card}>
                <Skeleton width="60%" height={18} />
                <div className={classes.skeletonLines}>
                  <Skeleton width="90%" height={12} />
                  <Skeleton width="80%" height={12} />
                  <Skeleton width="85%" height={12} />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.wrap}>
        <EmptyState
          variant="error"
          title="Timeline unavailable"
          message={
            error.includes("404")
              ? "No project timeline has been generated for this district yet. Once the capital plan data is loaded, the timeline will appear here."
              : error
          }
        />
      </div>
    );
  }

  const timeline = data?.timeline_json || {};
  const years = Array.isArray(timeline.years) ? timeline.years : [];
  const title = timeline.title || "Project Timeline";
  const subtitle =
    timeline.subtitle || "Year-by-year narrative of the Capital Plan";

  if (years.length === 0) {
    return (
      <div className={classes.wrap}>
        <EmptyState
          title="No timeline years yet"
          message="The timeline for this district has been created but does not contain any years. Check that the capital plan data covers the current planning window."
        />
      </div>
    );
  }

  return (
    <div className={classes.wrap}>
      <div className={classes.headerRow}>
        <div>
          <h1 className={classes.title}>{title}</h1>
          <p className={classes.subtitle}>{subtitle}</p>
        </div>
        <div className={classes.totalBlock}>
          <div className={classes.totalLabel}>10-Year Plan Total</div>
          <div className={classes.totalValue}>
            {formatPlanTotal(data?.total_plan_amount)}
          </div>
        </div>
      </div>

      <div className={classes.timeline}>
        {years.map((year, index) => {
          const markerClass =
            index % 2 === 0 ? classes.markerEven : classes.markerOdd;
          return (
            <div className={classes.yearRow} key={year.year || index}>
              <div className={classes.rail}>
                <div className={`${classes.marker} ${markerClass}`}>
                  {year.year_short || `'${String(year.year).slice(-2)}`}
                </div>
                <div className={classes.phase}>{year.phase_label}</div>
                {index < years.length - 1 && <div className={classes.railLine} />}
              </div>
              <div className={classes.card}>
                <div className={classes.cardTop}>
                  <h2 className={classes.headline}>{year.headline}</h2>
                  <div className={classes.yearTotal}>
                    {formatMoney(year.annual_total)}
                  </div>
                </div>
                <ul className={classes.bullets}>
                  {(year.bullets || []).map((bullet, bulletIndex) => (
                    <li key={bulletIndex}>
                      {bullet.text}
                      {bullet.amount != null && Number(bullet.amount) > 0
                        ? ` (${formatMoney(bullet.amount)})`
                        : ""}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default ProjectTimeline;
