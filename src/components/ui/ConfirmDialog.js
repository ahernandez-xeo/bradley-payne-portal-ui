import { useEffect, useRef } from "react";

import classes from "./ui.module.scss";

/**
 * Accessible replacement for window.confirm — focus-trapped, Escape-closable,
 * and able to label destructive actions properly.
 */
const ConfirmDialog = ({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  destructive = false,
  busy = false,
  onConfirm,
  onCancel,
}) => {
  const dialogRef = useRef(null);
  const confirmRef = useRef(null);
  const restoreFocusRef = useRef(null);

  useEffect(() => {
    if (!open) {
      return undefined;
    }
    restoreFocusRef.current = document.activeElement;
    confirmRef.current?.focus();

    const handleKeyDown = (event) => {
      if (event.key === "Escape") {
        event.stopPropagation();
        onCancel?.();
        return;
      }
      if (event.key !== "Tab") {
        return;
      }
      const focusable = dialogRef.current?.querySelectorAll(
        'button:not([disabled]), [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusable?.length) {
        return;
      }
      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && document.activeElement === first) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && document.activeElement === last) {
        event.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", handleKeyDown, true);
    return () => {
      document.removeEventListener("keydown", handleKeyDown, true);
      if (restoreFocusRef.current instanceof HTMLElement) {
        restoreFocusRef.current.focus();
      }
    };
  }, [open, onCancel]);

  if (!open) {
    return null;
  }

  return (
    <div className={classes.confirmOverlay} onMouseDown={onCancel}>
      <div
        ref={dialogRef}
        className={classes.confirmDialog}
        role="dialog"
        aria-modal="true"
        aria-labelledby="confirm-dialog-title"
        aria-describedby={message ? "confirm-dialog-message" : undefined}
        onMouseDown={(event) => event.stopPropagation()}
      >
        <h2 className={classes.confirmTitle} id="confirm-dialog-title">
          {title}
        </h2>
        {message && (
          <p className={classes.confirmMessage} id="confirm-dialog-message">
            {message}
          </p>
        )}
        <div className={classes.confirmActions}>
          <button
            type="button"
            className={classes.confirmCancel}
            onClick={onCancel}
            disabled={busy}
          >
            {cancelLabel}
          </button>
          <button
            ref={confirmRef}
            type="button"
            className={
              destructive ? classes.confirmDestructive : classes.confirmPrimary
            }
            onClick={onConfirm}
            disabled={busy}
          >
            {busy ? "Working…" : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmDialog;
