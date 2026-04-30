import { CheckCircle, FileText, Megaphone, Plus } from "lucide-react";
import type { Notification } from "../types";

interface Props {
  open: boolean;
  notifications: Notification[];
  unreadCount: number;
  onMarkAllRead: () => void;
  onCreateAnnouncement: () => void;
  onClickNotification: (notification: Notification) => void;
}

const NotificationsDropdown = ({
  open,
  notifications,
  unreadCount,
  onMarkAllRead,
  onCreateAnnouncement,
  onClickNotification,
}: Props) => {
  if (!open) return null;

  return (
    <div className="absolute right-0 mt-2 w-80 bg-card border border-border rounded-xl shadow-xl z-50 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground">Notifications</h3>
        <div className="flex items-center gap-2">
          {unreadCount > 0 && (
            <button
              onClick={onMarkAllRead}
              className="text-xs text-primary hover:underline flex items-center gap-1"
            >
              <CheckCircle className="h-3 w-3" /> Mark all read
            </button>
          )}
          <button
            onClick={onCreateAnnouncement}
            className="text-xs text-primary hover:underline flex items-center gap-1"
            title="Create Announcement"
          >
            <Plus className="h-3 w-3" /> Create
          </button>
        </div>
      </div>
      <div className="max-h-80 overflow-y-auto">
        {notifications.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">
            No notifications
          </p>
        ) : (
          notifications.slice(0, 10).map((notification) => (
            <button
              key={notification.id}
              onClick={() => onClickNotification(notification)}
              className={`w-full text-left px-4 py-3 border-b border-border last:border-0 hover:bg-muted/30 transition-colors ${
                !notification.read ? "bg-primary/5" : ""
              }`}
            >
              <div className="flex items-start gap-2.5">
                <div
                  className={`mt-0.5 h-6 w-6 rounded-full flex items-center justify-center shrink-0 ${
                    notification.type === "assignment"
                      ? "bg-info/15 text-info"
                      : notification.type === "teacher-announcement"
                      ? "bg-success/15 text-success"
                      : "bg-warning/15 text-warning"
                  }`}
                >
                  {notification.type === "assignment" ? (
                    <FileText className="h-3.5 w-3.5" />
                  ) : (
                    <Megaphone className="h-3.5 w-3.5" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <p
                    className={`text-xs ${
                      !notification.read
                        ? "font-semibold text-foreground"
                        : "text-muted-foreground"
                    }`}
                  >
                    {notification.title}
                  </p>
                  <p className="text-xs text-muted-foreground mt-0.5 truncate">
                    {notification.description}
                  </p>
                  <p className="text-[10px] text-muted-foreground mt-1">
                    {notification.date}
                  </p>
                </div>
                {!notification.read && (
                  <div className="h-2 w-2 rounded-full bg-primary mt-1 shrink-0" />
                )}
              </div>
            </button>
          ))
        )}
      </div>
    </div>
  );
};

export default NotificationsDropdown;
