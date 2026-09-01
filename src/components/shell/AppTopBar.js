import classes from "../Landing.module.scss";
import menuIcon from "../../assets/fa-menu.svg";
import { planWindowLabel } from "../../portalConfig";

const AppTopBar = ({
  showMenuButton,
  menuOpen,
  onMenuClick,
  logoUrl,
  onLogoError,
  displayName,
  tagline,
  onBackToPortal,
  onExport,
  onLogout,
}) => (
  <header className={classes.appTopBar}>
    <div className={classes.appTopBarLeft}>
      {showMenuButton && (
        <button
          type="button"
          className={classes.menuButton}
          onClick={onMenuClick}
          aria-label={menuOpen ? "Close navigation menu" : "Open navigation menu"}
          aria-expanded={menuOpen}
        >
          <img className={classes.menuicon} src={menuIcon} alt="" aria-hidden="true" />
        </button>
      )}
      <img
        className={classes.appTopBarLogo}
        src={logoUrl}
        alt={displayName}
        onError={onLogoError}
      />
      <div className={classes.appTopBarText}>
        <div className={classes.appTopBarTitle}>
          {displayName}
          {tagline && (
            <>
              <span className={classes.appTopBarSep} aria-hidden="true">
                |
              </span>
              <span className={classes.appTopBarTag}>{tagline}</span>
            </>
          )}
        </div>
        <div className={classes.appTopBarSub}>{planWindowLabel()}</div>
      </div>
    </div>
    <div className={classes.appTopBarActions}>
      <button type="button" className={classes.appTopBarBtn} onClick={onBackToPortal}>
        &#8592; Portal
      </button>
      <button
        type="button"
        className={classes.appTopBarBtnPrimary}
        onClick={onExport}
      >
        Export Capital Plan
      </button>
      <button type="button" className={classes.appTopBarBtn} onClick={onLogout}>
        Log out
      </button>
    </div>
  </header>
);

export default AppTopBar;
