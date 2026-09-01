import classes from "../Landing.module.scss";

/**
 * Single sidebar entry. A real <button> rather than a clickable <div> so it is
 * reachable by keyboard and announced as a control.
 */
const NavItem = ({ active, onClick, children }) => (
  <button
    type="button"
    className={`${classes.sideButton} ${active ? classes.active : ""}`}
    onClick={onClick}
    aria-current={active ? "page" : undefined}
  >
    {children}
  </button>
);

export default NavItem;
