import React, { useState } from "react";
import { Route, Switch, Redirect, useLocation } from "wouter";
import { AdmissionSidebar } from "./components/AdmissionSidebar";
import { AdmissionNavbar } from "./components/AdmissionNavbar";
import { AdmissionProtectedRoute } from "./components/AdmissionProtectedRoute";
import { StudentAdmissionModal } from "./components/StudentAdmissionModal";
import { UpdateStudentDataModal } from "./components/UpdateStudentDataModal";
import { AllotmentLetterModal } from "./components/AllotmentLetterModal";

import { Login } from "./pages/Login";
import { AdmissionDashboard } from "./pages/AdmissionDashboard";
import { StudentsAdmissionRoster } from "./pages/StudentsAdmissionRoster";
import { EngineeringRegEnginePage } from "./pages/EngineeringRegEnginePage";
import { VerificationDeskPage } from "./pages/VerificationDeskPage";

import { StudentApplicant, CollegeKey } from "./types/admission";
import { COLLEGES, getCurrentAdmissionUser, isAuthenticated } from "./utils/rbac";

export const App: React.FC = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [location] = useLocation();

  // Modal triggers
  const [isNewStudentModalOpen, setIsNewStudentModalOpen] = useState(false);
  const [activeModalCollege, setActiveModalCollege] = useState<CollegeKey>("engineering");
  const [selectedStudentForUpdate, setSelectedStudentForUpdate] = useState<StudentApplicant | null>(null);
  const [selectedStudentForAllotment, setSelectedStudentForAllotment] = useState<StudentApplicant | null>(null);

  // Helper to render an isolated cell
  const renderCellLayout = (
    collegeKey: CollegeKey,
    subPage: "dashboard" | "roster" | "verification" | "reg-engine"
  ) => {
    const col = COLLEGES[collegeKey];
    return (
      <AdmissionProtectedRoute collegeKey={collegeKey}>
        <div className="min-h-screen bg-[#F8F5EE] text-[#172033] flex">
          {/* Institution-Specific Sidebar */}
          <AdmissionSidebar
            collegeKey={collegeKey}
            mobileOpen={mobileOpen}
            setMobileOpen={setMobileOpen}
            onOpenNewStudentModal={() => {
              setActiveModalCollege(collegeKey);
              setIsNewStudentModalOpen(true);
            }}
          />

          {/* Institution-Specific Content Area */}
          <div className="flex-1 lg:pl-72 flex flex-col min-w-0 min-h-screen">
            <AdmissionNavbar
              collegeKey={collegeKey}
              setMobileOpen={setMobileOpen}
              title={
                subPage === "dashboard"
                  ? `${col.shortName} Admission Executive Dashboard`
                  : subPage === "roster"
                  ? `${col.shortName} Candidate Roster & Marksheets`
                  : subPage === "verification"
                  ? `${col.shortName} Document Verification Desk`
                  : "14-Digit Format Engine (KVCET Spec)"
              }
            />

            <main className="flex-1 p-4 sm:p-6 lg:p-8 w-full max-w-7xl mx-auto min-w-0">
              {subPage === "dashboard" && (
                <AdmissionDashboard
                  collegeKey={collegeKey}
                  onOpenNewStudentModal={() => {
                    setActiveModalCollege(collegeKey);
                    setIsNewStudentModalOpen(true);
                  }}
                  onOpenUpdateModal={(s) => setSelectedStudentForUpdate(s)}
                  onOpenAllotmentModal={(s) => setSelectedStudentForAllotment(s)}
                />
              )}

              {subPage === "roster" && (
                <StudentsAdmissionRoster
                  collegeKey={collegeKey}
                  onOpenNewStudentModal={() => {
                    setActiveModalCollege(collegeKey);
                    setIsNewStudentModalOpen(true);
                  }}
                  onOpenUpdateModal={(s) => setSelectedStudentForUpdate(s)}
                  onOpenAllotmentModal={(s) => setSelectedStudentForAllotment(s)}
                />
              )}

              {subPage === "verification" && (
                <VerificationDeskPage
                  collegeKey={collegeKey}
                  onOpenUpdateModal={(s) => setSelectedStudentForUpdate(s)}
                />
              )}

              {subPage === "reg-engine" && <EngineeringRegEnginePage />}
            </main>
          </div>
        </div>
      </AdmissionProtectedRoute>
    );
  };

  // Helper for root redirect based on authentication
  const RootRedirect: React.FC = () => {
    if (!isAuthenticated()) {
      return <Redirect to="/login" />;
    }
    const user = getCurrentAdmissionUser();
    if (user && user.collegeKey && COLLEGES[user.collegeKey]) {
      return <Redirect to={COLLEGES[user.collegeKey].portalPath} />;
    }
    return <Redirect to="/engineering" />;
  };

  return (
    <>
      <Switch>
        {/* Unified Authentication Login */}
        <Route path="/login" component={Login} />

        {/* 1. ENGINEERING ADMISSION CELL (KVCET - Code 01) */}
        <Route path="/engineering">
          {() => renderCellLayout("engineering", "dashboard")}
        </Route>
        <Route path="/engineering/roster">
          {() => renderCellLayout("engineering", "roster")}
        </Route>
        <Route path="/engineering/verification">
          {() => renderCellLayout("engineering", "verification")}
        </Route>
        <Route path="/engineering/reg-engine">
          {() => renderCellLayout("engineering", "reg-engine")}
        </Route>

        {/* 2. NURSING ADMISSION CELL (KVCN - Code 02) */}
        <Route path="/nursing">
          {() => renderCellLayout("nursing", "dashboard")}
        </Route>
        <Route path="/nursing/roster">
          {() => renderCellLayout("nursing", "roster")}
        </Route>
        <Route path="/nursing/verification">
          {() => renderCellLayout("nursing", "verification")}
        </Route>

        {/* 3. PHARMACY ADMISSION CELL (KVIPS - Code 03) */}
        <Route path="/pharmacy">
          {() => renderCellLayout("pharmacy", "dashboard")}
        </Route>
        <Route path="/pharmacy/roster">
          {() => renderCellLayout("pharmacy", "roster")}
        </Route>
        <Route path="/pharmacy/verification">
          {() => renderCellLayout("pharmacy", "verification")}
        </Route>

        {/* 4. EMERGING SCIENCES ADMISSION CELL (KVFES - Code 04) */}
        <Route path="/emerging-sciences">
          {() => renderCellLayout("emerging_sciences", "dashboard")}
        </Route>
        <Route path="/emerging-sciences/roster">
          {() => renderCellLayout("emerging_sciences", "roster")}
        </Route>
        <Route path="/emerging-sciences/verification">
          {() => renderCellLayout("emerging_sciences", "verification")}
        </Route>

        {/* Default / Fallback: Root Redirect */}
        <Route path="/" component={RootRedirect} />
        <Route component={RootRedirect} />
      </Switch>

      {/* Global Modals for Enrolling & Updating */}
      <StudentAdmissionModal
        fixedCollegeKey={activeModalCollege}
        isOpen={isNewStudentModalOpen}
        onClose={() => setIsNewStudentModalOpen(false)}
        onSuccess={() => {
          // Triggers re-renders via storage events
        }}
      />

      <UpdateStudentDataModal
        student={selectedStudentForUpdate}
        isOpen={!!selectedStudentForUpdate}
        onClose={() => setSelectedStudentForUpdate(null)}
        onUpdated={() => {
          // Refreshed
        }}
      />

      <AllotmentLetterModal
        student={selectedStudentForAllotment}
        isOpen={!!selectedStudentForAllotment}
        onClose={() => setSelectedStudentForAllotment(null)}
      />
    </>
  );
};

export default App;
