import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App";
import { LibraryProvider } from "./context/LibraryContext";
import { AuthProvider, useAuth } from "./auth/AuthContext";
import "./styles/index.css";
import {ErrorBoundary} from "./components/ErrorBoundary";
import {ConfigurationGuard} from "./auth/ConfigurationGuard";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <ErrorBoundary><ConfigurationGuard><AuthProvider><BrowserRouter><PrivateState><App /></PrivateState></BrowserRouter></AuthProvider></ConfigurationGuard></ErrorBoundary>
  </React.StrictMode>
);

function PrivateState({children}:{children:React.ReactNode}){const auth=useAuth();return<LibraryProvider key={auth.user?.id??auth.mode}>{children}</LibraryProvider>;}
