import React, { useEffect, useState } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { Sidebar } from "./components/Sidebar";
import { Navbar } from "./components/Navbar";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PasswordChangeGate } from "./components/PasswordChange";

import { Login } from "./pages/Login";
import { Dashboard } from "./pages/Dashboard";
import { ResultsPage } from "./pages/Results";
import { ResultsUpload } from "./pages/ResultsUpload";
import { ResultsValidation } from "./pages/ResultsValidation";
import { ResultsPublished } from "./pages/ResultsPublished";
import { ResultsPublish } from "./pages/ResultsPublish";
import { AnswerScripts } from "./pages/AnswerScripts";
import { AnalyticsPage } from "./pages/Analytics";
import { AuditLogsPage } from "./pages/AuditLogs";
import { ProfilePage } from "./pages/Profile";
import { SubjectsPage } from "./pages/Subjects";
import { DepartmentsPage, refreshDepartments } from "./pages/Departments";
import { SuperAdminControlPage } from "./pages/SuperAdminControl";
import { startSystemConfigSync } from "./utils/systemConfig";
import { RevaluationRequestsPage } from "./pages/RevaluationRequests";

const pageTitles: Record<string, string> = {
  "/admin/super-admin": "Chief COE & Super Admin Console",
  "/admin/results/revaluation": "Student Revaluation Requests",
  "/admin/dashboard": "University Admin Dashboard",
  "/admin/departments": "University Department Directory & Management",
  "/admin/results": "Result Management Hub",
  "/admin/results/upload": "Student Data",
  "/admin/results/validation": "Student Mark Entry",
  "/admin/results/answer-scripts": "Answer Script Entry",
  "/admin/results/publish": "Publish Results",
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

  // Every page reads the college's departments from this cache; load it fresh from the server once per visit
  useEffect(() => {
    refreshDepartments().catch(() => undefined);
  }, []);

  // The Super Admin's gateways and locks, kept current while the panel is open
  useEffect(() => startSystemConfigSync(), []);

  const title = pageTitles[location] || "Admin Panel";

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#172033] flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        <Navbar setMobileOpen={setMobileOpen} title={title} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">{children}</main>
      </div>
      <PasswordChangeGate />
    </div>
  );
};

export const App: React.FC = () => {
  return (
    <Switch>
      {/* Public Admin Login Route */}
      <Route path="/admin/login" component={Login} />

      {/* Protected Admin Routes */}
      <Route path="/admin/super-admin">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={SuperAdminControlPage} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/results/revaluation">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={RevaluationRequestsPage} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/dashboard">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={Dashboard} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/departments">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={DepartmentsPage} />
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

      <Route path="/admin/results/answer-scripts">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={AnswerScripts} />
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

      <Route path="/admin/results/publish">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={ResultsPublish} />
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
