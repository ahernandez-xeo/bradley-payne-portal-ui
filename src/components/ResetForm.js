import { useState, useRef, useEffect, useContext } from "react";

import classes from "./LoginForm.module.scss";
import usernameIcon from "../assets/fa-user.svg";
import passwordIcon from "../assets/carbon_password.svg";
import alertIcon from "../assets/akar-icons_alert.svg";

import ValidUserContext from "../authCheck";
import Modal from 'react-modal';

let isInitial = true;

function ResetForm() {
  const validUserContext = useContext(ValidUserContext);

  const emailInputRef = useRef();
  const passwordInputRef = useRef();
  const passwordConfirmInputRef = useRef();

  const [modalIsOpen, setIsOpen] = useState(false);
  const [modalText, setModalText] = useState('Error');

  function openModal(text) {
    setModalText(text)
    setIsOpen(true);
  }

  function afterOpenModal() {
    // references are now sync'd and can be accessed.
  }

  function closeModal() {
    setIsOpen(false);
  }

  useEffect(() => {
    if (isInitial) {
      validUserContext.localAuthCheck(true);
      isInitial = false;
    }
  }, [validUserContext]);

  const validatePassword = (password) => {
    // Regular expression pattern to validate the password
    const passwordPattern = /^(?=.*[A-Z])(?=.*[a-z])(?=.*\d)(?=.*[+=-_()#@$!%*?&])[A-Za-z\d+=-_#()@$!%*?&]{8,}$/;
  
    // Test the password against the pattern
    return passwordPattern.test(password);
  };

  const submitHandler = (event) => {
    event.preventDefault();
    if (passwordInputRef.current.value != passwordConfirmInputRef.current.value) {
        openModal('Passwords do not match');
    } else if (!validatePassword(passwordInputRef.current.value)) {
        openModal('Password needs to be at least 8 characters with one uppercase, one lowercase, one digit and one special character');
    } else{
        validUserContext.apiPwdReset(
            passwordInputRef.current.value,
            ""
        );
    }
  };

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
      backgroundColor: 'black',
      transform: 'translate(-50%, -50%)',
      textAlign: 'center'
    },
  };

  return (
    <form onSubmit={submitHandler} className={classes.form}>
      <div className={classes.loginInstructions}>Please enter and confirm your Password</div>
      <div>
        <input
          className={classes.input}
          type="password"
          id="user-password"
          name="user-password"
          autoComplete="off"
          placeholder="New Password"
          ref={passwordInputRef}
          required={!validUserContext.isLoggedIn}
        ></input>
      </div>

      <div>
        <input
          className={classes.input}
          type="password"
          id="user-password-confirm"
          name="user-password-confirm"
          autoComplete="off"
          placeholder="Confirm Password"
          ref={passwordConfirmInputRef}
          required={!validUserContext.isLoggedIn}
        ></input>
      </div>

      <button
        className={classes.loginBtn}
        disabled={validUserContext.isLoggedIn}
      >
        {validUserContext.isLoggedIn ? "Already logged in" : "Set New Password"}
      </button>
      <Modal
        isOpen={modalIsOpen}
        onAfterOpen={afterOpenModal}
        onRequestClose={closeModal}
        style={customStyles}
        contentLabel="Example Modal"
      >
        <img
          className={classes.alerticon}
          src={alertIcon}
          alt="Password icon"
          htmlFor="user-password"
        ></img>
        <div>{modalText}</div>
      </Modal>
    </form>
  );
}

export default ResetForm;
