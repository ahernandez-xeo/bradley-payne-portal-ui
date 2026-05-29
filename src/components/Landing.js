import classes from "./Landing.module.scss";
import {useRef, useEffect, useState, useContext, useCallback} from "react";
import ValidUserContext from "../authCheck";
import signoutIcon from "../assets/fa-logout.svg";
import menuIcon from "../assets/fa-menu.svg";
import emailIcon from "../assets/fa-email.svg";

import downloadIcon from "../assets/fa-download.svg";
import refreshIcon from "../assets/fa-refresh.svg";
import { useSwipeable } from 'react-swipeable';
import ProfileCard from './ProfileCard';


import pdfIcon from "../assets/akar-icons_pdf.svg";
import csvIcon from "../assets/akar-icons_csv.svg";
import pwrpIcon from "../assets/akar-icons_pwrp.svg";
import excelIcon from "../assets/akar-icons_excel.svg";

import pngIcon from "../assets/akar-icons_png.svg";
import dividerIcon from "../assets/akar-icons_divider.svg";
import Dashboard from "./Dashboard"; 
import transparent_logo from "../assets/BradleyPayne-logo.png";
import pv_transparent_logo from "../assets/BP-logo-square.png";
import bpLogoWhite from "../assets/BP-Oar-Logo-RGB.png";
import fwd_curves from "../assets/fwdcurves.png";
import CryptoWidget from "./CryptoWidget";
import CoindeskWidget from "./CoindeskWidget";

import WeatherWidget from "./WeatherWidget";

import Navigation from "./Navigation";
import { slide as Menu } from 'react-burger-menu'
import { fetchSubscriptions, createSubscription, deleteSubscription } from './ApiService';


const isMobileDevice = () => {
  return /Mobi|Android/i.test(navigator.userAgent);
};

const Landing = ({idleCountParam}) => {

    const currentNav = Object.entries(JSON.parse(localStorage.getItem("navigation")));


    const filteredNav = currentNav.filter(([a, b]) => {
      return b.name.includes("Curves Export") == false
    });

    const exportNav = currentNav.filter(([a, b]) => {
      return b.name.includes("Curves Export") == true
    });

    const sortedNav = filteredNav.sort((a, b) => {
      if(a[1].name > b[1].name) {
        // If two elements have same number, then the one who has larger rating.average wins
        return 1;
      } else {
        // If two elements have different number, then the one who has larger number wins
        return -1;
      }
    });
    const clientGroupRaw = JSON.parse(localStorage.getItem("client_list"));
    const clientGroup =
      (typeof clientGroupRaw === "string" && clientGroupRaw) ? clientGroupRaw : null;
    const clientList = Array.isArray(clientGroupRaw) ? clientGroupRaw : [];
    const group = JSON.parse(localStorage.getItem("group")) ?? "default";
    const firstGroup = group === "Admin" 
      ? (clientList.length > 0 ? clientList[0] : "default")
      : group;
      
    //const clientFilteredNav = sortedNav.filter(([key, value]) => value.client === firstGroup);
    const clientFilteredNav = sortedNav;


    const flattenNav = (nav) => nav.flatMap(([, entry]) =>
      entry.dashboards.map((dashboard, i) => ({
        label: entry.dashboards.length > 1
          ? `${entry.name} - ${dashboard.split('/').pop()}`
          : entry.name,
        link: dashboard,
        id: entry.dashboard_ids[i],
      }))
    );

    const flatNav = flattenNav(clientFilteredNav);
    var buttons = flatNav.map(n => n.label);
    var links = flatNav.map(n => n.link);
    var dashboardids = flatNav.map(n => n.id);

    const [activeTab, setActiveTab] = useState(0);
    const [menuOpen, setMenuOpen] = useState(isMobileDevice()? false: true);

    const [activeButton, setActiveButton] = useState(0);
    const [activeDashboard, setActiveDashboard] = useState(true);
    const [activeURL, setActiveURL] = useState(links[0]);
    const [activeDashboardId, setActiveDashboardId] = useState(dashboardids[0]);
    const [displayTabs, setDisplayTabs] = useState(false);
    const [displayToolbarButtons, setDisplayToolbarButtons] = useState(true);

    const [defultFolder, setDefaultFolder] = useState('Home');
    const [defultFolderId, setDefaultFolderId] = useState('Home');
    const [defaultEmail, setDefaultEmail] = useState(localStorage.getItem("login-name") ?? "");
    const [defaultUser, setDefaultUser] = useState(JSON.parse(localStorage.getItem("user-name")) ?? "");
    // const [defaultGroup, setDefaultGroup] = useState(JSON.parse(localStorage.getItem("group")) ?? "default");
    const [defaultGroup, setDefaultGroup] = useState(() => {
      if (group === "Admin") {
        
        return clientList.length > 0 ? clientList[0] : "default";
      }
      return group;
    });
    const [defaultCompany, setDefaultCompany] = useState((JSON.parse(localStorage.getItem("company_logo")) || JSON.parse(localStorage.getItem("company")))?? "default");
    const [defaultClient, setDefaultClient] = useState((JSON.parse(localStorage.getItem("client_logo")) || JSON.parse(localStorage.getItem("client"))) ?? "default");
    const [defaultClientList, setDefaultClientList] = useState(JSON.parse(localStorage.getItem("client_list")) ?? "default");

    const [breadCrumbs, setBreadCrumbs] = useState([{"id":buttons[0], "name":buttons[0]}]);
    const [currentButtons, setCurrentButtons] = useState(buttons);
    const [currentLinks, setCurrentLinks] = useState(links);
    const [currentIds, setCurrentIds] = useState(dashboardids);

    const [refreshSpin, setRefreshSpin] = useState(false);
    const [subscriptions, setSubscriptions] = useState({});
    const [subscriptionCheck, setSubscriptionCheck] = useState(false);
    const [updatingSub, setupdatingSub] = useState(false);

    const [idleCount, setIdleCount] = useState(idleCountParam);


    const [hasVerticalScrollbar, setHasVerticalScrollbar] = useState(false);
    
    const containerRef = useRef(null);

    //const [dashboardRef, setDashboardRef] = useState(undefined)
    const dashboardRef = useRef(null)
    const sidebarRef = useRef(null);

    const validUserContext = useContext(ValidUserContext);

    useEffect(() => {
        const checkScrollbars = () => {
            if (containerRef.current) {
                const container = containerRef.current;
                setHasVerticalScrollbar(container.scrollHeight > container.clientHeight);
            }
        };
        // Initial check
        checkScrollbars();
        // Check on window resize
        window.addEventListener('resize', checkScrollbars);
        // Clean up event listener on component unmount
        return () => window.removeEventListener('resize', checkScrollbars);
    }, []);

    useEffect(() => {
      if (idleCountParam != idleCount) {
        setIdleCount(idleCountParam);
        handleBackgroundRefresh()
      }
    }, [idleCountParam]);

    const handleOutsideClick = (event) => {
      if (sidebarRef.current && !sidebarRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    const handlers = useSwipeable({
      onSwipedLeft: () => setMenuOpen(false),
      preventDefaultTouchmoveEvent: true,
      trackMouse: true
    });

    useEffect(() => {
      if (menuOpen) {
        document.addEventListener('mousedown', handleOutsideClick);
      } else {
        document.removeEventListener('mousedown', handleOutsideClick);
      }
    
      // Clean up the event listener on component unmount
      return () => {
        document.removeEventListener('mousedown', handleOutsideClick);
      };
    }, [menuOpen]);

    // useEffect(() => {
    //   const loadData = async () => {
    //     try {
    //       const data = 
    //       {
    //         "useremail": defaultEmail
    //       }
    //       const result = await fetchSubscriptions(data);
    //       if (Object.keys(result).includes(activeDashboardId)) {
    //         setSubscriptionCheck(true);
    //       }

    //       setSubscriptions(result);
    //     } catch (error) {
          
    //     } finally {
          
    //     }
    //   };
  
    //   loadData();
    // }, [activeURL]);
  

    const handleDashboardClick = (link) => {
        setActiveDashboard(true)
        setActiveURL(link)
        setDisplayTabs(false)
        setDisplayToolbarButtons(true)
    }

    const handleFolderClick = (name, id) => {
      setDefaultFolder(name)
      setDefaultFolderId(id)
      breadCrumbs.push({"id":id, "name":name})
      setBreadCrumbs(breadCrumbs)
    }

    const handleLogoutClick = () => {
        validUserContext.logoutUser()
    }
  
    const handleExportPDFClick = () => {
      dashboardRef.current.firstChild.firstChild.childNodes[1].displayDialogAsync("export-pdf");
    }

    const handleExportCSVClick = () => {
      dashboardRef.current.firstChild.firstChild.childNodes[1].displayDialogAsync("export-csv");
    }

    const handleExportPNGClick = () => {
      dashboardRef.current.firstChild.firstChild.childNodes[1].exportImageAsync();
    }

    const handleExportPWRPClick = () => {
      dashboardRef.current.firstChild.firstChild.childNodes[1].displayDialogAsync("export-powerpoint");
    }

    const handleCrossTabClick = () => {
      dashboardRef.current.firstChild.firstChild.childNodes[1].displayDialogAsync("export-cross-tab");
    }

    const handleTriggerRefresh = () => {
      setRefreshSpin(true)
      dashboardRef.current.firstChild.firstChild.childNodes[1].refreshDataAsync().then(function() {
        console.log("Dashboard refreshed.");
        setRefreshSpin(false)
        }).catch(function(error) {
            console.error("Error refreshing dashboard:", error);
            setRefreshSpin(false)
        });
    }

    const handleBackgroundRefresh = () => {
      dashboardRef.current.firstChild.firstChild.childNodes[1].refreshDataAsync().then(function() {
        console.log("Dashboard refreshed in background.");
        }).catch(function(error) {
            console.error("Error refreshing dashboard:", error);
        });
    }



    const handleLogoClick = () => {
      setActiveDashboard(false)
    }
    const handleCheckboxChange = () => {
      const createSub = async () => {
        try {
          const data = 
          {
            "useremail": defaultEmail,
            "dashboardid": activeDashboardId,
            "link": activeURL
          }
          setSubscriptionCheck(true);
          const result = await createSubscription(data);
          const newSubscriptions = { ...subscriptions };
          newSubscriptions[activeDashboardId] = defaultEmail;
      
          // Update the state with the new object
          setSubscriptions(newSubscriptions);
          setupdatingSub(false)
          console.log("Subscription created:", result);


        } catch (error) {
          console.error('Caught an error:', error);
        } finally {
          
        }
      };

      const deleteSub = async () => {
        try {
          const data = 
          {
            "useremail": defaultEmail,
            "dashboardid": activeDashboardId
          }
          setSubscriptionCheck(false);
          const result = await deleteSubscription(data);
          const newSubscriptions = { ...subscriptions };
          delete newSubscriptions[activeDashboardId];
      
          // Update the state with the new object
          setSubscriptions(newSubscriptions);
          setupdatingSub(false)

          console.log("Subscription deleted:", result);


        } catch (error) {
          console.error('Caught an error:', error);
        } finally {
          
        }
      };
      if (!updatingSub){
        setupdatingSub(true)

        if (Object.keys(subscriptions).includes(activeDashboardId)) {
          deleteSub();
        } else {
          createSub();
        }
      }
    }

    const handleButtonClick = (tabIndex, tabText) => {
      validUserContext.localAuthCheck(false);
      setActiveButton(tabIndex);
      setActiveURL(currentLinks[tabIndex])
      setActiveDashboard(true)
      setActiveDashboardId(currentIds[tabIndex])
      setDefaultFolder('Home')
      setDisplayTabs(false)
      if (isMobileDevice() ){
        setMenuOpen(false)
      }
      setDisplayToolbarButtons(true)
      let newBreadCrumbs
      // Remove elements after the specific element
      newBreadCrumbs = [{"id":tabText, "name":tabText}]
      setBreadCrumbs(newBreadCrumbs)
      setSubscriptionCheck(false);
    };

    const handleBreadCrumbClick = (folderName) => {
      setActiveDashboard(false)
      setDefaultFolder(folderName.name)
      setDefaultFolderId(folderName.id)

      let indexToRemove = breadCrumbs.indexOf(folderName);
      let newBreadCrumbs
      // Remove elements after the specific element
      if (indexToRemove !== -1) {
        newBreadCrumbs = breadCrumbs.slice(0, indexToRemove + 1);
      }
      setBreadCrumbs(newBreadCrumbs)
    };

    const handleMenuClick  = () => {
      if (menuOpen) {
        setMenuOpen(false)
      } else {
        setMenuOpen(true)
      }
    };

    const handleEmailClick = () => {
      const email = "no-reply@bradleypayne.com"; // Replace with the recipient's email address
      const subject = "Customer Request"; // Replace with your desired subject
      const body = ""; // Replace with your desired email body
      
      // Construct the mailto link
      const mailtoLink = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
      //window.location.href = mailtoLink;
      window.open(mailtoLink);
    }

    const renderContent = () => {
      if (activeDashboard)
          if (activeURL)
            return renderDashboard()
          else 
            return (
              <div></div>
            )
      else 
          return renderNavigation()
    } 

    const renderNavigation = () => {
      return (
        <div>
            <Navigation defaultFolder={defultFolder} defaultFolderId={defultFolderId} onDashboardClick={handleDashboardClick} onFolderClick={handleFolderClick}></Navigation>
        </div>
      )
    }


    const renderDashboard = () => {
      return (
        <div>
            <Dashboard dashboardLinkProp={activeURL} displayTabs={displayTabs} idleCount={idleCount}></Dashboard>
        </div>
      )
    };
    
    const rendeToolbar = () => {  
      
    }
    const setSelectedClient = (event) => {
      var newFilteredNav = sortedNav.filter(([key, value]) => value.client === event);
      const flatNav = flattenNav(newFilteredNav);
      var buttons = flatNav.map(n => n.label);
      var links = flatNav.map(n => n.link);
      var dashboardids = flatNav.map(n => n.id);

      setDefaultGroup(event);
      setCurrentButtons(buttons);
      setCurrentLinks(links);
      setCurrentIds(dashboardids);
      setActiveButton(0);
      setActiveURL(links[0]);
      setActiveDashboardId(dashboardids[0]);
    };
    
    
    const renderButtons = () => {  
      return currentButtons.map((buttonText, index) => {
        if (activeButton === index) {
            return (<div className={`${classes.sideButton} ${classes.active}`} onClick={() => handleButtonClick(index, buttonText)}>{buttonText.replace(/^\d+\.\s*/, '')}</div>)
        } else {
            return (<div className={`${classes.sideButton}`} onClick={() => handleButtonClick(index, buttonText)}>{buttonText.replace(/^\d+\.\s*/, '')}</div>)
        }
      });
    };
    var randomNumber = Math.floor(Math.random() * 1000000);


    var logoKey = (clientGroup || defaultGroup).toLowerCase();
    var companyLink = `https://storage.googleapis.com/bp_portal_artifacts/${logoKey}.png?v=${randomNumber}`
    
    var defaultLink = `https://storage.googleapis.com/bp_portal_artifacts/bradleypayne.png?v=${randomNumber}`
    const handleError = (event) => {
      event.target.src = defaultLink;
    };

    const renderFull = () => {
      return (
          <div className={`${classes.landing}`}>

            <div className={`${menuOpen ? classes.sidebar : classes.sidebarClosed} `}
                  ref={containerRef}>
            <div className={`${classes.sidebartop}`}>

              <div className={`${classes.sidebarlogoCircle}`}>
                <img className={classes.sidebarlogo} src={companyLink} onError={handleError}></img>
              </div>
              <div className={classes.sideState}>
                {group === "Admin" ? (
                  <div className={classes.selectDropdownWrapper}>
                    <select
                      value={defaultGroup}
                      onChange={(e) => setSelectedClient(e.target.value)}
                      className={classes.selectDropdown}
                    >
                      {clientList.map((client, index) => (
                        <option key={index} value={client}>
                          {client}
                        </option>
                      ))}
                    </select>
                    <span className={classes.selectArrow}>▼</span>
                  </div>
                ) : (
                  <span>{logoKey}</span>
                )}
              </div>
              {renderButtons()}
            </div>
            <div className={classes.sidebarBrand}>
                <img src={bpLogoWhite} className={classes.sidebarBrandLogo} alt="Bradley Payne" />
            </div>
            <div className={`${classes.sidebarbottom}`}>
                <div className={`${classes.userinfoCircle}`}>
                    <ProfileCard />
                </div>
            </div>
          </div>
          <div className={`${menuOpen ? classes.contentblock : classes.contentblockMobile}`}>
            <div className={`${classes.toolbar}`}>
                {displayToolbarButtons? 
                (
                  <div className={classes.toolbarActions}>
                      <img
                      className={classes.dividericon}
                      src={dividerIcon}
                      alt="Divider icon"
                      ></img>
                      <img
                      className={classes.pdficon}
                      src={pdfIcon}
                      alt="PDF icon"
                      onClick={() => handleExportPDFClick()}
                      ></img>
                      <img
                      className={classes.pdficon}
                      src={pngIcon}
                      alt="PNG icon"
                      onClick={() => handleExportPNGClick()}
                      ></img>
                      <img
                      className={classes.pwrpicon}
                      src={pwrpIcon}
                      alt="Power Point icon"
                      onClick={() => handleExportPWRPClick()}
                      ></img>
                      <img
                      className={classes.excelicon}
                      src={excelIcon}
                      alt="Excel icon"
                      onClick={() => handleCrossTabClick()}
                      ></img>
                      <img
                      className={classes.dividericon}
                      src={dividerIcon}
                      alt="Divider icon"
                      ></img>
                      <img
                      className={`${classes.refreshicon} ${refreshSpin ? classes.spin : ''}`}
                      src={refreshIcon}
                      alt="Refresh"
                      onClick={() => handleTriggerRefresh()}
                      ></img>
                  </div>
                ):(
                  <div></div>
                )
                }
            </div>
            <div className={classes.dashboardblock} ref={dashboardRef} >
                {renderContent()}
            </div>
          </div>
          
        </div>
      )
    }

    const renderMobile = () => {
      return (
            <div {...handlers} className={`${classes.landing}`}>
                {menuOpen && <div  className={classes.overlay} />} {/* Add the overlay */}
                <div  ref={sidebarRef} className={`${menuOpen ? classes.sidebar : classes.sidebarClosed}`}>
                  <div className={`${classes.sidebartop}`}>
                    <div className={`${classes.sidebarlogoCircle}`}>
                      <img className={classes.sidebarlogo} src={companyLink} onError={handleError}></img>
                    </div>
                    <div className={classes.sideState}>
                      {group === "Admin" ? (
                        <div className={classes.selectDropdownWrapper}>
                          <select
                            value={defaultGroup}
                            onChange={(e) => setSelectedClient(e.target.value)}
                            className={classes.selectDropdown}
                          >
                            {clientList.map((client, index) => (
                              <option key={index} value={client}>
                                {client}
                              </option>
                            ))}
                          </select>
                          <span className={classes.selectArrow}>▼</span>
                        </div>
                      ) : (
                        <span>{defaultGroup}</span>
                      )}
                    </div>                  
                    {/* <div className={`${classes.sideState}`}>{defaultGroup}</div> */}
                    {renderButtons()}
                  </div> 
                  <div className={classes.sidebarBrand}>
                      <img src={bpLogoWhite} className={classes.sidebarBrandLogo} alt="Bradley Payne" />
                  </div>
                  <div className={`${classes.sidebarbottom}`}>
                    <div className={`${classes.userinfoCircle}`}>
                        <ProfileCard />
                    </div>
                  </div>
                </div>
                <div className={`${classes.contentblockMobile}`}>
                  <div className={`${classes.toolbar}`}>
                      <img
                        className={classes.menuicon}
                        src={menuIcon}
                        alt="Menu icon"
                        htmlFor="menu-click"
                        onClick={() => handleMenuClick()}
                      ></img>
                  </div>
                  <div className={classes.dashboardblock} ref={dashboardRef} >
                      {renderContent()}
                  </div>
                </div>
            </div>
      )
    }


    // var jwtToken = JSON.parse(localStorage.getItem("tableau-login-data"));
    // localStorage.setItem("tableau-login-data", JSON.stringify("redeemed"));

    // var inputProps = {
    // };
    
    // if (jwtToken != "redeemed") {
    //   inputProps.token = jwtToken;
    // }

    return (
      <div>
        {isMobileDevice() ?
          renderMobile()
          :
          renderFull()
        }
      </div>
    );
  };
  
  export default Landing;
