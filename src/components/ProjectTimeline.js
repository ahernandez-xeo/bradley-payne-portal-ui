import { useEffect, useState } from "react";
import classes from "./ProjectTimeline.module.scss";
import { fetchTimeline } from "./ApiService";

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
        <div className={classes.stateCard}>Loading project timeline…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={classes.wrap}>
        <div className={classes.stateCard}>
          <div className={classes.stateTitle}>Timeline unavailable</div>
          <div className={classes.stateCopy}>
            {error.includes("404")
              ? "No generated timeline was found for this district yet. Run POST /timeline/generate after the capital plan CSV is loaded."
              : error}
          </div>
        </div>
      </div>
    );
  }

  const timeline = data?.timeline_json || {};
  const years = Array.isArray(timeline.years) ? timeline.years : [];
  const title = timeline.title || "Project Timeline";
  const subtitle =
    timeline.subtitle || "Year-by-year narrative of the Capital Plan";

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
