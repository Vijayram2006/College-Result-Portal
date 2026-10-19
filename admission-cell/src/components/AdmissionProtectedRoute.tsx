import React from "react";
import { Redirect } from "wouter";
import { getCurrentAdmissionUser, isAuthenticated, isSuperAdmin, COLLEGES } from "../utils/rbac";
import { CollegeKey } from "../types/admission";

interface ProtectedRouteProps {
  collegeKey?: CollegeKey;
  children: React.ReactNode;
}

export const AdmissionProtectedRoute: React.FC<ProtectedRouteProps> = ({
  collegeKey,
  children,
}) => {
  if (!isAuthenticated()) {
    return <Redirect to="/login" />;
  }

  const currentUser = getCurrentAdmissionUser();
  if (!currentUser) {
    return <Redirect to="/login" />;
  }

  // Super Admin can access any college
  if (isSuperAdmin(currentUser)) {
    return <>{children}</>;
  }

  // If this route is restricted to a specific college, check the user's assigned college
  if (collegeKey && currentUser.collegeKey !== collegeKey) {
    // Redirect to the user's own authorized admission cell
    const userPath = currentUser.collegeKey ? COLLEGES[currentUser.collegeKey].portalPath : "/login";
    return <Redirect to={userPath} />;
  }

  return <>{children}</>;
};
