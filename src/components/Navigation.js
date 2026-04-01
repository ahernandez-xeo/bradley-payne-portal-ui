import classes from "./Navigation.module.scss";
import {useRef, useEffect, useState, useContext} from "react";
import ValidUserContext from "../authCheck";
import dividerIcon from "../assets/akar-icons_divider.svg";

function folderSorter(a, b) {
    return (a[1].name > b[1].name) ? 1 : -1;
  }

const Folder = ({ folderId, folderData, onFolderClick, navigationData }) => {
    const { name, children } = folderData;
    
    var dashboardURL = JSON.parse(localStorage.getItem("dashboard-url"));
    if (navigationData[folderId]['link']) {
        dashboardURL = dashboardURL.replace("#/site", "t")
        dashboardURL = dashboardURL +navigationData[folderId]['link'].replace('/sheets','') + '.png'
    }
    return (
        <div className={classes.folder} onClick={() => onFolderClick(folderId)} style={{ cursor: 'pointer' }}>
            {navigationData[folderId]['link'] ? (
                <div className={classes.graphicon}>
                    {/* <img src={dashboardURL} 
                        width="50" height="50"></img> */}
                </div>
            ) : (
                <div className={classes.foldericon}></div>
            )}
            {name.replace(/^\d+\./, '')}
        </div>
    );
  };


const Navigation = ({defaultFolder, defaultFolderId, onDashboardClick, onFolderClick}) => {
    const navigationData = JSON.parse(localStorage.getItem("navigation"));

    const rootFolders = Object.entries(navigationData).filter(
        ([folderId, folderData]) => folderData.parent_id === '2c701ce8-19a1-45d0-ae0a-ec3ce0ebbdb1'
      );

    const [currentFolder, setCurrentFolder] = useState(rootFolders);
        
    useEffect(() => {
        if (defaultFolder != '' && defaultFolder != 'Home') {
            var defaultfolderObject =  Object.entries(navigationData).filter(
                ([folderId, folderData]) => folderId === defaultFolderId
            );    
            var selectedFolder = Object.entries(navigationData).filter(
                ([folderId, folderData]) => folderData.parent_id === defaultfolderObject[0][0]
            );
            var sortedFolder = selectedFolder.sort(folderSorter)
            setCurrentFolder(sortedFolder)
        } else {
            var root = '2c701ce8-19a1-45d0-ae0a-ec3ce0ebbdb1'
            while (navigationData[root].children 
                    && navigationData[root].children.length == 1)
                    {
                        root = navigationData[root].children[0]
                    }
            var defaultfolderId =  Object.entries(navigationData).filter(
                ([folderId, folderData]) => folderData.parent_id === root
            ); 
            defaultfolderId.sort(folderSorter)
            setCurrentFolder(defaultfolderId)
        }
      }, [defaultFolder]);

  
    const handleFolderClick = (clickedFolderId) => {
        if (navigationData[clickedFolderId]['link']){
            onDashboardClick(navigationData[clickedFolderId]['link'])
        } else {
            onFolderClick(navigationData[clickedFolderId]['name'], clickedFolderId)
        }
        var newFolder = Object.entries(navigationData).filter(
            ([folderId, folderData]) => folderData.parent_id === clickedFolderId
        );
        setCurrentFolder(newFolder);
    };
  
    return (
      <div className={classes.navbody}>
        {currentFolder.map(([folderId, folderData]) => (
          <Folder key={folderId} folderId={folderId} folderData={folderData} onFolderClick={handleFolderClick} navigationData={navigationData} />
        ))}
      </div>
    );
  };

  export default Navigation;
