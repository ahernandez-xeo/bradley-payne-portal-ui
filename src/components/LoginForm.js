import { useRef, useEffect, useState, useContext } from "react";

import classes from "./LoginForm.module.scss";
import usernameIcon from "../assets/fa-user.svg";
import passwordIcon from "../assets/carbon_password.svg";
import ValidUserContext from "../authCheck";


let isInitial = true;

function LoginForm() {
  const validUserContext = useContext(ValidUserContext);
  const [disclaimerAcknowledged, setDisclaimerAcknowledged] = useState(true);


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
    validUserContext.forgotPassword()
  }

  return (
    <div className={classes.logincontainer}>
      <form onSubmit={submitHandler} className={classes.form}>
        <div className={classes.loginInstructions}>
          Please enter your email address and password.
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
            // value={rememberMeValue} 
            required={!validUserContext.isLoggedIn}
          ></input>
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
          ></input>
        </div>
        {/* <div className={classes.rememberMeContainer}>
          <input
            type="checkbox"
            id="remember-me"
            name="remember-me"
            checked={rememberMe}
            onChange={handleRememberMeChange}
          />
          <label htmlFor="remember-me" className={classes.rememberMeLabel}>
            Remember Me
          </label>
        </div> */}
        <div className={classes.forgot} onClick={() => handleForgotClick()}>Forgot Password?</div>
        <button
          className={`${disclaimerAcknowledged ? classes.loginBtn : classes.loginBtnDisabled}`}
          disabled={validUserContext.isLoggedIn || !disclaimerAcknowledged}
        >
          {validUserContext.isLoggedIn ? "Already logged in" : "Login"}
        </button>
      </form>
    </div>
  );
}

export default LoginForm;
