import Layout from "./components/Layout";
import { useEffect, useRef, useContext, useState } from "react";
import classes from "./App.module.scss";
import LoginForm from "./components/LoginForm";
import ResetForm from "./components/ResetForm";
import NewUserForm from "./components/NewUserForm";

import ErrorPage from "./components/ErrorPage";

import SendEmailForm from "./components/SendEmailForm";
import UnsubscribeForm from "./components/UnsubscribeForm";

import LoginHead from "./components/LoginHead";
import Landing from "./components/Landing";
import ValidUserContext from "./authCheck";
import { useThirdPartyCookieCheck } from './useThirdPartyCookieCheck';
import { IdleTimerProvider, useIdleTimer, useIdleTimerContext } from 'react-idle-timer';

function App() {
  //const idleTimer = useIdleTimerContext()
  const validUserContext = useContext(ValidUserContext);
  const cookiesEnabled = true;
  const [isIdle, setIsIdle] = useState(false);
  const [idleCount, setIdleCount] = useState(0);

  const elementRef = useRef();


  const onPresenceChange = (presence) => {
    // Handle state changes in one function
    if (validUserContext.isLoggedIn && presence.type == 'idle') {
      idleTimer.reset()
      var newIdleCount = idleCount + 1;
      setIdleCount(newIdleCount)
    }
    console.log("Idle type: "+presence.type)
  }

  const onActive = () => {
    console.log("Active handler: "+ Date.now())
    validUserContext.localAuthCheck(true)
  }

  const idleTimer = useIdleTimer({ onPresenceChange,  timeout: 5*60 * 1000})
  const idleTimerNoReset = useIdleTimer({ onActive,  timeout: 5*60 * 1000})

  const handleOnIdle = () => {
    setIsIdle(true);
    validUserContext.localAuthCheck(true)
    elementRef.current.idleTimer.activate()
    // You can also log the user out or perform other actions here
  };

  const handleOnActive = () => {
    setIsIdle(false);
  };

  const handleOnAction = () => {
    setIsIdle(false);
  };

  if (validUserContext.isLoggedIn) {
    return (
      <div className={classes.container}>
        {/* Always render the Landing component */}
        <Landing idleCountParam={idleCount} />

        {/* Display the curtain if the user is logging in */}
        {validUserContext.isLoggingIn && (
          <div className={classes.spinnerOverlay}>
            <div className={classes.spinner}></div>
          </div>
        )}
      </div>
    );
  }

  var form
  if (!cookiesEnabled){
    form = <ErrorPage />
  }
  else if(validUserContext.pwdResetTokenValue) {
    form = <ResetForm />
  } else if (validUserContext.newUserTokenValue) {
    form = <NewUserForm />
  } else if (validUserContext.isForgotPwd) {
    form = <SendEmailForm />
  } else if (validUserContext.unSubscribeUserValue) {
    form = <UnsubscribeForm />
  } else {
    form = <LoginForm />
  }

  return (
    <Layout>
      {validUserContext.isLoggingIn? 
        ( <div className={classes.spinnerContainer}>
            <div className={classes.spinner}></div>
          </div>
        ):(
          <div></div>
        )
      }
      <LoginHead />
      {form}
    </Layout>
  );
}

export default App;
