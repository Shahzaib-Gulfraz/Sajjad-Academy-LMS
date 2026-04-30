import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { useState, useRef, useEffect } from "react";
import { Bell, ClipboardList, Megaphone, X, CheckCheck } from "lucide-react";
import type { PortalStudent } from "../../types";
import { apiAuthRequest } from "@/lib/api";

interface Notification {
  id: string;
  title: string;
  description: string;
  type: "assignment" | "announcement";
  date: string;
  read: boolean;
  targetNav: string;
}

interface Props {
  student: PortalStudent;
  onNavigate: (nav: string) => void;
}

const NotificationBell = ({ student, onNavigate }: Props) => {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  const { data: notifications = [] } = useQuery({
    queryKey: ["student-notifications", student.id, student.grade],
    queryFn: async () => {
      const query = `/notifications?classGrade=${encodeURIComponent(student.grade)}${
        student.id ? `&studentId=${encodeURIComponent(student.id)}` : ""
      }`;
      return apiAuthRequest<Notification[]>(query);
    },
    enabled: !!student.grade,
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const readMutation = useMutation({
    mutationFn: async (notificationId: string) => {
      await apiAuthRequest("/notifications/read", {
        method: "PATCH",
        body: JSON.stringify({ notificationId }),
      });
    },
    onSuccess: (_, notificationId) => {
      queryClient.setQueryData<Notification[]>(
        ["student-notifications", student.id, student.grade],
        (old) =>
          old?.map((n) => (n.id === notificationId ? { ...n, read: true } : n)),
      );
    },
  });

  const readAllMutation = useMutation({
    mutationFn: async (notificationIds: string[]) => {
      await apiAuthRequest("/notifications/read-all", {
        method: "PATCH",
        body: JSON.stringify({ notificationIds }),
      });
    },
    onSuccess: () => {
      queryClient.setQueryData<Notification[]>(
        ["student-notifications", student.id, student.grade],
        (old) => old?.map((n) => ({ ...n, read: true })),
      );
    },
  });

  const handleNotifClick = (notif: Notification) => {
    if (!notif.read) {
      readMutation.mutate(notif.id);
    }
    onNavigate(notif.targetNav);
    setOpen(false);
  };

  const markAllRead = () => {
    const unreadIds = notifications.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length > 0) {
      readAllAllMutation.mutate(unreadIds);
    }
  };

  const readAllAllMutation = readAllMutation;

  return (
    <div className="relative" ref={ref}>
      <button
        onClick={() => setOpen(!open)}
        className="relative p-1.5 rounded-full text-muted-foreground hover:text-foreground hover:bg-muted/30 transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-primary/30"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 h-4.5 w-4.5 bg-destructive text-destructive-foreground text-[10px] rounded-full flex items-center justify-center font-bold ring-2 ring-background">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 top-10 w-80 sm:w-96 bg-card border border-border/80 rounded-2xl shadow-xl z-50 overflow-hidden animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="flex items-center justify-between px-5 py-3.5 border-b border-border/60 bg-muted/5">
            <h3 className="font-semibold text-foreground text-sm flex items-center gap-2">
              <Bell className="h-4 w-4 text-primary" /> Notifications
            </h3>
            <div className="flex items-center gap-2">
              {unreadCount > 0 && (
                <button
                  onClick={markAllRead}
                  className="text-xs text-primary hover:text-primary/80 transition-colors flex items-center gap-1"
                >
                  <CheckCheck className="h-3.5 w-3.5" /> Mark all read
                </button>
              )}
              <button
                onClick={() => setOpen(false)}
                className="text-muted-foreground hover:text-foreground transition-colors p-0.5 rounded-md hover:bg-muted/30"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          </div>

          <div className="max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-rounded-full scrollbar-track-rounded-full">
            {notifications.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
                <Bell className="h-10 w-10 text-muted-foreground/30 mb-2" />
                <p className="text-sm text-muted-foreground">No notifications</p>
                <p className="text-xs text-muted-foreground/70 mt-1">
                  New assignments or announcements will appear here.
                </p>
              </div>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  onClick={() => handleNotifClick(n)}
                  className={`w-full text-left px-5 py-3.5 transition-all duration-200 border-b border-border/50 last:border-0 hover:bg-muted/20 ${
                    !n.read ? "bg-primary/5" : ""
                  }`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className={`h-9 w-9 rounded-xl flex items-center justify-center shrink-0 ${
                        n.type === "assignment"
                          ? "bg-warning/15 text-warning"
                          : "bg-info/15 text-info"
                      }`}
                    >
                      {n.type === "assignment" ? (
                        <ClipboardList className="h-4.5 w-4.5" />
                      ) : (
                        <Megaphone className="h-4.5 w-4.5" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-2">
                        <p
                          className={`text-sm truncate ${
                            !n.read ? "font-semibold text-foreground" : "text-muted-foreground"
                          }`}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                        {n.description}
                      </p>
                      <p className="text-xs text-muted-foreground/70 mt-1.5">
                        {n.date}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationBell;