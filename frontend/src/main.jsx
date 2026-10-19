import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AdmissionsProvider } from "./context/AdmissionsContext.jsx";
import "./styles/global.css";
import AppErrorBoundary from "./components/AppErrorBoundary.jsx";

function ApplicationRoot() {
  React.useLayoutEffect(() => {
    document.documentElement.removeAttribute("data-applicant-access");
    document.documentElement.dataset.appReady = "true";
  }, []);
  return (
    <BrowserRouter>
      <AuthProvider>
        <AdmissionsProvider><App /></AdmissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  );
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode><AppErrorBoundary><ApplicationRoot /></AppErrorBoundary></React.StrictMode>
);
