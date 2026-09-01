import classes from "../Landing.module.scss";
import NavItem from "./NavItem";
import { Skeleton } from "../ui/Skeleton";

/**
 * Capital-plan sidebar: At a Glance, the department list driven by BigQuery
 * filter rows, and the Funding sheets.
 */
const SidebarNav = ({
  sheetMap,
  embedContent,
  activeNavRole,
  departmentValues,
  selectedDepartment,
  onDetail,
  filtersLoading,
  filtersError,
  onTimelineClick,
  onOverviewClick,
  onDepartmentSelect,
  onFundingClick,
}) => {
  const renderDepartments = () => {
    if (filtersLoading && departmentValues.length === 0) {
      return (
        <div className={classes.navSkeletons}>
          {Array.from({ length: 5 }).map((_, index) => (
            <Skeleton key={index} width="70%" height={12} />
          ))}
        </div>
      );
    }

    if (departmentValues.length === 0) {
      return (
        <div className={classes.navEmpty}>
          {filtersError
            ? "Departments could not be loaded. Reload the portal to try again."
            : "No departments in this capital plan yet."}
        </div>
      );
    }

    return departmentValues.map((value) => (
      <NavItem
        key={value}
        active={onDetail && selectedDepartment === value}
        onClick={() => onDepartmentSelect(value)}
      >
        {value}
      </NavItem>
    ));
  };

  return (
    <nav aria-label="Capital plan sections">
      <div className={classes.navSection}>
        <div className={classes.navSectionTitle}>At a Glance</div>
        <NavItem active={embedContent === "timeline"} onClick={onTimelineClick}>
          Project Timeline
        </NavItem>
        {sheetMap.overview && (
          <NavItem
            active={embedContent === "dashboard" && activeNavRole === "overview"}
            onClick={onOverviewClick}
          >
            Capital Plan Overview
          </NavItem>
        )}
      </div>

      <div className={classes.navSection}>
        <div className={classes.navSectionTitle}>Departments</div>
        {renderDepartments()}
      </div>

      {(sheetMap.forecast || sheetMap.financing) && (
        <div className={classes.navSection}>
          <div className={classes.navSectionTitle}>Funding</div>
          {sheetMap.forecast && (
            <NavItem
              active={embedContent === "dashboard" && activeNavRole === "forecast"}
              onClick={() => onFundingClick("forecast")}
            >
              Forecast
            </NavItem>
          )}
          {sheetMap.financing && (
            <NavItem
              active={embedContent === "dashboard" && activeNavRole === "financing"}
              onClick={() => onFundingClick("financing")}
            >
              Financing
            </NavItem>
          )}
        </div>
      )}
    </nav>
  );
};

export default SidebarNav;
