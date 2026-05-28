import classes from "./Landing.module.scss";
import {useRef, useEffect, useState, useContext} from "react";
import ValidUserContext from "../authCheck";
import { chartPalette } from "../themeColors";
import dividerIcon from "../assets/akar-icons_divider.svg";
import classesSpin from "../App.module.scss";



const Dashboard = ({dashboardLinkProp, displayTabs}) => {
    const [activeTab, setActiveTab] = useState(0);
    const [loaded, setLoaded] = useState(false);

    const [dashboardLink, setDashboardLink] = useState(dashboardLinkProp)
    const [tabArray, setTabArray] = useState([
    ]);
    const [tabLinksArray, setTabLinksArray] = useState([
    ]);
    const elementRef = useRef();
    const linkRef = useRef(dashboardLink);

    const validUserContext = useContext(ValidUserContext);
    console.log("prop: "+dashboardLink);

    const isMobileDevice = () => {
      return /Mobi|Android/i.test(navigator.userAgent);
    };

    useEffect(() => {
      setDashboardLink(dashboardLinkProp);
      linkRef.current = dashboardLinkProp;
      console.log("Reading localstorage")
      localStorage.setItem("tableauActive", false);
      const items = JSON.parse(localStorage.getItem("tabs"));
      if (items) {
        setTabArray(["Loading"]);
      }

      const timeoutId = setTimeout(() => {
        var tableauActive = JSON.parse(localStorage.getItem("tableauActive"));
        if (tableauActive) {
          console.log("Tableau session active")
        } else {
          console.log("Tableau session inactive")
          validUserContext.logoutUser()
        }

      }, 30000);
  
      // Cleanup function to clear the timeout if the component unmounts
      return () => clearTimeout(timeoutId);
    }, [dashboardLinkProp]);

    useEffect(() => {
        var viz = elementRef.current;
        var link = dashboardLink
        console.log(`Listener added`);
        viz.addEventListener("firstinteractive", async (event) => {
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
            viz.refreshDataAsync()
        });
        // viz.addEventListener("tabswitched", async (event) => {
        //     setActiveTab(tabArray.indexOf(event.detail.newSheetName))
        // });
        /*

        */
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
    var dashboardURL = JSON.parse(localStorage.getItem("dashboard-url"));

    var inputProps = {
    };
    
    if (jwtToken != "redeemed") {
      inputProps.token = jwtToken;
    }
    // dashboardURL = dashboardURL + dashboardLink.replace('/sheets','') + '?:showVizHome=no&:embed=true&:toolbar=no&:tabs=n&refresh=yes'
    dashboardURL = "https://us-east-1.online.tableau.com/#/site/bradleypayneplatform/views/" + dashboardLink.replace('/sheets','') + '?:showVizHome=no&:embed=true&:toolbar=no&:tabs=n&refresh=yes'

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
