import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import { AuthProvider } from "./context/AuthContext.jsx";
import { AdmissionsProvider } from "./context/AdmissionsContext.jsx";
import "./styles/global.css";

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <AdmissionsProvider><App /></AdmissionsProvider>
      </AuthProvider>
    </BrowserRouter>
  </React.StrictMode>
);
