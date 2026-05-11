import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { ThemeProvider } from "@/components/theme-provider";
import Login from "./pages/Login";
import AdminPortal from "./pages/AdminPortal";
import StudentPortal from "./pages/StudentPortal";
import TeacherPortal from "./pages/TeacherPortal";
import NotFound from "./pages/NotFound";
import { AuthProvider } from "@/hooks/use-auth";
import RequireAuth from "@/components/RequireAuth";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        {/*
          BrowserRouter wraps AuthProvider so that useNavigate/useLocation
          are available inside the auth context. This prevents the need for
          window.location.replace() and enables clean React-controlled redirects.
        */}
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
          }}
        >
          <AuthProvider>
            <Routes>
              <Route path="/" element={<Login />} />
              <Route path="/admin" element={<Navigate to="/admin/dashboard" replace />} />
              <Route
                path="/admin/:section"
                element={
                  <RequireAuth allowedRoles={["admin"]}>
                    <AdminPortal />
                  </RequireAuth>
                }
              />
              <Route path="/student" element={<Navigate to="/student/dashboard" replace />} />
              <Route
                path="/student/:section"
                element={
                  <RequireAuth allowedRoles={["student"]}>
                    <StudentPortal />
                  </RequireAuth>
                }
              />
              <Route path="/teacher" element={<Navigate to="/teacher/dashboard" replace />} />
              <Route
                path="/teacher/:section/:classId/materials"
                element={
                  <RequireAuth allowedRoles={["teacher"]}>
                    <TeacherPortal />
                  </RequireAuth>
                }
              />
              <Route
                path="/teacher/:section/:classId/materials/:courseId"
                element={
                  <RequireAuth allowedRoles={["teacher"]}>
                    <TeacherPortal />
                  </RequireAuth>
                }
              />
              <Route
                path="/teacher/:section"
                element={
                  <RequireAuth allowedRoles={["teacher"]}>
                    <TeacherPortal />
                  </RequireAuth>
                }
              />
              <Route path="*" element={<NotFound />} />
            </Routes>
          </AuthProvider>
        </BrowserRouter>
      </TooltipProvider>
    </ThemeProvider>
  </QueryClientProvider>
);

export default App;
