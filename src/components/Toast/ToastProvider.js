import { createContext, useCallback, useContext, useMemo, useRef, useState } from "react";

import classes from "./Toast.module.scss";

const ToastContext = createContext({
  showToast: () => {},
  dismissToast: () => {},
});

const DEFAULT_DURATION = 6000;
/** Errors stay put until dismissed — they usually need the user to act. */
const ERROR_DURATION = 0;

const ICONS = {
  success: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  ),
  error: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 8v5M12 16h.01" />
    </svg>
  ),
  info: (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <circle cx="12" cy="12" r="9" />
      <path d="M12 11v5M12 8h.01" />
    </svg>
  ),
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef(new Map());
  const idRef = useRef(0);

  const dismissToast = useCallback((id) => {
    const timer = timersRef.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timersRef.current.delete(id);
    }
    setToasts((current) => current.filter((toast) => toast.id !== id));
  }, []);

  const showToast = useCallback(
    (message, { variant = "info", duration, title } = {}) => {
      if (!message) {
        return null;
      }
      const id = ++idRef.current;
      const resolvedDuration =
        duration !== undefined
          ? duration
          : variant === "error"
          ? ERROR_DURATION
          : DEFAULT_DURATION;

      setToasts((current) => [...current, { id, message, variant, title }]);

      if (resolvedDuration > 0) {
        timersRef.current.set(
          id,
          setTimeout(() => dismissToast(id), resolvedDuration)
        );
      }
      return id;
    },
    [dismissToast]
  );

  const value = useMemo(() => ({ showToast, dismissToast }), [showToast, dismissToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        className={classes.region}
        role="region"
        aria-label="Notifications"
        aria-live="polite"
      >
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`${classes.toast} ${classes[toast.variant] || classes.info}`}
            role={toast.variant === "error" ? "alert" : "status"}
          >
            <span className={classes.icon} aria-hidden="true">
              {ICONS[toast.variant] || ICONS.info}
            </span>
            <div className={classes.body}>
              {toast.title && <div className={classes.title}>{toast.title}</div>}
              <div className={classes.message}>{toast.message}</div>
            </div>
            <button
              type="button"
              className={classes.close}
              onClick={() => dismissToast(toast.id)}
              aria-label="Dismiss notification"
            >
              &#10005;
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => useContext(ToastContext);

export default ToastContext;
