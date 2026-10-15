import React from "react";
import { Redirect, useLocation } from "wouter";
import { adminAuthApi } from "../services/api";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
}

/** Pages the Chief COE does not use: its dashboard is the university console, and departments/subjects belong to each college's COE. */
const NOT_FOR_SUPER_ADMIN = ["/admin/dashboard", "/admin/departments", "/admin/subjects"];

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const [location] = useLocation();
  const token = localStorage.getItem("kvell_admin_token");
  const currentUser = adminAuthApi.getCurrentUser();

  // Route protection: requires authentication AND authorized COE role
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "COE_ENGINEERING", "COE_NURSING", "COE_PHARMACY"];
  if (!token || !currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Redirect to="/admin/login" />;
  }
  if (currentUser.role === "SUPER_ADMIN" && NOT_FOR_SUPER_ADMIN.includes(location)) {
    return <Redirect to="/admin/super-admin" />;
  }

  return <Component />;
};
