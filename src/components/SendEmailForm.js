import { useRef, useEffect, useContext } from "react";
import { Link } from "react-router-dom";

import classes from "./LoginForm.module.scss";
import ValidUserContext from "../authCheck";

let isInitial = true;

function SendEmailForm() {
  const validUserContext = useContext(ValidUserContext);

  const emailInputRef = useRef();

  useEffect(() => {
    if (isInitial) {
      validUserContext.localAuthCheck(true);
      isInitial = false;
    }
  }, [validUserContext]);

  const submitHandler = (event) => {
    event.preventDefault();
    if (validUserContext.isLoggingIn) {
      return;
    }
    validUserContext.apiSendPwdResetHandler(emailInputRef.current.value);
  };

  const submitDisabled =
    validUserContext.isLoggedIn || validUserContext.isLoggingIn;

  return (
    <form onSubmit={submitHandler} className={classes.form}>
      <div className={classes.loginInstructions}>
        Please enter your email address to reset your password
      </div>
      <div>
        <input
          className={classes.input}
          type="email"
          id="user-name"
          name="user-name"
          autoComplete="on"
          placeholder="E-mail"
          ref={emailInputRef}
          required={!validUserContext.isLoggedIn}
        />
      </div>
      <button className={classes.loginBtn} disabled={submitDisabled}>
        {validUserContext.isLoggedIn
          ? "Already logged in"
          : validUserContext.isLoggingIn
          ? "Sending…"
          : "Send Email"}
      </button>
      <div className={classes.loginOptions}>
        <Link className={classes.forgot} to="/login">
          Back to sign in
        </Link>
      </div>
    </form>
  );
}

export default SendEmailForm;
