import Layout from "./components/Layout";
import { useContext, useState } from "react";
import { Route, Routes } from "react-router-dom";
import classes from "./App.module.scss";
import oarLogo from "./assets/oar-logo-transparent-replit.png";
import LoginForm from "./components/LoginForm";
import ResetForm from "./components/ResetForm";
import NewUserForm from "./components/NewUserForm";

import ErrorPage from "./components/ErrorPage";

import SendEmailForm from "./components/SendEmailForm";
import UnsubscribeForm from "./components/UnsubscribeForm";

import LoginHead from "./components/LoginHead";
import Landing from "./components/Landing";
import SessionExpiryWarning from "./components/SessionExpiryWarning";
import ValidUserContext from "./authCheck";
import { useIdleTimer } from 'react-idle-timer';

function App() {
  const validUserContext = useContext(ValidUserContext);
  const cookiesEnabled = true;
  const [idleCount, setIdleCount] = useState(0);

  const onPresenceChange = (presence) => {
    if (validUserContext.isLoggedIn && presence.type === 'idle') {
      idleTimer.reset()
      setIdleCount((count) => count + 1)
    }
  }

  const onActive = () => {
    validUserContext.localAuthCheck(true)
  }

  const idleTimer = useIdleTimer({ onPresenceChange, timeout: 5 * 60 * 1000 })
  useIdleTimer({ onActive, timeout: 5 * 60 * 1000 })

  if (validUserContext.isLoggedIn) {
    return (
      <div className={classes.container}>
        <Landing idleCountParam={idleCount} />
        <SessionExpiryWarning />

        {validUserContext.isLoggingIn && (
          <div className={classes.spinnerOverlay}>
            <div className={classes.spinner}></div>
          </div>
        )}
      </div>
    );
  }

  if (!cookiesEnabled) {
    return <AuthShell isLoggingIn={validUserContext.isLoggingIn}><ErrorPage /></AuthShell>;
  }

  // Token-bearing links win over everything else — they are one-shot entry
  // points and the token lives in the query string.
  let tokenForm = null;
  if (validUserContext.pwdResetTokenValue) {
    tokenForm = <ResetForm />;
  } else if (validUserContext.newUserTokenValue) {
    tokenForm = <NewUserForm />;
  } else if (validUserContext.unSubscribeUserValue) {
    tokenForm = <UnsubscribeForm />;
  }

  if (tokenForm) {
    return (
      <AuthShell isLoggingIn={validUserContext.isLoggingIn}>{tokenForm}</AuthShell>
    );
  }

  return (
    <AuthShell isLoggingIn={validUserContext.isLoggingIn}>
      <Routes>
        <Route path="/forgot-password" element={<SendEmailForm />} />
        <Route path="/login" element={<LoginForm />} />
        {/* Any other deep link falls back to sign-in; Landing restores the
            intended view once the session is established. */}
        <Route path="*" element={<LoginForm />} />
      </Routes>
    </AuthShell>
  );
}

/** Shared chrome for every unauthenticated screen. */
const AuthShell = ({ isLoggingIn, children }) => (
  <Layout>
    {isLoggingIn && (
      <div className={classes.spinnerContainer}>
        <div className={classes.spinner}></div>
      </div>
    )}
    <LoginHead />
    {children}
    <div className={classes.poweredBy}>Powered by</div>
    <img className={classes.loginFooterLogo} src={oarLogo} alt="OAR — Forward Together" />
  </Layout>
);

export default App;
