import classes from "./LoginHead.module.scss";
import transparent_logo from "../assets/fsg-light.png"
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
    <div> 
      <a href="/"><img className={classes.loginLogo} src={transparent_logo} onClick={() => handleReset()}></img></a>
      <title className={classes.loginTitle}>{actionText}</title>
    </div>
  );
}

export default LoginHead;
