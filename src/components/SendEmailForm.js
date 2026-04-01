import { useRef, useEffect, useContext } from "react";

import classes from "./LoginForm.module.scss";
import ValidUserContext from "../authCheck";
import usernameIcon from "../assets/fa-user.svg";


let isInitial = true;

function SendEmailForm() {
  const validUserContext = useContext(ValidUserContext);

  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const passwordConfirmInputRef = useRef();

  useEffect(() => {
    if (isInitial) {
      validUserContext.localAuthCheck(true);
      isInitial = false;
    }
  }, [validUserContext]);

  const submitHandler = (event) => {
    event.preventDefault();
    validUserContext.apiSendPwdResetHandler(
        emailInputRef.current.value
    );
  };

  return (
    <form onSubmit={submitHandler} className={classes.form}>
    <div className={classes.loginInstructions}>Please enter your email address to reset your passsword</div>
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
        ></input>
      </div>
      <button
        className={classes.loginBtn}
        disabled={validUserContext.isLoggedIn}
      >
        {validUserContext.isLoggedIn ? "Already logged in" : "Send Email"}
      </button>
    </form>
  );
}

export default SendEmailForm;
