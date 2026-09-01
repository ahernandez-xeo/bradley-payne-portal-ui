import { createContext, useEffect, useRef, useState } from "react";
import Modal from 'react-modal';
import { useLocation, useNavigate } from "react-router-dom";
import classes from "./App.module.scss";
import alertIcon from "./assets/akar-icons_alert.svg";
import correctIcon from "./assets/akar-icons_correct.svg";
import { BACKEND_BASE_URL} from "./constants"
import { DEFAULT_BRAND_COLOR } from "./portalConfig"

/**
 * One-shot entry points. The backend emails link to the site root with a
 * `?reset=`/`?newuser=`/`?unsubscribe=` query param, so those names have to
 * keep working; the matching paths are supported as well so the flows have
 * real URLs.
 */
const TOKEN_FLOWS = [
  { key: "reset", param: "reset", path: "/reset" },
  { key: "newUser", param: "newuser", path: "/new-user" },
  { key: "unsubscribe", param: "unsubscribe", path: "/unsubscribe" },
];

/** Reads any token present in the current location, in either link style. */
const readTokensFromUrl = (pathname, search) => {
  const params = new URLSearchParams(search);
  const genericToken = params.get("token");
  const tokens = {};
  TOKEN_FLOWS.forEach(({ key, param, path }) => {
    tokens[key] =
      params.get(param) || (pathname === path ? genericToken : null) || "";
  });
  return tokens;
};

const ValidUserContext = createContext({
  isLoggedIn: false,
  isLoggingIn: false,
  isNewUser: false,
  pwdResetToken: "",
  apiAuthCheck: (enteredEmail, enteredPassword, reuseJwt, rememberMe) => {},
  localAuthCheck: (needRefresh) => {},
  getSessionExpiry: () => null,
  extendSession: async () => false,
  reset: () => {}
});

export const ValidUserContextProvider = (props) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Read synchronously on first render so a token link renders its form
  // immediately instead of flashing the sign-in screen for a frame.
  const initialTokens = readTokensFromUrl(
    window.location.pathname,
    window.location.search
  );

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [pwdResetTokenValue, setPwdResetTokenValue] = useState(initialTokens.reset);
  const [newUserTokenValue, setNewUserTokenValue] = useState(initialTokens.newUser);
  const [unSubscribeUserValue, setUnSubscribeUserValue] = useState(
    initialTokens.unsubscribe
  );

  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalText, setModalText] = useState('Error');
  const [modalIcon, setModalIcon] = useState(alertIcon);
  // When set, dismissing the modal finishes a one-shot token flow and hands the
  // user back to sign-in. Previously every modal close did a hard navigation to
  // "/", which also threw away the token query param on failures.
  const returnToLoginRef = useRef(false);


  function openModal(text, isError, autoDismiss, { returnToLogin = false } = {}) {
    if (isError) {
      setModalIcon(alertIcon);
    } else {
      setModalIcon(correctIcon);
    }
    returnToLoginRef.current = returnToLogin;
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
    if (returnToLoginRef.current) {
      returnToLoginRef.current = false;
      setPwdResetTokenValue("");
      setNewUserTokenValue("");
      setUnSubscribeUserValue("");
      navigate("/login", { replace: true });
    }
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


  // Arriving on a token link ends whatever session was in place: these are
  // one-shot flows and the account they target may not be the signed-in one.
  // This is an effect rather than render-body work, which used to call setState
  // during render on every pass.
  useEffect(() => {
    const tokens = readTokensFromUrl(location.pathname, location.search);
    if (!tokens.reset && !tokens.newUser && !tokens.unsubscribe) {
      return;
    }

    removeLoginData();
    localStorage.removeItem("dashboard-url");
    localStorage.removeItem("tableau-login-data");
    setIsLoggedIn(false);

    if (tokens.reset) {
      setPwdResetTokenValue(tokens.reset);
    }
    if (tokens.newUser) {
      setNewUserTokenValue(tokens.newUser);
    }
    if (tokens.unsubscribe) {
      setUnSubscribeUserValue(tokens.unsubscribe);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [location.pathname, location.search]);

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
          openModal("Look for an email from Bradley Payne to reset your password. If you don’t hear from us momentarily, please check your spam folder. \n Thank you!", false, true, { returnToLogin: true });
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
          // Only the success path clears the token — on failure the user stays
          // on the form with their link intact so they can try again.
          openModal('Password Updated', false, true, { returnToLogin: true });
          setIsLoggingIn(false);
        } else {
          openModal('Update Password Failed, please request again a new password reset email', true, false);
          setIsLoggingIn(false)
        }
      })
      .catch((e) => {
        openModal('Update Password Failed, please request again a new password reset email', true, false);
        setIsLoggingIn(false)
      });
  }

  async function apiAuthCheckHandler(enteredEmail, enteredPassword, reuseJwt, rememberMe) {
    var url =BACKEND_BASE_URL+"/login";
    if (reuseJwt) {
      url =BACKEND_BASE_URL+"/login_refresh";
    }

    // Silent refreshes pass no preference, so keep whatever the user chose at
    // sign-in. This has to be written before setLoginData, which uses it to
    // pick localStorage vs sessionStorage.
    const rememberMeValue =
      rememberMe === undefined
        ? JSON.parse(localStorage.getItem("remember-me")) ? true : false
        : !!rememberMe;
    if (rememberMe !== undefined) {
      // Clear the old bucket first, or a session downgrade leaves a stale JWT
      // behind in localStorage.
      removeLoginData();
      localStorage.setItem("remember-me", JSON.stringify(rememberMeValue));
    }

    var myHeaders = new Headers();
    myHeaders.append("Content-Type", "application/json");
    if (reuseJwt) {
      myHeaders.append("Auth-Token", getLoginData());
    }
    var raw = JSON.stringify({"useremail":enteredEmail,"password":enteredPassword, "rememberme":rememberMeValue});
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
          localStorage.setItem("custom_color", JSON.stringify(data.custom_color || DEFAULT_BRAND_COLOR));
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
        return false;
      } else {
        if (needRefresh) {
          if (Date.now() >= jwt_values.shrt_exp * 1000) {
            apiAuthCheckHandler(jwt_values.useremail, "", true)
          } else {
            setIsLoggedIn(true);
          }
          return
        }
      }
    } else {
      setIsLoggedIn(false);
    }
  };

  /** Decoded app JWT, or null when there is no usable session. */
  const readSessionClaims = () => {
    const localData = getLoginData();
    if (!localData) {
      return null;
    }
    try {
      const base64 = localData.split('.')[1].replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        window.atob(base64)
          .split('')
          .map((c) => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
          .join('')
      );
      return JSON.parse(jsonPayload);
    } catch (error) {
      return null;
    }
  };

  /** Absolute session expiry in epoch ms, or null when unknown. */
  const getSessionExpiryHandler = () => {
    const claims = readSessionClaims();
    return claims?.exp ? claims.exp * 1000 : null;
  };

  /** Extend the session in place, used by the expiry warning countdown. */
  const extendSessionHandler = async () => {
    const claims = readSessionClaims();
    const email = claims?.useremail || localStorage.getItem("login-name");
    if (!email) {
      return false;
    }
    await apiAuthCheckHandler(email, "", true);
    return true;
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
  };

  const resetHandler = () => {
    setPwdResetTokenValue("")
    setNewUserTokenValue("")
  };


  const context = {
    isLoggedIn: isLoggedIn,
    isLoggingIn: isLoggingIn,
    pwdResetTokenValue: pwdResetTokenValue,
    newUserTokenValue: newUserTokenValue,
    unSubscribeUserValue: unSubscribeUserValue,
    apiAuthCheck: apiAuthCheckHandler,
    localAuthCheck: localAuthCheckHandler,
    logoutUser: logoutUserHandler,
    getSessionExpiry: getSessionExpiryHandler,
    extendSession: extendSessionHandler,
    apiPwdReset: apiPwdResetHandler,
    apiSendPwdResetHandler: sendPwdResetHandler,
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
