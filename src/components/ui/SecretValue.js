import { useState } from "react";

import classes from "./ui.module.scss";

/**
 * Masks a one-time secret (e.g. a generated default password) so it is not
 * left sitting in plain text on screen, while still letting an admin copy it.
 */
const SecretValue = ({ value, label = "password", onCopied }) => {
  const [revealed, setRevealed] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(value);
      onCopied?.();
    } catch {
      // Clipboard can be blocked by permissions — reveal so it can be read.
      setRevealed(true);
    }
  };

  return (
    <span className={classes.secretRow}>
      <span className={classes.secretValue}>
        {revealed ? value : "•".repeat(Math.min(value?.length || 8, 16))}
      </span>
      <button
        type="button"
        className={classes.secretBtn}
        onClick={() => setRevealed((current) => !current)}
        aria-label={revealed ? `Hide ${label}` : `Show ${label}`}
      >
        {revealed ? "Hide" : "Show"}
      </button>
      <button
        type="button"
        className={classes.secretBtn}
        onClick={handleCopy}
        aria-label={`Copy ${label}`}
      >
        Copy
      </button>
    </span>
  );
};

export default SecretValue;
