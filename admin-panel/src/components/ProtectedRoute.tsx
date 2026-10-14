import React from "react";
import { Redirect } from "wouter";
import { adminAuthApi } from "../services/api";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const token = localStorage.getItem("kvell_admin_token");
  const currentUser = adminAuthApi.getCurrentUser();

  // Route protection: requires authentication AND authorized COE role
  const allowedRoles = ["SUPER_ADMIN", "ADMIN", "COE_ENGINEERING", "COE_NURSING", "COE_PHARMACY"];
  if (!token || !currentUser || !allowedRoles.includes(currentUser.role)) {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
};
