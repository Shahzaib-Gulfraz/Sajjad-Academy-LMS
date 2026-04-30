
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";
import { useAuth } from "@/hooks/use-auth";
import { backendRoleToAppRole, defaultPathByRole } from "@/lib/auth";
import { apiRequest } from "@/lib/api";
import loginBg from "@/assets/login-bg.jpg";
import { GraduationCap, User, Lock, ChevronRight, Eye, EyeOff } from "lucide-react";

const Login = () => {
  const [identifier, setIdentifier] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotId, setForgotId] = useState("");
  const navigate = useNavigate();
  const { login, session } = useAuth();

  useEffect(() => {
    if (!session?.user?.role) return;
    const userRole = backendRoleToAppRole(session.user.role);
    navigate(defaultPathByRole(userRole), { replace: true });
  }, [navigate, session]);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!identifier.trim() || !password.trim()) {
      toast.error("User ID and password are required.");
      return;
    }
    setIsSubmitting(true);
    try {
      const nextSession = await login(identifier.trim(), password);
      const backendRole = backendRoleToAppRole(nextSession.user.role);
      navigate(defaultPathByRole(backendRole), { replace: true });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to login right now.";
      toast.error(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const value = forgotId.trim();
    if (!value) {
      toast.error("Enter your ID");
      return;
    }
    try {
      await apiRequest<{ queued: boolean; requestedAt: string }>(
        "/auth/password-reset-request",
        {
          method: "POST",
          body: JSON.stringify({ identifier: value }),
        },
      );
      toast.success("Password reset request sent to admin.");
      setForgotId("");
      setForgotOpen(false);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Unable to request password reset.";
      toast.error(message);
    }
  };

  return (
    <div className="flex h-screen bg-gradient-to-br from-background via-card to-primary/5">
      {/* Left Panel - Gradient Background */}
      <div className="hidden lg:flex lg:w-[55%] relative flex-col justify-between p-12 overflow-hidden bg-gradient-to-br from-primary/5 via-primary/10 to-transparent">
        {/* Animated background elements */}
        <div className="absolute inset-0">
          <div className="absolute top-20 left-10 h-72 w-72 bg-primary/10 rounded-full blur-3xl opacity-40 animate-pulse-subtle" />
          <div className="absolute bottom-32 right-10 h-80 w-80 bg-accent/5 rounded-full blur-3xl opacity-30 animate-pulse-subtle" style={{animationDelay: '1s'}} />
        </div>

        <div className="relative z-10 animate-fade-in">
          <div className="flex items-center gap-3 mb-3">
            <div className="p-2 rounded-xl bg-primary/10">
              <GraduationCap className="h-8 w-8 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">ASAS Academy</h1>
              <p className="text-xs text-primary font-medium">Learning Management</p>
            </div>
          </div>
        </div>

        <div className="relative z-10 max-w-lg animate-slide-up" style={{animationDelay: '0.1s'}}>
          <blockquote className="text-4xl font-light text-foreground leading-relaxed">
            "Education is the most powerful weapon which you can use to change
            the world."
          </blockquote>
          <div className="mt-6 flex items-center gap-2">
            <div className="h-1 w-12 bg-primary rounded-full" />
            <p className="text-primary font-semibold">Nelson Mandela</p>
          </div>
        </div>

      </div>

      {/* Right Panel - Login Form */}
      <div className="flex-1 flex flex-col items-center justify-center p-6 sm:p-8 lg:p-12 animate-fade-in">
        <div className="w-full max-w-md">
          {/* Mobile Header */}
          <div className="lg:hidden mb-10 animate-slide-down">
            <div className="flex items-center gap-3 mb-2">
              <div className="p-2 rounded-lg bg-primary/10">
                <GraduationCap className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-foreground">ASAS Academy</h1>
                <p className="text-xs text-primary font-medium">LMS</p>
              </div>
            </div>
          </div>

          {/* Form Header */}
          <div className="mb-8 animate-slide-down" style={{animationDelay: '0.05s'}}>
            <h2 className="text-3xl sm:text-4xl font-bold text-foreground mb-3">
              Welcome back
            </h2>
            <p className="text-muted-foreground text-sm sm:text-base">
              Sign in to access your learning dashboard
            </p>
          </div>

          {/* Login Form */}
          <form onSubmit={handleLogin} className="space-y-5 animate-slide-up" style={{animationDelay: '0.1s'}}>
            {/* User ID Input */}
            <div className="group">
              <label className="input-label">User ID</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <User className="h-5 w-5" />
                </div>
                <input
                  type="text"
                  value={identifier}
                  onChange={(e) => setIdentifier(e.target.value)}
                  placeholder="Enter your ID (e.g., Stu-0001, Ta-0001)"
                  className="input-modern pl-12 py-3 text-sm"
                />
              </div>
              <p className="input-hint">Student ID, Teacher ID, or Email</p>
            </div>

            {/* Password Input */}
            <div className="group">
              <label className="input-label">Password</label>
              <div className="relative">
                <div className="absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground group-focus-within:text-primary transition-colors">
                  <Lock className="h-5 w-5" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="input-modern pl-12 pr-12 py-3 text-sm"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5" />
                  ) : (
                    <Eye className="h-5 w-5" />
                  )}
                </button>
              </div>
            </div>

            {/* Remember Me & Forgot Password */}
            <div className="flex items-center justify-between text-sm">
              <label className="flex items-center gap-2 text-muted-foreground cursor-pointer hover:text-foreground transition-colors">
                <input
                  type="checkbox"
                  className="w-4 h-4 rounded border-border accent-primary cursor-pointer"
                />
                <span>Remember me</span>
              </label>
              <button
                type="button"
                onClick={() => setForgotOpen(true)}
                className="text-primary hover:text-primary/80 font-medium transition-colors"
              >
                Forgot password?
              </button>
            </div>

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-3 mt-6 bg-primary text-primary-foreground font-semibold rounded-xl hover:shadow-lg hover:-translate-y-0.5 transition-all duration-200 flex items-center justify-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isSubmitting ? (
                <>
                  <div className="h-4 w-4 border-2 border-primary-foreground/30 border-t-primary-foreground rounded-full animate-spin" />
                  Signing in...
                </>
              ) : (
                <>
                  Sign In
                  <ChevronRight className="h-4 w-4" />
                </>
              )}
            </button>
          </form>

          {/* Footer */}
          <p className="mt-8 text-center text-xs text-muted-foreground">
            © 2026 ASAS Academy. All rights reserved.
          </p>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {forgotOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4 animate-fade-in">
          <div className="w-full max-w-md rounded-2xl border border-border bg-card p-7 shadow-xl animate-scale">
            <div className="mb-6">
              <h3 className="text-2xl font-bold text-foreground">
                Reset Password
              </h3>
              <p className="text-sm text-muted-foreground mt-2">
                Enter your ID to send a password reset request to the admin
              </p>
            </div>
            <form onSubmit={handleForgotSubmit} className="space-y-4">
              <div>
                <label className="input-label">Your ID</label>
                <input
                  value={forgotId}
                  onChange={(e) => setForgotId(e.target.value)}
                  placeholder="Stu-0001 or Ta-0001"
                  className="input-modern py-2.5"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setForgotOpen(false)}
                  className="btn-outline px-5 py-2.5"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary px-5 py-2.5"
                >
                  Send Request
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default Login;
