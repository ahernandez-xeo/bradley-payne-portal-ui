import classes from "./LoginHead.module.scss";
import bpLogo from "../assets/BP-Oar-Logo-Replit.png";
import irgLogo from "../assets/incentive-review-group-logo-replit.png";
import { useContext } from "react";
import ValidUserContext from "../authCheck";

function LoginHead() {
  const validUserContext = useContext(ValidUserContext);

  const handleReset = () => {
    validUserContext.reset();
  };

  return (
    <div className={classes.loginHeadWrapper}>
      <a href="/" onClick={handleReset} className={classes.logoRow}>
        <img className={classes.loginLogo} src={bpLogo} alt="Bradley Payne" />
        <span className={classes.logoDivider} aria-hidden="true" />
        <img
          className={classes.loginLogoIrg}
          src={irgLogo}
          alt="Incentive Review Group"
        />
      </a>
    </div>
  );
}

export default LoginHead;
