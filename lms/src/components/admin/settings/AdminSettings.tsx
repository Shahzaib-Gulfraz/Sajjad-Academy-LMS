import { useEffect, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Lock, Eye, EyeOff, Loader2 } from "lucide-react";
import { apiAuthRequest, ApiRequestError } from "@/lib/api";
import { backendRoleToAppRole, saveAuthSession } from "@/lib/auth";

type ProfileUser = {
  id: string;
  systemId?: string;
  name: string;
  email: string;
  role: "ADMIN" | "TEACHER" | "STUDENT";
  isActive: boolean;
};

const AdminSettings = () => {
  const { logout, session } = useAuth();
  const { toast } = useToast();
  const [isUpdatingName, setIsUpdatingName] = useState(false);
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [systemId, setSystemId] = useState(session?.user.systemId ?? "");
  
  const [formData, setFormData] = useState({
    currentPassword: "",
    newPassword: "",
    confirmPassword: "",
  });

  useEffect(() => {
    setSystemId(session?.user.systemId ?? "");
  }, [session?.user.systemId]);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (formData.newPassword !== formData.confirmPassword) {
      toast({
        title: "Error",
        description: "New password and confirmation do not match.",
        variant: "destructive",
      });
      return;
    }

    if (formData.newPassword.length < 8) {
      toast({
        title: "Error",
        description: "New password must be at least 8 characters long.",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      await apiAuthRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: formData.currentPassword,
          newPassword: formData.newPassword,
        }),
      });

      toast({
        title: "Success",
        description: "Password changed successfully. You will be logged out now.",
      });

      // Clear form
      setFormData({
        currentPassword: "",
        newPassword: "",
        confirmPassword: "",
      });
      
      // Delay to let the toast show up
      setTimeout(() => {
        logout();
      }, 1500);

    } catch (error: unknown) {
      const description =
        error instanceof ApiRequestError
          ? error.message
          : "Failed to change password. Please check your current password.";

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUpdateName = async (e: React.FormEvent) => {
    e.preventDefault();

    const nextId = systemId.trim();
    if (nextId.length < 3) {
      toast({
        title: "Error",
        description: "User ID must be at least 3 characters long.",
        variant: "destructive",
      });
      return;
    }

    if (nextId === (session?.user.systemId ?? "")) {
      toast({
        title: "No Changes",
        description: "User ID is already up to date.",
      });
      return;
    }

    setIsUpdatingName(true);
    try {
      const updatedUser = await apiAuthRequest<ProfileUser>("/users/me/identity", {
        method: "PATCH",
        body: JSON.stringify({ systemId: nextId }),
      });

      if (session) {
        const nextSession = saveAuthSession({
          user: {
            ...session.user,
            systemId: updatedUser.systemId ?? session.user.systemId,
          },
          expiresAt: session.expiresAt,
        });

        if (typeof window !== "undefined") {
          window.dispatchEvent(
            new CustomEvent("lms:session-refreshed", {
              detail: {
                role: backendRoleToAppRole(nextSession.user.role),
                session: nextSession,
              },
            }),
          );
        }
      }

      toast({
        title: "Success",
        description: "User ID updated successfully.",
      });
    } catch (error: unknown) {
      const description =
        error instanceof ApiRequestError
          ? error.message
          : "Failed to update User ID.";

      toast({
        title: "Error",
        description,
        variant: "destructive",
      });
    } finally {
      setIsUpdatingName(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-2xl flex items-center gap-2">
            <Lock className="w-6 h-6 text-primary" />
            Security Settings
          </CardTitle>
          <CardDescription>
            Change your password. This will log you out of all active sessions.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleUpdateName} className="space-y-4 pb-6 border-b border-border mb-6">
            <div className="space-y-2">
              <Label htmlFor="systemId">User ID</Label>
              <Input
                id="systemId"
                name="systemId"
                value={systemId}
                onChange={(e) => setSystemId(e.target.value)}
                required
              />
            </div>

            <Button
              type="submit"
              className="w-full"
              disabled={isUpdatingName}
            >
              {isUpdatingName ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating User ID...
                </>
              ) : (
                "Update User ID"
              )}
            </Button>
          </form>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="currentPassword">Current Password</Label>
              <div className="relative">
                <Input
                  id="currentPassword"
                  name="currentPassword"
                  type={showCurrentPassword ? "text" : "password"}
                  value={formData.currentPassword}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                >
                  {showCurrentPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="relative">
                <Input
                  id="newPassword"
                  name="newPassword"
                  type={showNewPassword ? "text" : "password"}
                  value={formData.newPassword}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                >
                  {showNewPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword">Confirm New Password</Label>
              <div className="relative">
                <Input
                  id="confirmPassword"
                  name="confirmPassword"
                  type={showConfirmPassword ? "text" : "password"}
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  required
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full mt-6"
              disabled={isSubmitting}
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Updating Password...
                </>
              ) : (
                "Update Password"
              )}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminSettings;
