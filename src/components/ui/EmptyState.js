import classes from "./ui.module.scss";

/**
 * Shown when a list resolved successfully but has nothing in it, or when it
 * failed. Both cases used to render as blank space.
 */
const EmptyState = ({ title, message, action, variant = "empty" }) => (
  <div
    className={`${classes.emptyState} ${
      variant === "error" ? classes.emptyStateError : ""
    }`}
  >
    {title && <div className={classes.emptyTitle}>{title}</div>}
    {message && <div className={classes.emptyMessage}>{message}</div>}
    {action && <div className={classes.emptyAction}>{action}</div>}
  </div>
);

export default EmptyState;
