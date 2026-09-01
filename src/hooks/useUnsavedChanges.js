import { useCallback, useEffect, useRef } from "react";

/**
 * Warns before work in progress is thrown away.
 *
 * Covers both exits: `beforeunload` for tab close / reload, and
 * `confirmDiscard` for in-app navigation (switching district, category or
 * location), which React cannot intercept on its own.
 */
export const useUnsavedChanges = (isDirty, message = "You have unsaved changes.") => {
  const dirtyRef = useRef(isDirty);

  useEffect(() => {
    dirtyRef.current = isDirty;
  }, [isDirty]);

  useEffect(() => {
    const handleBeforeUnload = (event) => {
      if (!dirtyRef.current) {
        return undefined;
      }
      event.preventDefault();
      // Browsers ignore custom text now, but a non-empty returnValue is still
      // what triggers the native prompt.
      event.returnValue = message;
      return message;
    };

    window.addEventListener("beforeunload", handleBeforeUnload);
    return () => window.removeEventListener("beforeunload", handleBeforeUnload);
  }, [message]);

  const confirmDiscard = useCallback(() => {
    if (!dirtyRef.current) {
      return true;
    }
    // eslint-disable-next-line no-alert
    return window.confirm(`${message} Discard them and continue?`);
  }, [message]);

  return { confirmDiscard };
};

export default useUnsavedChanges;
