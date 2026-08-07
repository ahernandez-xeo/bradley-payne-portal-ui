import classes from "./Landing.module.scss";
import {useRef, useEffect, useState, useContext} from "react";
import ValidUserContext from "../authCheck";
import { chartPalette } from "../themeColors";
import dividerIcon from "../assets/akar-icons_divider.svg";
import classesSpin from "../App.module.scss";



const Dashboard = ({dashboardLinkProp, displayTabs, onDashboardReady}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const [dashboardLink, setDashboardLink] = useState(dashboardLinkProp)
    const [tabArray, setTabArray] = useState([
    ]);
    const [tabLinksArray, setTabLinksArray] = useState([
    ]);
    const elementRef = useRef();
    const linkRef = useRef(dashboardLink);
    const onDashboardReadyRef = useRef(onDashboardReady);

    const validUserContext = useContext(ValidUserContext);
    console.log("prop: "+dashboardLink);

    useEffect(() => {
      onDashboardReadyRef.current = onDashboardReady;
    }, [onDashboardReady]);

    const isMobileDevice = () => {
      return /Mobi|Android/i.test(navigator.userAgent);
    };

    const buildDashboardUrl = (link) =>
      "https://us-east-1.online.tableau.com/#/site/bradleypayneplatform/views/" +
      (link || "").replace("/sheets", "") +
      "?:showVizHome=no&:embed=true&:toolbar=no&:tabs=n&refresh=yes";

    useEffect(() => {
      setDashboardLink(dashboardLinkProp);
      linkRef.current = dashboardLinkProp;
      setLoaded(false);
      console.log("Reading localstorage");
      const items = JSON.parse(localStorage.getItem("tabs"));
      if (items) {
        setTabArray(["Loading"]);
      }

      // Keep the same <tableau-viz> instance (JWT is one-time redeemable).
      // Explicitly update src so sheet switches re-fire firstinteractive.
      const viz = elementRef.current;
      if (viz && dashboardLinkProp) {
        const nextSrc = buildDashboardUrl(dashboardLinkProp);
        if (viz.src !== nextSrc) {
          // Mark session still active during in-place sheet switches so the
          // idle logout timer does not fire mid-navigation.
          localStorage.setItem("tableauActive", true);
          viz.src = nextSrc;
        }
      }

      const timeoutId = setTimeout(() => {
        var tableauActive = JSON.parse(localStorage.getItem("tableauActive"));
        if (tableauActive) {
          console.log("Tableau session active");
        } else {
          console.log("Tableau session inactive");
          validUserContext.logoutUser();
        }
      }, 30000);

      return () => clearTimeout(timeoutId);
    }, [dashboardLinkProp]);

    useEffect(() => {
        const viz = elementRef.current;
        if (!viz) {
          return;
        }

        const handleFirstInteractive = async () => {
            console.log(`Dashboard Loaded`);
            console.log("effect: "+linkRef.current)
            var sheets = viz.workbook.publishedSheetsInfo;
            var newArray = sheets.map(sheet => {
                if (isMobileDevice()) {
                  return sheet.index +1
                }
                return sheet.name
            }) 

            var newLinksArray = sheets.map(sheet => {
              return sheet.name
          }) 

            localStorage.setItem("tabs", JSON.stringify(newArray));
            localStorage.setItem("tableauActive", true);
            var activeTabIndex = sheets.findIndex(sheet => sheet.url.includes(linkRef.current.replace("sheets/", "")))

            setTabArray(newArray);
            setTabLinksArray(newLinksArray);

            setLoaded(true);
            setActiveTab(activeTabIndex);
            try {
              await viz.refreshDataAsync();
            } catch (error) {
              console.error("Error refreshing viz on load:", error);
            }
            if (onDashboardReadyRef.current) {
              onDashboardReadyRef.current(viz);
            }
        };

        console.log(`Listener added`);
        viz.addEventListener("firstinteractive", handleFirstInteractive);

        return () => {
          viz.removeEventListener("firstinteractive", handleFirstInteractive);
        };
      }, []);


    const handleTabClick = (tabIndex) => {
        validUserContext.localAuthCheck(false);
        elementRef.current.workbook.activateSheetAsync(tabLinksArray[tabIndex])
        setActiveTab(tabIndex);
    };

    const renderTabs = () => {

      const colors = chartPalette;
  
      return tabArray.map((tab, index) => {
        if (activeTab === index) {
            return (
                <span
                  key={index}
                  className={`${classes.tab}  ${classes.active}`}
                  style={{backgroundColor: '$line-theme'}}
                  onClick={() => handleTabClick(index)}
                >
                  {tab}
                </span>
            )
        } else {
            return (
                <span
                  key={index}
                  className={`${classes.tab}`}
                  style={{backgroundColor: '$line-theme'}}
                  onClick={() => handleTabClick(index)}
                >
                  {tab}
                </span>
            )
        }
      });
    };

    const handleTableauLoad = () => {
      validUserContext.localAuthCheck(false);
    };
    

    var jwtToken = JSON.parse(localStorage.getItem("tableau-login-data"));
    localStorage.setItem("tableau-login-data", JSON.stringify("redeemed"));

    var inputProps = {
    };
    
    if (jwtToken != "redeemed") {
      inputProps.token = jwtToken;
    }
    const dashboardURL = buildDashboardUrl(dashboardLink);

    console.log("Loading dashboard.");

    return (
        <div>
            {displayTabs? 
              (
                <div className={`${classes.tabbar}`}>
                  <span className={`${classes.tabs}`}>{renderTabs()}</span>
                </div>
              ):(
                <div></div>
              )
            }
            <tableau-viz class={`${classes.tabframe}`}  onLoad={() => handleTableauLoad()} ref={elementRef} id="tableauViz" refresh="yes" width="100%" height="100%" hide-tabs='true' toolbar='hidden'
                    src={dashboardURL} {...inputProps}
                   >
                  <custom-parameter name=":refresh" value="yes"></custom-parameter>
            </tableau-viz>
            {true == false  ? 
            ( <div className={classes.loadingSpinnerContainer}>
                <div className={classes.loadingSpinner}></div>
              </div>
            ):(
              <div></div>
            )
          }
        </div>
    );
  };
  
  export default Dashboard;
