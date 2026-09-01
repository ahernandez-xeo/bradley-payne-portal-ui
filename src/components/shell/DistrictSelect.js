import classes from "../Landing.module.scss";

/**
 * Admin-only client impersonation dropdown. Shows an explicit switching state
 * instead of only greying the select out.
 */
const DistrictSelect = ({ districts, selectedDistrictId, onChange, switching }) => (
  <div className={classes.sideState}>
    <label className={classes.visuallyHidden} htmlFor="sidebar-district-select">
      Viewing client district
    </label>
    <div className={classes.selectDropdownWrapper}>
      <select
        id="sidebar-district-select"
        value={selectedDistrictId}
        onChange={(event) => onChange(event.target.value)}
        className={classes.selectDropdown}
        disabled={switching}
      >
        {districts.map((district) => (
          <option key={district.district_id} value={district.district_id}>
            {district.district_name}
          </option>
        ))}
      </select>
      <span className={classes.selectArrow} aria-hidden="true">
        &#9662;
      </span>
    </div>
    {switching && (
      <div className={classes.switchingHint} role="status">
        Switching client…
      </div>
    )}
  </div>
);

export default DistrictSelect;
