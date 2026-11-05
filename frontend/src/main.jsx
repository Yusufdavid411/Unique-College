import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AdmissionsProvider } from "./context/AdmissionsContext.jsx";
import "./styles/global.css";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";
import ToastNotifications from "./components/ToastNotifications.jsx";
import { SchoolProvider } from "./context/SchoolContext.jsx";
import { ConfirmationProvider } from "./context/ConfirmationContext.jsx";
import { installModuleRecovery } from "./api/moduleRecovery.js";

installModuleRecovery(window);

function ApplicationRoot() {
  React.useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-applicant-access");
    document.documentElement.dataset.appReady = "true";
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <ConfirmationProvider><SchoolProvider><AdmissionsProvider><App /></AdmissionsProvider></SchoolProvider></ConfirmationProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><ToastNotifications /><AppErrorBoundary><ApplicationRoot /></AppErrorBoundary></React.StrictMode>
);
