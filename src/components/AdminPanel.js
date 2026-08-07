import { useState } from "react";

import classes from "./AdminPanel.module.scss";
import UserAdmin from "./UserAdmin";
import NarrativeMapping from "./NarrativeMapping";

const TABS = [
  { id: "users", label: "User Management" },
  { id: "narrative", label: "Narrative Mapping" },
];

const AdminPanel = ({ onBack, onLogout }) => {
  const [activeTab, setActiveTab] = useState("users");

  return (
    <div className={classes.admin}>
      <header className={classes.topBar}>
        <div className={classes.brandText}>
          <div className={classes.brandName}>Admin</div>
          <div className={classes.brandTagline}>Portal administration</div>
        </div>
        <div className={classes.actions}>
          <button type="button" className={classes.secondaryBtn} onClick={onBack}>
            ← Portal
          </button>
          <button type="button" className={classes.secondaryBtn} onClick={onLogout}>
            Log out
          </button>
        </div>
      </header>

      <div className={classes.body}>
        <nav className={classes.tabs} aria-label="Admin sections">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={`${classes.tab} ${
                activeTab === tab.id ? classes.tabActive : ""
              }`}
              onClick={() => setActiveTab(tab.id)}
            >
              {tab.label}
            </button>
          ))}
        </nav>

        <div className={classes.content}>
          {activeTab === "users" ? <UserAdmin /> : <NarrativeMapping />}
        </div>
      </div>
    </div>
  );
};

export default AdminPanel;
