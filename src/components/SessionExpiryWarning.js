import { useContext, useEffect, useState } from "react";

import ValidUserContext from "../authCheck";
import ConfirmDialog from "./ui/ConfirmDialog";
import { useToast } from "./Toast/ToastProvider";

/** Start warning this long before the session actually expires. */
const WARN_BEFORE_MS = 2 * 60 * 1000;
const POLL_INTERVAL_MS = 15 * 1000;

const formatCountdown = (ms) => {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${String(seconds).padStart(2, "0")}`;
};

/**
 * Warns before the JWT expires instead of silently dropping the user back to
 * the login screen and discarding whatever they were working on.
 */
const SessionExpiryWarning = () => {
  const validUserContext = useContext(ValidUserContext);
  const { showToast } = useToast();
  const [remaining, setRemaining] = useState(null);
  const [extending, setExtending] = useState(false);

  useEffect(() => {
    if (!validUserContext.isLoggedIn) {
      setRemaining(null);
      return undefined;
    }

    const check = () => {
      const expiry = validUserContext.getSessionExpiry?.();
      if (!expiry) {
        setRemaining(null);
        return;
      }
      const msLeft = expiry - Date.now();
      setRemaining(msLeft <= WARN_BEFORE_MS ? msLeft : null);
    };

    check();
    const intervalId = setInterval(check, POLL_INTERVAL_MS);
    return () => clearInterval(intervalId);
  }, [validUserContext]);

  // Tick every second only while the warning is actually on screen.
  const warningVisible = remaining !== null;
  useEffect(() => {
    if (!warningVisible) {
      return undefined;
    }
    const tickId = setInterval(() => {
      setRemaining((current) => (current === null ? null : current - 1000));
    }, 1000);
    return () => clearInterval(tickId);
  }, [warningVisible]);

  useEffect(() => {
    if (remaining !== null && remaining <= 0) {
      validUserContext.logoutUser();
    }
  }, [remaining, validUserContext]);

  const handleExtend = async () => {
    setExtending(true);
    try {
      await validUserContext.extendSession();
      setRemaining(null);
      showToast("Your session has been extended.", { variant: "success" });
    } catch (error) {
      showToast("Could not extend your session. Please sign in again.", {
        variant: "error",
      });
    } finally {
      setExtending(false);
    }
  };

  if (remaining === null || remaining <= 0) {
    return null;
  }

  return (
    <ConfirmDialog
      open
      title="Your session is about to expire"
      message={`You will be signed out in ${formatCountdown(
        remaining
      )}. Any unsaved changes will be lost. Stay signed in to keep working.`}
      confirmLabel="Stay signed in"
      cancelLabel="Sign out now"
      busy={extending}
      onConfirm={handleExtend}
      onCancel={() => validUserContext.logoutUser()}
    />
  );
};

export default SessionExpiryWarning;
