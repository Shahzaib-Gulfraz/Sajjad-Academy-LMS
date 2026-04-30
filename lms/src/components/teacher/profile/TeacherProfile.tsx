import { useEffect, useRef, useState } from "react";
import { User, Lock, Camera, Save, BookOpen, Eye, EyeOff, Loader2 } from "lucide-react";
import type { Teacher } from "@/types/domain";
import { toast } from "sonner";
import { apiAuthRequest, ApiRequestError } from "@/lib/api";
import { uploadImageToCloudinary } from "@/lib/cloudinary-upload";

interface Props {
  teacher: Teacher;
  onProfileUpdated?: (next: Partial<Teacher>) => void;
}

const TeacherProfile = ({ teacher, onProfileUpdated }: Props) => {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    phone: teacher.phone ?? "",
    address: teacher.address ?? "",
    dob: teacher.dob ?? "",
    emergencyContact: teacher.emergencyContact ?? "",
    emergencyPhone: teacher.emergencyPhone ?? "",
  });

  // avatarUrl: prefer the persisted Cloudinary URL, fall back to local preview
  const [avatarUrl, setAvatarUrl] = useState<string>(teacher.avatarUrl ?? "");
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    current: "",
    newPass: "",
    confirm: "",
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    newPass: false,
    confirm: false,
  });

  useEffect(() => {
    setForm({
      phone: teacher.phone ?? "",
      address: teacher.address ?? "",
      dob: teacher.dob ?? "",
      emergencyContact: teacher.emergencyContact ?? "",
      emergencyPhone: teacher.emergencyPhone ?? "",
    });
    setAvatarUrl(teacher.avatarUrl ?? "");
  }, [teacher]);

  const handleSave = async () => {
    try {
      await apiAuthRequest("/teachers/me", {
        method: "PATCH",
        body: JSON.stringify({
          phone: form.phone,
          address: form.address,
          dob: form.dob,
          emergencyContact: form.emergencyContact,
          emergencyPhone: form.emergencyPhone,
        }),
      });
      onProfileUpdated?.({
        phone: form.phone,
        address: form.address,
        dob: form.dob,
        emergencyContact: form.emergencyContact,
        emergencyPhone: form.emergencyPhone,
      });
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Unable to update profile.");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const uploadData = await uploadImageToCloudinary(file, "teacher-avatars");
      const newAvatarUrl = uploadData.secureUrl;

      // Save to backend
      await apiAuthRequest("/teachers/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: newAvatarUrl }),
      });

      setAvatarUrl(newAvatarUrl);
      onProfileUpdated?.({ avatarUrl: newAvatarUrl });
      toast.success("Profile picture updated!");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "Failed to upload profile picture.");
    } finally {
      setUploadingAvatar(false);
    }
  };

  const handlePasswordUpdate = async () => {
    if (!passwordForm.current || !passwordForm.newPass || !passwordForm.confirm) {
      toast.error("Please fill in all password fields");
      return;
    }
    if (passwordForm.newPass !== passwordForm.confirm) {
      toast.error("New password and confirmation do not match");
      return;
    }
    if (passwordForm.newPass === passwordForm.current) {
      toast.error("New password must be different from current password");
      return;
    }

    try {
      await apiAuthRequest("/auth/change-password", {
        method: "POST",
        body: JSON.stringify({
          currentPassword: passwordForm.current,
          newPassword: passwordForm.newPass,
        }),
      });
      toast.success("Password changed successfully!");
      setShowPasswordForm(false);
      setPasswordForm({ current: "", newPass: "", confirm: "" });
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message);
      } else {
        toast.error("Failed to change password. Please check your current password.");
      }
    }
  };

  return (
    <div>
      <h1 className="text-2xl font-bold text-foreground mb-6">My Profile</h1>

      {/* Header */}
      <div className="bg-card border border-border rounded-xl p-6 mb-6">
        <div className="flex flex-col sm:flex-row items-start gap-6">
          <div className="relative group">
            <div className="h-24 w-24 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold text-2xl overflow-hidden">
              {uploadingAvatar ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <Loader2 className="h-6 w-6 text-white animate-spin" />
                </div>
              ) : null}
              {avatarUrl ? (
                <img
                  src={avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover rounded-full"
                />
              ) : (
                teacher.avatar
              )}
            </div>

            {/* Upload overlay */}
            <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer">
              <Camera className="h-6 w-6 text-white" />
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (!file) return;
                  void handleAvatarUpload(file);
                  // reset so same file can be re-selected
                  e.target.value = "";
                }}
              />
            </label>
          </div>
          <div className="flex-1">
            <h2 className="text-xl font-bold text-foreground">
              {teacher.name}
            </h2>
            <p className="text-sm text-muted-foreground mt-1">
              Employee No: {teacher.employeeNo ?? teacher.backendId ?? String(teacher.id)}
            </p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary">
                {teacher.subject}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                {teacher.classes.join(", ")}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-info/15 text-info">
                {teacher.qualification}
              </span>
            </div>
          </div>
          <button
            onClick={() => (editing ? handleSave() : setEditing(true))}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
          >
            {editing ? (
              <Save className="h-4 w-4" />
            ) : (
              <User className="h-4 w-4" />
            )}
            {editing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6">
        {/* Personal Info */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <User className="h-4 w-4 text-primary" /> Personal Information
          </h3>
          <div className="space-y-3">
            {[
              {
                label: "Full Name",
                value: teacher.name,
              },
              {
                label: "Employee No",
                value: teacher.employeeNo ?? teacher.backendId ?? String(teacher.id),
              },
              { label: "Gender", value: teacher.gender || "Not set" },
              {
                label: "Email",
                value: teacher.email,
              },
              {
                label: "Qualification",
                value: teacher.qualification,
              },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-start justify-between gap-4"
              >
                <span className="text-sm text-muted-foreground whitespace-nowrap">
                  {item.label}
                </span>
                <span className="text-sm text-foreground text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Professional Info + Password */}
        <div className="bg-card border border-border rounded-xl p-5">
          <h3 className="font-semibold text-foreground mb-4 flex items-center gap-2">
            <BookOpen className="h-4 w-4 text-primary" /> Professional
            Information
          </h3>
          <div className="space-y-3">
            {[
              { label: "Subject", value: teacher.subject },
              { label: "Classes", value: teacher.classes.join(", ") || "Not assigned" },
              { label: "Status", value: teacher.status || "Active" },
            ].map((item) => (
              <div
                key={item.label}
                className="flex items-center justify-between gap-4"
              >
                <span className="text-sm text-muted-foreground">
                  {item.label}
                </span>
                <span className="text-sm text-foreground text-right">
                  {item.value}
                </span>
              </div>
            ))}
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <h4 className="mb-3 font-semibold text-foreground">Editable Contact Information</h4>
            <div className="space-y-3">
              {[
                { label: "Phone", key: "phone" as const, value: form.phone },
                { label: "Date of Birth", key: "dob" as const, value: form.dob },
                { label: "Address", key: "address" as const, value: form.address },
                {
                  label: "Emergency Contact",
                  key: "emergencyContact" as const,
                  value: form.emergencyContact,
                },
                {
                  label: "Emergency Phone",
                  key: "emergencyPhone" as const,
                  value: form.emergencyPhone,
                },
              ].map((item) => (
                <div key={item.label} className="flex items-center justify-between gap-4">
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                  {editing ? (
                    <input
                      value={form[item.key]}
                      type={item.key === "dob" ? "date" : "text"}
                      onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                      className="text-sm text-foreground text-right bg-muted/50 border border-border rounded px-2 py-1 w-48 outline-none focus:border-primary"
                    />
                  ) : (
                    <span className="text-sm text-foreground text-right">
                      {item.value || "-"}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Enrollment details like name, employee number, email, qualification, subjects, and assigned classes are managed by the admin.
          </div>
        </div>
      </div>

      {/* Password Section */}
      <div className="bg-card border border-border rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground flex items-center gap-2">
            <Lock className="h-4 w-4 text-primary" /> Security
          </h3>
          {!showPasswordForm && (
            <button
              onClick={() => setShowPasswordForm(true)}
              className="flex items-center gap-2 px-3 py-2 rounded-lg bg-primary/10 text-primary text-sm font-medium hover:bg-primary/20 transition-colors"
            >
              <Lock className="h-4 w-4" />
              Change Password
            </button>
          )}
        </div>

        {showPasswordForm ? (
          <div className="space-y-3">
            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Current Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.current ? "text" : "password"}
                  value={passwordForm.current}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, current: e.target.value })
                  }
                  placeholder="Enter current password"
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      current: !showPasswords.current,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.current ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.newPass ? "text" : "password"}
                  value={passwordForm.newPass}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, newPass: e.target.value })
                  }
                  placeholder="Enter new password"
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      newPass: !showPasswords.newPass,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.newPass ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm text-muted-foreground block mb-1">
                Confirm New Password
              </label>
              <div className="relative">
                <input
                  type={showPasswords.confirm ? "text" : "password"}
                  value={passwordForm.confirm}
                  onChange={(e) =>
                    setPasswordForm({ ...passwordForm, confirm: e.target.value })
                  }
                  placeholder="Confirm new password"
                  className="w-full bg-muted/50 border border-border rounded-lg px-3 py-2 text-sm text-foreground outline-none focus:border-primary"
                />
                <button
                  onClick={() =>
                    setShowPasswords({
                      ...showPasswords,
                      confirm: !showPasswords.confirm,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPasswords.confirm ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={handlePasswordUpdate}
                className="flex-1 px-4 py-2 rounded-lg bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-colors"
              >
                Update Password
              </button>
              <button
                onClick={() => {
                  setShowPasswordForm(false);
                  setPasswordForm({ current: "", newPass: "", confirm: "" });
                }}
                className="flex-1 px-4 py-2 rounded-lg bg-muted text-foreground text-sm font-medium hover:bg-muted/80 transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">
            Keep your account secure by changing your password regularly.
          </p>
        )}
      </div>
    </div>
  );
};

export default TeacherProfile;
