import { useEffect, useMemo, useState, useRef } from "react";
import { User, Lock, Camera, Save, Eye, EyeOff, Mail, Phone, MapPin, Calendar as CalendarIcon } from "lucide-react";
import type { PortalStudent } from "../../types";
import { toast } from "sonner";
import { apiAuthRequest, ApiRequestError, API_BASE_URL } from "@/lib/api";

interface Props {
  student: PortalStudent;
  onProfileUpdated?: (next: Partial<PortalStudent>) => void;
}

const StudentProfile = ({ student, onProfileUpdated }: Props) => {
  const [editing, setEditing] = useState(false);
  const [showPasswordForm, setShowPasswordForm] = useState(false);
  const [form, setForm] = useState({
    email: student.email ?? "",
    gender: student.gender ?? "",
    dob: student.dob ?? "",
    phone: student.phone ?? "",
    address: student.address ?? "",
  });
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

  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setForm({
      email: student.email ?? "",
      gender: student.gender ?? "",
      dob: student.dob ?? "",
      phone: student.phone ?? "",
      address: student.address ?? "",
    });
  }, [student.email, student.address, student.dob, student.gender, student.phone]);

  const studentCode = useMemo(
    () => student.admissionNo ?? `STU-${String(student.id).padStart(4, "0")}`,
    [student.admissionNo, student.id],
  );

  const handleSave = async () => {
    try {
      await apiAuthRequest("/students/me", {
        method: "PATCH",
        body: JSON.stringify({
          email: form.email,
          gender: form.gender,
          dob: form.dob,
          phone: form.phone,
          address: form.address,
        }),
      });
      onProfileUpdated?.({
        email: form.email,
        gender: form.gender,
        dob: form.dob,
        phone: form.phone,
        address: form.address,
      });
      setEditing(false);
      toast.success("Profile updated successfully!");
    } catch (error) {
      if (error instanceof ApiRequestError) {
        toast.error(error.message);
        return;
      }
      toast.error("Unable to update profile right now.");
    }
  };

  const handleAvatarUpload = async (file: File) => {
    setUploadingAvatar(true);
    try {
      const sigResponse = await fetch(`${API_BASE_URL}/files/upload-signature`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          folder: "student-avatars",
          resourceType: "image",
          allowedFormats: ["jpg", "jpeg", "png", "webp"],
        }),
      });

      if (!sigResponse.ok) throw new Error("Failed to get upload signature.");
      const sigData = (await sigResponse.json()) as {
        data: {
          signature: string;
          timestamp: number;
          cloudName: string;
          apiKey: string;
          folder: string;
        };
      };
      const { signature, timestamp, cloudName, apiKey, folder } = sigData.data;

      const formData = new FormData();
      formData.append("file", file);
      formData.append("api_key", apiKey);
      formData.append("timestamp", String(timestamp));
      formData.append("signature", signature);
      formData.append("folder", folder);
      formData.append("resource_type", "image");

      const uploadRes = await fetch(
        `https://api.cloudinary.com/v1_1/${cloudName}/image/upload`,
        { method: "POST", body: formData },
      );

      if (!uploadRes.ok) throw new Error("Upload to Cloudinary failed.");
      const uploadData = (await uploadRes.json()) as {
        secure_url: string;
      };

      const newAvatarUrl = uploadData.secure_url;

      await apiAuthRequest("/students/me", {
        method: "PATCH",
        body: JSON.stringify({ avatarUrl: newAvatarUrl }),
      });

      setAvatarPreview(newAvatarUrl);
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
    <div className="space-y-6 max-w-6xl mx-auto px-4 sm:px-6 py-8">
      {/* Profile Header Card */}
      <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
        <div className="flex flex-col sm:flex-row items-start sm:items-center gap-6 p-6">
          {/* Avatar Section */}
          <div className="relative group">
            <div className="h-24 w-24 rounded-full overflow-hidden bg-gradient-to-br from-primary/20 to-primary/5 flex items-center justify-center text-primary font-bold text-2xl ring-4 ring-background shadow-md">
              {uploadingAvatar ? (
                <div className="absolute inset-0 bg-black/50 flex items-center justify-center rounded-full">
                  <div className="h-6 w-6 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              ) : null}
              {avatarPreview || student.avatarUrl ? (
                <img
                  src={avatarPreview || student.avatarUrl}
                  alt="Profile"
                  className="h-full w-full object-cover"
                />
              ) : (
                <span className="text-3xl font-bold text-primary">
                  {student.name.charAt(0).toUpperCase()}
                </span>
              )}
            </div>

            <label className="absolute inset-0 rounded-full bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer backdrop-blur-sm">
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
                  e.target.value = "";
                }}
              />
            </label>
          </div>

          {/* Student Info */}
          <div className="flex-1">
            <h2 className="text-2xl font-bold text-foreground tracking-tight">{student.name}</h2>
            <p className="text-sm text-muted-foreground mt-1">Student ID: {studentCode}</p>
            <div className="flex flex-wrap gap-2 mt-3">
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-primary/15 text-primary">
                {student.grade}
              </span>
              <span className="px-3 py-1 rounded-full text-xs font-medium bg-success/15 text-success">
                {student.status}
              </span>
              {student.gender && (
                <span className="px-3 py-1 rounded-full text-xs font-medium bg-info/15 text-info">
                  {student.gender}
                </span>
              )}
            </div>
          </div>

          {/* Edit/Save Button */}
          <button
            onClick={() => {
              if (editing) {
                void handleSave();
                return;
              }
              setEditing(true);
            }}
            className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-primary text-primary-foreground text-sm font-medium hover:bg-primary/90 transition-all shadow-sm hover:shadow-md"
          >
            {editing ? <Save className="h-4 w-4" /> : <User className="h-4 w-4" />}
            {editing ? "Save Changes" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Two Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Personal Information (Read-only) */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Personal Information
            </h3>
          </div>
          <div className="p-5 space-y-3">
            {[
              { label: "Full Name", value: student.name, icon: User },
              { label: "Student ID", value: studentCode, icon: User },
              { label: "Grade", value: student.grade, icon: User },
              { label: "Status", value: student.status, icon: User },
              { label: "Guardian", value: student.guardian, icon: User },
              { label: "Guardian Phone", value: student.guardianPhone, icon: Phone },
            ].map((item) => (
              <div key={item.label} className="flex items-center justify-between gap-4 group">
                <div className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                <span className="text-sm text-foreground font-medium text-right truncate max-w-[200px]">
                  {item.value || "—"}
                </span>
              </div>
            ))}
          </div>
        </div>

        {/* Editable Profile Information + Password */}
        <div className="rounded-2xl bg-card border border-border/60 shadow-sm overflow-hidden transition-all hover:shadow-md">
          <div className="px-5 py-4 border-b border-border/60 bg-muted/10">
            <h3 className="font-semibold text-foreground flex items-center gap-2">
              <User className="h-4 w-4 text-primary" /> Editable Information
            </h3>
          </div>
          <div className="p-5 space-y-4">
            {/* Editable fields */}
            {[
              { label: "Email", value: form.email, key: "email" as const, icon: Mail, type: "email" },
              { label: "Gender", value: form.gender, key: "gender" as const, icon: User, type: "text" },
              { label: "Date of Birth", value: form.dob, key: "dob" as const, icon: CalendarIcon, type: "date" },
              { label: "Phone", value: form.phone, key: "phone" as const, icon: Phone, type: "tel" },
              { label: "Address", value: form.address, key: "address" as const, icon: MapPin, type: "text" },
            ].map((item) => (
              <div key={item.label} className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <item.icon className="h-3.5 w-3.5 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">{item.label}</span>
                </div>
                {editing ? (
                  <input
                    type={item.type}
                    value={form[item.key]}
                    onChange={(e) => setForm({ ...form, [item.key]: e.target.value })}
                    className="text-sm text-foreground bg-muted/30 border border-border rounded-lg px-3 py-1.5 w-full sm:w-64 outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all"
                  />
                ) : (
                  <span className="text-sm text-foreground font-medium truncate max-w-[200px] sm:max-w-none">
                    {form[item.key] || "—"}
                  </span>
                )}
              </div>
            ))}

            <div className="pt-2 text-xs text-muted-foreground border-t border-border/50 mt-4">
              <p>Enrollment details like name, ID, class, guardian, and guardian phone are managed by the admin.</p>
            </div>

            {/* Password Section */}
            <div className="pt-2 border-t border-border/50">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-foreground flex items-center gap-2">
                  <Lock className="h-4 w-4 text-warning" /> Password
                </h3>
                <button
                  onClick={() => setShowPasswordForm(!showPasswordForm)}
                  className="text-xs text-primary hover:underline transition-colors"
                >
                  {showPasswordForm ? "Cancel" : "Change Password"}
                </button>
              </div>
              {showPasswordForm && (
                <div className="space-y-3 mt-3">
                  {[
                    { label: "Current Password", key: "current" as const },
                    { label: "New Password", key: "newPass" as const },
                    { label: "Confirm Password", key: "confirm" as const },
                  ].map((field) => (
                    <div key={field.key} className="relative">
                      <input
                        type={showPasswords[field.key as keyof typeof showPasswords] ? "text" : "password"}
                        placeholder={field.label}
                        value={passwordForm[field.key]}
                        onChange={(e) =>
                          setPasswordForm({
                            ...passwordForm,
                            [field.key]: e.target.value,
                          })
                        }
                        className="w-full text-sm bg-muted/30 border border-border rounded-lg px-3 py-2 text-foreground outline-none focus:border-primary focus:ring-1 focus:ring-primary/30 transition-all placeholder:text-muted-foreground pr-10"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords(prev => ({ ...prev, [field.key]: !prev[field.key as keyof typeof prev] }))}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      >
                        {showPasswords[field.key as keyof typeof showPasswords] ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                      </button>
                    </div>
                  ))}
                  <button
                    onClick={() => { void handlePasswordUpdate(); }}
                    className="w-full py-2 bg-warning text-warning-foreground rounded-lg text-sm font-medium hover:bg-warning/90 transition-all shadow-sm mt-2"
                  >
                    Update Password
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;