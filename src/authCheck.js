import { createContext, useState } from "react";
import Modal from 'react-modal';
import classes from "./App.module.scss";
import alertIcon from "./assets/akar-icons_alert.svg";
import correctIcon from "./assets/akar-icons_correct.svg";
import { useThirdPartyCookieCheck } from './useThirdPartyCookieCheck';
import { BACKEND_BASE_URL} from "./constants"


const ValidUserContext = createContext({
  isLoggedIn: false,
  isLoggingIn: false,
  isForgotPwd: false,
  isNewUser: false,
  pwdResetToken: "",
  apiAuthCheck: (enteredEmail, enteredPassword, reuseJwt) => {},
  localAuthCheck: (needRefresh) => {},
  forgotPassword: () => {},
  reset: () => {}
});

export const ValidUserContextProvider = (props) => {
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isForgotPwd, setIsForgotPwd] = useState(false);
  const [pwdResetTokenValue, setPwdResetTokenValue] = useState("");
  const [newUserTokenValue, setNewUserTokenValue] = useState("");
  const [unSubscribeUserValue, setUnSubscribeUserValue] = useState("");

  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalText, setModalText] = useState('Error');
  const [modalIcon, setModalIcon] = useState(alertIcon);
  const status = useThirdPartyCookieCheck()


  function openModal(text, isError, autoDismiss) {
    if (isError) {
      setModalIcon(alertIcon);
    } else {
      setModalIcon(correctIcon);
    }
    setModalText(text)
    setIsOpen(true);
    if(autoDismiss) {
      setTimeout(() => {
        closeModal()
      }, "4000");
    }
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
  }

  function closeModal() {
    setIsOpen(false);
    setIsForgotPwd(false);
    window.location.href = "/";
  }

  function removeLoginData() {
    if (JSON.parse(localStorage.getItem("remember-me")) ? true : false) {
      localStorage.removeItem("login-data");      
    } else {
      sessionStorage.removeItem("login-data");  
    }
  }

  function setLoginData(jwt) {
    if (JSON.parse(localStorage.getItem("remember-me")) ? true : false) {
      localStorage.setItem("login-data", jwt);  
    } else {
      sessionStorage.setItem("login-data", jwt); 
    }
  }

  function getLoginData() {
    if (JSON.parse(localStorage.getItem("remember-me")) ? true : false) {
      return JSON.parse(localStorage.getItem("login-data"))
    } else {
      return JSON.parse(sessionStorage.getItem("login-data"))
    }
  }

  const customStyles = {
    overlay: {
        backgroundColor: 'rgba(255, 255, 255, 0.20)'
    },
    content: {
      top: '50%',
      left: '50%',
      right: 'auto',
      bottom: 'auto',
      marginRight: '-50%',
      backgroundColor: 'white',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center'
    },
  };


  var queryParameters = new URLSearchParams(window.location.search)
  var resetToken = queryParameters.get("reset")
  var newUserToken = queryParameters.get("newuser")
  var unSubscribeUser = queryParameters.get("unsubscribe")

  if (resetToken != null && resetToken != pwdResetTokenValue) {
    setPwdResetTokenValue(resetToken);
    setIsLoggedIn(false);
    console.log("Set logged out")
    removeLoginData();
    localStorage.removeItem("dashboard-url");
    localStorage.removeItem("tableau-login-data");
  }

  if (newUserToken != null && newUserToken != newUserTokenValue) {
    setNewUserTokenValue(newUserToken);
    setIsLoggedIn(false);
    console.log("Set logged out")
    removeLoginData();
    localStorage.removeItem("dashboard-url");
    localStorage.removeItem("tableau-login-data");
  }

  if (unSubscribeUser != null && unSubscribeUser != unSubscribeUserValue) {
    setUnSubscribeUserValue(unSubscribeUser);
    setIsLoggedIn(false);
    console.log("Set logged out")
    removeLoginData();
    localStorage.removeItem("dashboard-url");
    localStorage.removeItem("tableau-login-data");
  }

  async function sendPwdResetHandler(username) {
    const url = BACKEND_BASE_URL+"/send_reset_email";
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    var raw = JSON.stringify(
        {
          "useremail":username
        });

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };
    setIsLoggingIn(true)
    await fetch(url, requestOptions)
      .then((response) => {
        if (response.ok) {
          openModal("Look for an email from Bradley Payne to reset your password. If you don’t hear from us momentarily, please check your spam folder. \n Thank you!", false, true);
          setIsLoggingIn(false)
        } else {
          setIsLoggingIn(false)
          openModal('Reset Email Failed', true, false);
        }
      })
      .catch((e) => {
        setIsLoggingIn(false)
        openModal('Reset Email Failed', true, false);
      });
  }

  async function apiPwdResetHandler(enteredPassword, displayName) {
    const url = BACKEND_BASE_URL+"/reset";
    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");

    
    var base64Url = (newUserTokenValue || pwdResetTokenValue).split('.')[1];
    var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
    var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
        return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
    }).join(''));

    var jwt_values= JSON.parse(jsonPayload);

    var raw = JSON.stringify(
        {
          "username":jwt_values.username,
          "displayname": displayName,
          "password":enteredPassword,
          "token": newUserTokenValue || pwdResetTokenValue
        });

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };
    setIsLoggingIn(true)
    await fetch(url, requestOptions)
      .then((response) => {
        if (response.ok) {
          openModal('Password Updated', false, true);
          setIsForgotPwd(false);
          setIsLoggingIn(false);
        } else {
          openModal('Update Password Failed, please request again a new password reset email', true, false);
          setIsForgotPwd(false);
          setIsLoggingIn(false)
        }
      })
      .catch((e) => {
        openModal('Update Password Failed, please request again a new password reset email', true, false);
        setIsForgotPwd(false);
        setIsLoggingIn(false)
      });
  }

  async function apiAuthCheckHandler(enteredEmail, enteredPassword, reuseJwt) {
    var url =BACKEND_BASE_URL+"/login";
    if (reuseJwt) {
      url =BACKEND_BASE_URL+"/login_refresh";
    }


    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    if (reuseJwt) {
      myHeaders.append("Auth-Token", getLoginData());
    }
    var raw = JSON.stringify({"useremail":enteredEmail,"password":enteredPassword, "rememberme":true});
    localStorage.setItem("login-name", enteredEmail);

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    setIsLoggingIn(true)
    await fetch(url, requestOptions)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        const validUsers = [];
        if (data.app_jwt !== undefined) {
          setLoginData(JSON.stringify(data.app_jwt));
          localStorage.setItem("tableau-login-data", JSON.stringify(data.tableau_jwt));
          localStorage.setItem("dashboard-url", JSON.stringify(data.dashboard_url));
          localStorage.setItem("navigation", JSON.stringify(data.navigation));
          localStorage.setItem("group", JSON.stringify(data.group));
          localStorage.setItem("user-name", JSON.stringify(data.full_user_name));
          localStorage.setItem("company", JSON.stringify(data.company));
          localStorage.setItem("client", JSON.stringify(data.client));
          localStorage.setItem("company_logo", JSON.stringify(data.company_logo));
          localStorage.setItem("client_logo", JSON.stringify(data.client_logo));
          localStorage.setItem("ms_download_url", JSON.stringify(data.ms_download_url));
          localStorage.setItem("client_list", JSON.stringify(data.client_list));
          localStorage.setItem("district_id", JSON.stringify(data.district_id || ""));
          localStorage.setItem("district_name", JSON.stringify(data.district_name || ""));
          localStorage.setItem("logo_url", JSON.stringify(data.logo_url || ""));
          localStorage.setItem("custom_color", JSON.stringify(data.custom_color || "#e6b422"));
          localStorage.setItem("role", JSON.stringify(data.role));
          setIsLoggedIn(data.app_jwt);
        } else {
          openModal(data.error, true, false);
        }
        setIsLoggingIn(false)
      })
      .catch((e) => {
        setIsLoggingIn(false)
        removeLoginData();
        localStorage.removeItem("dashboard-url");
        localStorage.removeItem("tableau-login-data");
        openModal('System error, please contact support@bradleypayne.com if the issue persists', true, false);
      });
  }


  async function apiAuthTimeoutHandler(enteredEmail, enteredPassword, reuseJwt) {
    var url =BACKEND_BASE_URL+"/login";
    if (reuseJwt) {
      url =BACKEND_BASE_URL+"/login_refresh";
    }

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    if (reuseJwt) {
      myHeaders.append("Auth-Token", getLoginData());
    }
    var raw = JSON.stringify({"useremail":enteredEmail,"password":enteredPassword, "rememberme":true});
    localStorage.setItem("login-name", enteredEmail);

    var requestOptions = {
      method: 'POST',
      headers: myHeaders,
      body: raw,
      redirect: 'follow'
    };

    await fetch(url, requestOptions)
      .then((response) => {
        return response.json();
      })
      .then((data) => {
        const validUsers = [];
        if (data.app_jwt !== undefined) {
          setLoginData(JSON.stringify(data.app_jwt));
          //localStorage.setItem("tableau-login-data", JSON.stringify(data.tableau_jwt));
          localStorage.setItem("dashboard-url", JSON.stringify(data.dashboard_url));
          localStorage.setItem("navigation", JSON.stringify(data.navigation));
          localStorage.setItem("group", JSON.stringify(data.group));
          localStorage.setItem("user-name", JSON.stringify(data.full_user_name));
          localStorage.setItem("company", JSON.stringify(data.company));
          localStorage.setItem("client", JSON.stringify(data.client));
          localStorage.setItem("company_logo", JSON.stringify(data.company_logo));
          localStorage.setItem("client_logo", JSON.stringify(data.client_logo));
          localStorage.setItem("ms_download_url", JSON.stringify(data.ms_download_url));
          localStorage.setItem("client_list", JSON.stringify(data.client_list));
          localStorage.setItem("district_id", JSON.stringify(data.district_id || ""));
          localStorage.setItem("district_name", JSON.stringify(data.district_name || ""));
          localStorage.setItem("logo_url", JSON.stringify(data.logo_url || ""));
          localStorage.setItem("custom_color", JSON.stringify(data.custom_color || "#e6b422"));
          localStorage.setItem("role", JSON.stringify(data.role));

        } 
      })
      .catch((e) => {
        setIsLoggingIn(false)
        removeLoginData();
        localStorage.removeItem("dashboard-url");
        localStorage.removeItem("tableau-login-data");
      });
  }

  const localAuthCheckHandler = (needRefresh) => {
    const localData = getLoginData();
    if (localData !== null) {
      var base64Url = localData.split('.')[1];
      var base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      var jsonPayload = decodeURIComponent(window.atob(base64).split('').map(function(c) {
          return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
      }).join(''));
      var jwt_values= JSON.parse(jsonPayload);
      if (Date.now() >= jwt_values.exp * 1000) {
        removeLoginData();
        localStorage.removeItem("dashboard-url");
        localStorage.removeItem("tableau-login-data");
        setIsLoggedIn(false);
        console.log("Set logged out expired")
        return false;
      } else {
        if (needRefresh) {
          if (Date.now() >= jwt_values.shrt_exp * 1000) {
            console.log("Refresh tokens after short expiration")
            apiAuthCheckHandler(jwt_values.useremail, "", true)
          } else {
            console.log("Refresh tokens after inteval")
            //apiAuthTimeoutHandler(jwt_values.useremail, "", true)
            setIsLoggedIn(true);
          }
          return
        }
      }
    } else {
      setIsLoggedIn(false);
      console.log("Set logged out no local data")
    }
  };

  const thirdPartyCookiesErrorHandler = () => {
    openModal('Third party cookies are not enabled in the browser', true, false);
  };

  const logoutUserHandler = () => {
    removeLoginData();
    localStorage.removeItem("dashboard-url");
    localStorage.removeItem("tableau-login-data");
    localStorage.removeItem("navigation");
    localStorage.removeItem("group");
    localStorage.removeItem("user-name");
    localStorage.removeItem("company");
    localStorage.removeItem("client");
    localStorage.removeItem("ms_download_url");
    localStorage.removeItem("role");


    setIsLoggedIn(false);
    console.log("Set logged out regular")
  };

  const forgotPasswordHandler = () => {
    setIsForgotPwd(true)
  };

  const resetHandler = () => {
    setIsForgotPwd(false);
    setPwdResetTokenValue(null)
    setNewUserTokenValue(null)
  };


  const context = {
    isLoggedIn: isLoggedIn,
    isLoggingIn: isLoggingIn,
    isForgotPwd: isForgotPwd,
    pwdResetTokenValue: pwdResetTokenValue,
    newUserTokenValue: newUserTokenValue,
    unSubscribeUserValue: unSubscribeUserValue,
    apiAuthCheck: apiAuthCheckHandler,
    localAuthCheck: localAuthCheckHandler,
    logoutUser: logoutUserHandler,
    apiPwdReset: apiPwdResetHandler,
    apiSendPwdResetHandler: sendPwdResetHandler,
    forgotPassword: forgotPasswordHandler,
    thirdPartyCookiesError: thirdPartyCookiesErrorHandler,
    reset: resetHandler
  };

  return (
    <ValidUserContext.Provider value={context}>
      {props.children}
      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Example Modal"
      >
        <img
          className={classes.alerticon}
          src={modalIcon}
          alt="Password icon"
          htmlFor="user-password"
        ></img>
        <div className={classes.modaltext}>{modalText}</div>
      </Modal>
    </ValidUserContext.Provider>
  );
};

export default ValidUserContext;
