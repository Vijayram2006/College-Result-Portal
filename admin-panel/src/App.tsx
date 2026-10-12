import React, { useState } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";

import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ResultsPage } from "./pages/Results";
import { ResultsUpload } from "./pages/ResultsUpload";
import { ResultsValidation } from "./pages/ResultsValidation";
import { ResultsPublished } from "./pages/ResultsPublished";
import { AnalyticsPage } from "./pages/Analytics";
import { AuditLogsPage } from "./pages/AuditLogs";
import { ProfilePage } from "./pages/Profile";
import { SubjectsPage } from "./pages/Subjects";

const pageTitles: Record<string, string> = {
  "/admin/dashboard": "University Admin Dashboard",
  "/admin/results": "Result Management Hub",
  "/admin/results/upload": "Student Data",
  "/admin/results/validation": "Student Mark Entry",
  "/admin/results/published": "Published Examination Results",
  "/admin/analytics": "Institutional Analytics",
  "/admin/audit-logs": "Administrative Audit Trail",
  "/admin/profile": "Controller Profile & Security",
  "/admin/subjects": "COE Subject Catalog & Finalization Hub",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  const title = pageTitles[location] || "Admin Panel";

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#172033] flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        <Navbar setMobileOpen={setMobileOpen} title={title} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">{children}</main>
      </div>
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Switch>
      {/* Public Admin Login Route */}
      <Route path="/admin/login" component={Login} />

      {/* Protected Admin Routes */}
      <Route path="/admin/dashboard">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={Dashboard} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/results">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={ResultsPage} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/results/upload">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={ResultsUpload} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/results/validation">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={ResultsValidation} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/results/published">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={ResultsPublished} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/analytics">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={AnalyticsPage} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/audit-logs">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={AuditLogsPage} />
          </AdminLayout>
        )}
      </Route>

      
      <Route path="/admin/subjects">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={SubjectsPage} />
          </AdminLayout>
        )}
      </Route>
  
      <Route path="/admin/profile">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={ProfilePage} />
          </AdminLayout>
        )}
      </Route>

      {/* Fallback Redirect */}
      <Route path="/">
        <Redirect to="/admin/dashboard" />
      </Route>

      <Route>
        <Redirect to="/admin/dashboard" />
      </Route>
    </Switch>
  );
};

export default App;
