import React from "react";
import { Redirect } from "wouter";
import { adminAuthApi } from "../services/api";

interface ProtectedRouteProps {
  component: React.ComponentType<any>;
}

export const ProtectedRoute: React.FC<ProtectedRouteProps> = ({ component: Component }) => {
  const token = localStorage.getItem("kvell_admin_token");
  const currentUser = adminAuthApi.getCurrentUser();

  // Route protection: requires authentication AND role = ADMIN
  if (!token || !currentUser || currentUser.role !== "ADMIN") {
    return <Redirect to="/admin/login" />;
  }

  return <Component />;
};
