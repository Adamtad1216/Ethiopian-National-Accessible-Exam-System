import { Suspense, lazy } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import {
  BrowserRouter,
  Route,
  Routes,
  Navigate,
  useLocation,
} from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { Toaster } from "@/components/ui/toaster";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider, useAuth } from "@/contexts/AuthContext";
import { ConfirmationProvider } from "@/contexts/ConfirmationContext";
import { ConfirmationModal } from "@/components/ConfirmationModal";

const PortalSelectPage = lazy(() => import("./pages/PortalSelectPage"));
const StudentPortalAuthPage = lazy(
  () => import("./pages/StudentPortalAuthPage"),
);
const StaffLoginPage = lazy(() => import("./pages/StaffLoginPage"));
const DashboardLayout = lazy(
  () => import("./components/layouts/DashboardLayout"),
);

// Admin pages
const AdminDashboard = lazy(() => import("./pages/admin/AdminDashboard"));
const AdminUsers = lazy(() => import("./pages/admin/AdminUsers"));
const AdminApprovals = lazy(() => import("./pages/admin/AdminApprovals"));
const AdminAudit = lazy(() => import("./pages/admin/AdminAudit"));
const AdminBulkImport = lazy(() => import("./pages/admin/AdminBulkImport"));
const AdminSettings = lazy(() => import("./pages/admin/AdminSettings"));

// Examiner pages
const ExaminerDashboard = lazy(
  () => import("./pages/examiner/ExaminerDashboard"),
);
const ExaminerExams = lazy(() => import("./pages/examiner/ExaminerExams"));
const CreateExamPage = lazy(() => import("./pages/examiner/CreateExamPage"));
const ExaminerQuestions = lazy(
  () => import("./pages/examiner/ExaminerQuestions"),
);
const ExaminerResults = lazy(() => import("./pages/examiner/ExaminerResults"));
const ExaminerMonitor = lazy(() => import("./pages/examiner/ExaminerMonitor"));

// Student pages
const StudentDashboard = lazy(() => import("./pages/student/StudentDashboard"));
const StudentExams = lazy(() => import("./pages/student/StudentExams"));
const StudentResults = lazy(() => import("./pages/student/StudentResults"));
const StudentResultReview = lazy(
  () => import("./pages/student/StudentResultReview"),
);
const ExamPlayer = lazy(() => import("./pages/student/ExamPlayer"));

const NotFound = lazy(() => import("./pages/NotFound"));

const queryClient = new QueryClient();
const portalMode = import.meta.env.VITE_PORTAL_MODE as
  | "student"
  | "staff"
  | undefined;

const isStudentMode = portalMode === "student";
const isStaffMode = portalMode === "staff";

function AnimatedRoutes() {
  const location = useLocation();

  return (
    <AnimatePresence mode="wait">
      <motion.div
        key={location.pathname}
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -8 }}
        transition={{ duration: 0.2, ease: "easeOut" }}
      >
        <Suspense
          fallback={
            <div className="flex items-center justify-center min-h-screen">
              <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
            </div>
          }
        >
          <Routes location={location}>
            <Route
              path="/portal"
              element={
                isStudentMode ? (
                  <Navigate to="/portal/student" />
                ) : isStaffMode ? (
                  <Navigate to="/portal/staff" />
                ) : (
                  <PortalSelectPage />
                )
              }
            />
            <Route
              path="/portal/student"
              element={
                isStaffMode ? (
                  <Navigate to="/portal/staff" />
                ) : (
                  <StudentPortalAuthPage />
                )
              }
            />
            <Route
              path="/portal/staff"
              element={
                isStudentMode ? (
                  <Navigate to="/portal/student" />
                ) : (
                  <StaffLoginPage />
                )
              }
            />
            <Route path="/login" element={<Navigate to="/portal/staff" />} />
            <Route path="/" element={<AuthRedirect />} />

            {/* Admin routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/admin" element={<AdminDashboard />} />
              <Route path="/admin/users" element={<AdminUsers />} />
              <Route path="/admin/approvals" element={<AdminApprovals />} />
              <Route path="/admin/audit" element={<AdminAudit />} />
              <Route path="/admin/bulk-import" element={<AdminBulkImport />} />
              <Route
                path="/admin/system-settings"
                element={<AdminSettings />}
              />
              <Route path="/admin/settings" element={<AdminSettings />} />
            </Route>

            {/* Examiner routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/examiner" element={<ExaminerDashboard />} />
              <Route path="/examiner/exams" element={<ExaminerExams />} />
              <Route
                path="/examiner/exams/create"
                element={<CreateExamPage />}
              />
              <Route
                path="/examiner/questions"
                element={<ExaminerQuestions />}
              />
              <Route path="/examiner/results" element={<ExaminerResults />} />
              <Route path="/examiner/monitor" element={<ExaminerMonitor />} />
            </Route>

            {/* Student routes */}
            <Route element={<DashboardLayout />}>
              <Route path="/student" element={<StudentDashboard />} />
              <Route path="/student/exams" element={<StudentExams />} />
              <Route path="/student/results" element={<StudentResults />} />
              <Route
                path="/student/results/:examId"
                element={<StudentResultReview />}
              />
            </Route>

            {/* Exam player - full screen, no sidebar */}
            <Route path="/student/exam/:examId" element={<ExamPlayer />} />

            <Route path="*" element={<NotFound />} />
          </Routes>
        </Suspense>
      </motion.div>
    </AnimatePresence>
  );
}

function AuthRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  if (isLoading)
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin h-8 w-8 border-4 border-primary border-t-transparent rounded-full" />
      </div>
    );
  if (!isAuthenticated || !user) {
    if (isStudentMode) return <Navigate to="/portal/student" />;
    if (isStaffMode) return <Navigate to="/portal/staff" />;
    return <Navigate to="/portal" />;
  }
  switch (user.role) {
    case "admin":
      return <Navigate to="/admin" />;
    case "examiner":
      return <Navigate to="/examiner" />;
    case "student":
      return <Navigate to="/student" />;
    default:
      return <Navigate to="/portal" />;
  }
}

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <ConfirmationProvider>
        <TooltipProvider>
          <Toaster />
          <Sonner />
          <ConfirmationModal />
          <BrowserRouter>
            <AnimatedRoutes />
          </BrowserRouter>
        </TooltipProvider>
      </ConfirmationProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
