import classes from "./LoginHead.module.scss";
import bpLogo from "../assets/BradleyPayne-logo.png";
import { useContext} from "react";
import ValidUserContext from "../authCheck";

function LoginHead() {
  const validUserContext = useContext(ValidUserContext);

  const handleReset = () => {
    validUserContext.reset()
  }
  var actionText = 'Sign In'
  if(validUserContext.isForgotPwd) {
    actionText = ''
  } else if (validUserContext.pwdResetTokenValue){
    actionText = ''
  } else if (validUserContext.newUserTokenValue){
    actionText = ''
  }

  return (
    <div className={classes.loginHeadWrapper}>
      <a href="/" onClick={handleReset}>
        <img className={classes.loginLogo} src={bpLogo} alt="Bradley Payne Advisors" />
      </a>
      <div className={classes.tagline}>Client Portal</div>
      {actionText ? <div className={classes.loginTitle}>{actionText}</div> : null}
    </div>
  );
}

export default LoginHead;
