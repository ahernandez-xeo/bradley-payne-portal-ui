import { useRef, useEffect, useContext } from "react";

import classes from "./LoginForm.module.scss";
import ValidUserContext from "../authCheck";

let isInitial = true;

function LoginForm() {
  const validUserContext = useContext(ValidUserContext);

  const emailInputRef = useRef();
  const passwordInputRef = useRef();

  useEffect(() => {
    if (isInitial) {
      validUserContext.localAuthCheck(true);
      isInitial = false;
    }
  }, [validUserContext]);

  const submitHandler = (event) => {
    event.preventDefault();

    validUserContext.apiAuthCheck(
      emailInputRef.current.value,
      passwordInputRef.current.value,
      false
    );
  };

  const handleForgotClick = () => {
    validUserContext.forgotPassword();
  };

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
        <div className={classes.forgot} onClick={() => handleForgotClick()}>
          Forgot Password?
        </div>
        <button
          className={classes.loginBtn}
          disabled={validUserContext.isLoggedIn}
        >
          {validUserContext.isLoggedIn ? "Already logged in" : "Sign In"}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
