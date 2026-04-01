import React from "react";
import ReactDOM from "react-dom/client";
import "./index.scss";
import favicon from "./assets/favicon.png";
import App from "./App";
import { ValidUserContextProvider } from "./authCheck";
import Favicon from 'react-favicon';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ValidUserContextProvider>
    <div>
        <Favicon url={favicon}/>
    </div>
    <App />
  </ValidUserContextProvider>
);

