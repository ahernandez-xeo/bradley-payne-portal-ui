import React from "react";
import "./ProfileCard.scss"; // Create this CSS file to hold the styles
import signoutIcon from "../assets/fa-logout.svg";
import userIcon from "../assets/fa-user.svg";
import {useContext, useState} from "react";
import ValidUserContext from "../authCheck";







const ProfileCard = () => {

    const validUserContext = useContext(ValidUserContext);
    const [defaultUser, setDefaultUser] = useState(JSON.parse(localStorage.getItem("user-name")) ?? "");
    const [defaultRole, setDefaultRole] = useState(JSON.parse(localStorage.getItem("role")) ?? "");

    const handleLogoutClick = () => {
        validUserContext.logoutUser()
    }

    const name = defaultUser.split("@")[0] // Get part before @
        .split(".") // Split by .
        .map(word => word.charAt(0).toUpperCase() + word.slice(1)) // Capitalize each part
        .join(" "); // Join with space

    return (
        <div className="profile-card">
        {/* Profile Image */}
        <div className="profile-image">
            <img className="user-icon" src={userIcon}/>
        </div>

        {/* Profile Info */}
        <div className="profile-info">
            <p className="name">{name }</p>
            <p className="title">{defaultRole.includes("Administrator") ? "Administrator" : defaultRole} </p>
        </div>

        {/* Icons */}
        <div className="profile-icons">
            <img className="logout-icon" src={signoutIcon} onClick={() => handleLogoutClick()}/>
        </div>
        </div>
    );
};

export default ProfileCard;
