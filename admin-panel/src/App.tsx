import React, { Suspense, lazy, useEffect, useState } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { Sidebar } from "./components/Sidebar";
import { Navbar, UNIVERSITY_BAR_HEIGHT } from "./components/Navbar";
import { isSuperAdmin } from "./utils/rbac";
import { ProtectedRoute } from "./components/ProtectedRoute";
import { PasswordChangeGate } from "./components/PasswordChange";
import { MfaSetupGate } from "./components/MfaSetup";
import { adminAuthApi } from "./services/api";
import { ErrorBoundary, installGlobalErrorReporting } from "./components/ErrorBoundary";
import { NotFoundPage } from "./pages/NotFound";
import { SiteFooter } from "./components/SiteFooter";

import { Login } from "./pages/Login";
import { refreshDepartments } from "./pages/Departments";
import { startSystemConfigSync } from "./utils/systemConfig";
const Dashboard = lazy(() => import("./pages/Dashboard").then((m) => ({ default: m.Dashboard })));
const ResultsPage = lazy(() => import("./pages/Results").then((m) => ({ default: m.ResultsPage })));
const ResultsUpload = lazy(() => import("./pages/ResultsUpload").then((m) => ({ default: m.ResultsUpload })));
const ResultsValidation = lazy(() => import("./pages/ResultsValidation").then((m) => ({ default: m.ResultsValidation })));
const ResultsPublished = lazy(() => import("./pages/ResultsPublished").then((m) => ({ default: m.ResultsPublished })));
const ResultsPublish = lazy(() => import("./pages/ResultsPublish").then((m) => ({ default: m.ResultsPublish })));
const AnswerScripts = lazy(() => import("./pages/AnswerScripts").then((m) => ({ default: m.AnswerScripts })));
const AnalyticsPage = lazy(() => import("./pages/Analytics").then((m) => ({ default: m.AnalyticsPage })));
const AuditLogsPage = lazy(() => import("./pages/AuditLogs").then((m) => ({ default: m.AuditLogsPage })));
const ProfilePage = lazy(() => import("./pages/Profile").then((m) => ({ default: m.ProfilePage })));
const SubjectsPage = lazy(() => import("./pages/Subjects").then((m) => ({ default: m.SubjectsPage })));
const DepartmentsPage = lazy(() => import("./pages/Departments").then((m) => ({ default: m.DepartmentsPage })));
const SuperAdminControlPage = lazy(() => import("./pages/SuperAdminControl").then((m) => ({ default: m.SuperAdminControlPage })));
const RevaluationRequestsPage = lazy(() => import("./pages/RevaluationRequests").then((m) => ({ default: m.RevaluationRequestsPage })));
const FacultyMasterPage = lazy(() => import("./pages/FacultyMaster").then((m) => ({ default: m.FacultyMasterPage })));
const InternalMarksPage = lazy(() => import("./components/CoAssessment").then((m) => ({ default: () => <m.CoAssessment mode="admin" /> })));
const QuestionPapersPage = lazy(() => import("./pages/QuestionPapers").then((m) => ({ default: m.QuestionPapersPage })));

const pageTitles: Record<string, string> = {
  "/admin/super-admin": "Dashboard",
  "/admin/results/revaluation": "Student Revaluation Requests",
  "/admin/dashboard": "University Admin Dashboard",
  "/admin/departments": "University Department Directory & Management",
  "/admin/question-papers": "Question Paper Logistics & Master Release Hub",
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
  "/admin/faculty-master": "Faculty Master",
  "/admin/results/internal-marks": "Internal Marks",
};

interface AdminLayoutProps {
  children: React.ReactNode;
}

const AdminLayout: React.FC<AdminLayoutProps> = ({ children }) => {
  // Until a COE has set up two-step sign-in the server refuses the panel's data: show only the set-up screen
  const me = adminAuthApi.getCurrentUser();
  if (me?.mfaSetupRequired && !me.mustChangePassword) return <MfaSetupGate />;
  return <AdminLayoutBody>{children}</AdminLayoutBody>;
};

const AdminLayoutBody: React.FC<AdminLayoutProps> = ({ children }) => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Every page reads the college's departments from this cache; load it fresh from the server once per visit
  useEffect(() => {
    refreshDepartments().catch(() => undefined);
  }, []);

  // The Super Admin's gateways and locks, kept current while the panel is open
  useEffect(() => startSystemConfigSync(), []);

  // A saved profile changes the name shown in the sidebar and top bar
  const [, setProfileVersion] = useState(0);
  useEffect(() => {
    const refresh = () => setProfileVersion((v) => v + 1);
    window.addEventListener("kvell_profile_updated", refresh);
    return () => window.removeEventListener("kvell_profile_updated", refresh);
  }, []);

  const title = pageTitles[location] || "Admin Panel";

  return (
    <div className="min-h-screen bg-[#F8F5EE] text-[#172033] flex">
      <Sidebar mobileOpen={mobileOpen} setMobileOpen={setMobileOpen} />
      <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
        <Navbar setMobileOpen={setMobileOpen} title={title} />
        {/* The Chief COE's university bar is fixed across the full width; keep the page below it */}
        {isSuperAdmin() && <div aria-hidden className="shrink-0" style={{ height: UNIVERSITY_BAR_HEIGHT }} />}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full min-w-0">
          <ErrorBoundary>
            <Suspense fallback={<p className="text-sm text-slate-500" role="status">Loading…</p>}>{children}</Suspense>
          </ErrorBoundary>
        </main>
        <SiteFooter />
      </div>
      <PasswordChangeGate />
      <MfaSetupGate />
    </div>
  );
};

installGlobalErrorReporting();

export const App: React.FC = () => {
  return (
    <ErrorBoundary>
    <Suspense fallback={<p className="p-6 text-sm text-slate-500" role="status">Loading…</p>}>
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

      
      <Route path="/admin/results/internal-marks">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={InternalMarksPage} />
          </AdminLayout>
        )}
      </Route>

      <Route path="/admin/faculty-master">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={FacultyMasterPage} />
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

      <Route path="/admin/question-papers">
        {() => (
          <AdminLayout>
            <ProtectedRoute component={QuestionPapersPage} />
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

      <Route path="/admin">
        <Redirect to="/admin/dashboard" />
      </Route>

      {/* Any other address: a real "not found" page instead of silently jumping elsewhere */}
      <Route>
        <NotFoundPage />
      </Route>
    </Switch>
    </Suspense>
    </ErrorBoundary>
  );
};

export default App;
