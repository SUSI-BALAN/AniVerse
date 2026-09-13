import { Navigate,useLocation } from "react-router-dom";
import type { ReactNode } from "react";
import { useAuth } from "./AuthContext";
export function ProtectedRoute({children}:{children:ReactNode}){const auth=useAuth(),location=useLocation();if(auth.loading)return<div className="page-shell min-h-[60vh] animate-pulse text-muted">Checking your session...</div>;if(auth.mode==="supabase"&&!auth.user)return<Navigate to="/login" replace state={{from:location.pathname+location.search}}/>;return children;}
