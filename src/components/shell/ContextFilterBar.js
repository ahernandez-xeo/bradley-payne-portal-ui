import classes from "../Landing.module.scss";
import { filterDisplayName, TOP_FILTER_ORDER } from "../../utils/tableauFilters";

/**
 * Location Type / Location filters shown above the Detail sheet. Selects are
 * disabled until the viz is interactive; the hint explains why rather than
 * leaving them silently greyed out.
 */
const ContextFilterBar = ({
  filters,
  selections,
  vizReady,
  hasSelection,
  onFilterChange,
  onClear,
}) => {
  const interactionDisabled = !vizReady;
  const filtersToShow =
    filters.length > 0
      ? filters
      : TOP_FILTER_ORDER.map((fieldName) => ({
          fieldName,
          values: [],
          worksheetNames: [],
        }));

  return (
    <div className={classes.contextBar}>
      <div className={classes.contextBarFilters}>
        <span className={classes.contextBarLabel} id="context-filter-label">
          Filter by
        </span>
        {filtersToShow.map((filter) => {
          const selected = selections[filter.fieldName] ?? "";
          const label = filterDisplayName(filter.fieldName);
          const selectId = `context-filter-${filter.fieldName.replace(/\s+/g, "-")}`;
          return (
            <div className={classes.contextBarItem} key={filter.fieldName}>
              <label className={classes.visuallyHidden} htmlFor={selectId}>
                {label}
              </label>
              <div className={classes.contextBarSelectWrapper}>
                <select
                  id={selectId}
                  className={classes.contextBarSelect}
                  disabled={interactionDisabled || !(filter.values || []).length}
                  value={selected}
                  onChange={(event) => onFilterChange(filter, event.target.value)}
                >
                  <option value="">All {label.replace(/Type$/, "Types")}</option>
                  {(filter.values || []).map((value, valueIndex) => (
                    <option key={valueIndex} value={value}>
                      {value}
                    </option>
                  ))}
                </select>
                <span className={classes.contextBarArrow} aria-hidden="true">
                  &#9662;
                </span>
              </div>
            </div>
          );
        })}
        {interactionDisabled && (
          <span className={classes.contextBarHint} role="status">
            Waiting for the dashboard to finish loading…
          </span>
        )}
      </div>
      {hasSelection && (
        <button
          type="button"
          className={`${classes.contextBarClear} ${
            interactionDisabled ? classes.contextBarClearDisabled : ""
          }`}
          onClick={onClear}
          disabled={interactionDisabled}
        >
          Clear
        </button>
      )}
    </div>
  );
};

export default ContextFilterBar;
