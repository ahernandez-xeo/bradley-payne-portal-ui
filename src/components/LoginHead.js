import classes from "./LoginHead.module.scss";
import transparent_logo from "../assets/BP-Oar-Logo-RGB.png"
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
      <a href="/"><img className={classes.loginLogo} src={transparent_logo} onClick={() => handleReset()} alt="Bradley Payne Advisors" /></a>
      <div className={classes.tagline}>Client Portal</div>
      {actionText ? <div className={classes.loginTitle}>{actionText}</div> : null}
    </div>
  );
}

export default LoginHead;
