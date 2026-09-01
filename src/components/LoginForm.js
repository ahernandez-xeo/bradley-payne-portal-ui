import { useRef, useEffect, useContext, useState } from "react";
import { Link } from "react-router-dom";

import classes from "./LoginForm.module.scss";
import ValidUserContext from "../authCheck";

let isInitial = true;

function LoginForm() {
  const validUserContext = useContext(ValidUserContext);

  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const [rememberMe, setRememberMe] = useState(
    () => JSON.parse(localStorage.getItem("remember-me")) ? true : false
  );

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

    validUserContext.apiAuthCheck(
      emailInputRef.current.value,
      passwordInputRef.current.value,
      false,
      rememberMe
    );
  };

  const submitDisabled =
    validUserContext.isLoggedIn || validUserContext.isLoggingIn;

  return (
    <div className={classes.logincontainer}>
      <form onSubmit={submitHandler} className={classes.form}>
        <div className={classes.loginInstructions}>
          Enter your access credentials to continue
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

        <div>
          <input
            className={classes.input}
            type="password"
            id="user-password"
            name="user-password"
            autoComplete="off"
            placeholder="Password"
            ref={passwordInputRef}
            required={!validUserContext.isLoggedIn}
          />
        </div>

        <div className={classes.loginOptions}>
          <label className={classes.rememberMe}>
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(event) => setRememberMe(event.target.checked)}
            />
            <span>Keep me signed in</span>
          </label>
          <Link className={classes.forgot} to="/forgot-password">
            Forgot Password?
          </Link>
        </div>

        <button className={classes.loginBtn} disabled={submitDisabled}>
          {validUserContext.isLoggedIn
            ? "Already logged in"
            : validUserContext.isLoggingIn
            ? "Signing in…"
            : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
