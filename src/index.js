import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import "./index.scss";
import favicon from "./assets/favicon.png";
import App from "./App";
import { ValidUserContextProvider } from "./authCheck";
import { ToastProvider } from "./components/Toast/ToastProvider";
import ErrorBoundary from "./components/ErrorBoundary";
import Favicon from 'react-favicon';

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(
  <ErrorBoundary>
    <BrowserRouter>
      <ToastProvider>
        <ValidUserContextProvider>
          <div>
            <Favicon url={favicon} />
          </div>
          <App />
        </ValidUserContextProvider>
      </ToastProvider>
    </BrowserRouter>
  </ErrorBoundary>
);
