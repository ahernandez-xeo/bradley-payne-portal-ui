import { useEffect, useContext, useState } from "react";

import classes from "./LoginForm.module.scss";
import ValidUserContext from "../authCheck";
import { deleteSubscriptionWT } from './ApiService';
import { useToast } from "./Toast/ToastProvider";

let isInitial = true;

function UnsubscribeForm() {
  const validUserContext = useContext(ValidUserContext);
  const { showToast } = useToast();
  const [submitting, setSubmitting] = useState(false);
  const [done, setDone] = useState(false);

  useEffect(() => {
    if (isInitial) {
      validUserContext.localAuthCheck(true);
      isInitial = false;
    }
  }, [validUserContext]);

  const submitHandler = async (event) => {
    event.preventDefault();
    if (submitting || done) {
      return;
    }
    setSubmitting(true);
    try {
      await deleteSubscriptionWT({ token: validUserContext.unSubscribeUserValue });
      setDone(true);
      showToast("You will no longer receive the Daily Snapshot email.", {
        variant: "success",
        title: "Unsubscribed",
      });
    } catch (error) {
      console.error("Failed to unsubscribe:", error);
      showToast(
        "We could not process your request. The link may have expired — contact support@bradleypayne.com and we will remove you manually.",
        { variant: "error", title: "Unsubscribe failed" }
      );
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <form onSubmit={submitHandler} className={classes.form}>
      <div className={classes.loginInstructions}>Unsubscribe Daily Snapshot</div>
      <button className={classes.loginBtn} disabled={submitting || done}>
        {done ? "Unsubscribed" : submitting ? "Unsubscribing…" : "Confirm"}
      </button>
    </form>
  );
}

export default UnsubscribeForm;
