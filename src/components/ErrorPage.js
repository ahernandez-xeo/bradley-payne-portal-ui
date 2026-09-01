import classes from "./ErrorPage.module.scss";
import alertIcon from "../assets/akar-icons_alert.svg";

function ErrorPage() {
  return (
    <div className={classes.logincontainer}>
      <div className={classes.errortext}>
        <img className={classes.alerticon} src={alertIcon} alt="" aria-hidden="true" />
        <p className={classes.errorinfo}>
          Third party cookies are disabled in this browser, please make sure these are
          enabled by going into the browser preferences or try with a different browser
        </p>
      </div>
    </div>
  );
}

export default ErrorPage;
