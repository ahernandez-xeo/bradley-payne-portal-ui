import { useRef, useEffect, useContext } from "react";

import classes from "./LoginForm.module.scss";
import ValidUserContext from "../authCheck";
import usernameIcon from "../assets/fa-user.svg";
import { deleteSubscriptionWT } from './ApiService';


let isInitial = true;

function UnsubscribeForm() {
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

  const submitHandler = () => {
    const deleteSub = async () => {
      try {
        const data = 
        {
          "token": validUserContext.unSubscribeUserValue
        }
        const result = await deleteSubscriptionWT(data);
        console.log("Subscription deleted:", result);


      } catch (error) {
        console.error('Caught an error:', error);
      } finally {
        
      }
    };
    deleteSub();
  }

  return (
    <form onSubmit={submitHandler} className={classes.form}>
    <div className={classes.loginInstructions}>Unsubscribe Daily Snapshot </div>
      <button
        className={classes.loginBtn}
        disabled={validUserContext.isLoggedIn}
      >
        Confirm
      </button>
    </form>
  );
}

export default UnsubscribeForm;
