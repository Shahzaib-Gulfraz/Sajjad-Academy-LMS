import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Menu, LogOut, Bell, GraduationCap, Moon, Sun } from "lucide-react";
import { useTheme } from "next-themes";
import type { LucideIcon } from "lucide-react";
import { useAuth } from "@/hooks/use-auth";

export interface NavItem {
  id: string;
  label: string;
  icon: LucideIcon;
}

interface PortalLayoutProps {
  role: string;
  userName: string;
  userAvatar: string;
  navItems: NavItem[];
  activeNav: string;
  onNavChange: (id: string) => void;
  children: React.ReactNode;
  notificationSlot?: React.ReactNode;
}

// Custom hook for media query
const useMediaQuery = (query: string) => {
  const [matches, setMatches] = useState(false);

  useEffect(() => {
    const media = window.matchMedia(query);
    if (media.matches !== matches) {
      setMatches(media.matches);
    }
    const listener = (e: MediaQueryListEvent) => setMatches(e.matches);
    media.addEventListener("change", listener);
    return () => media.removeEventListener("change", listener);
  }, [matches, query]);

  return matches;
};

const PortalLayout = ({
  role,
  userName,
  userAvatar,
  navItems,
  activeNav,
  onNavChange,
  children,
  notificationSlot,
}: PortalLayoutProps) => {
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [mounted, setMounted] = useState(false);
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { resolvedTheme, setTheme } = useTheme();
  const isMobile = useMediaQuery("(max-width: 768px)");

  useEffect(() => {
    setMounted(true);
  }, []);

  // Close sidebar on mobile when navigating
  const handleNavChange = (id: string) => {
    onNavChange(id);
    if (isMobile) setSidebarOpen(false);
  };

  return (
    <div className="main-layout h-screen overflow-hidden bg-background">
      {/* Backdrop for mobile */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 z-40 bg-black/50 backdrop-blur-[1px]"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        aria-label={`${role} portal navigation`}
        className={`
          ${isMobile 
            ? "fixed inset-y-0 left-0 z-50 transition-all duration-300 ease-in-out"
            : `sidebar shrink-0 transition-all duration-300 ${sidebarOpen ? "w-64" : "w-20"}`
          }
          bg-gradient-to-b from-card via-card to-muted/20 border-r border-border/50 flex flex-col shadow-lg
          ${isMobile && !sidebarOpen ? "-translate-x-full" : "translate-x-0"}
        `}
      >
        {/* Logo Area */}
        <div className="h-16 flex items-center gap-3 px-4 border-b border-border/30 bg-gradient-to-r from-primary/5 to-accent/5">
          <div className="p-2 rounded-lg bg-primary/10">
            <GraduationCap className="h-6 w-6 text-primary shrink-0" />
          </div>
          {(!isMobile && sidebarOpen) && (
            <span className="font-bold text-lg text-foreground tracking-tight">ASAS</span>
          )}
        </div>

        {/* Navigation */}
        <nav className="flex-1 py-6 overflow-y-auto scrollbar-thin space-y-2 px-2">
          {navItems.map((item) => (
            <button
              key={item.id}
              onClick={() => handleNavChange(item.id)}
              className={`sidebar-item w-full text-sm group focus-visible:ring-2 focus-visible:ring-primary/30 ${
                activeNav === item.id
                  ? "active font-semibold"
                  : "text-muted-foreground hover:text-foreground hover:bg-muted/50"
              }`}
              aria-current={activeNav === item.id ? "page" : undefined}
            >
              <item.icon className={`h-5 w-5 shrink-0 ${activeNav === item.id ? 'text-primary' : 'text-muted-foreground group-hover:text-foreground'}`} />
              {/* Show label when sidebar open on desktop, or always on mobile when open */}
              {(!isMobile && sidebarOpen) && <span className="truncate">{item.label}</span>}
              {isMobile && sidebarOpen && <span className="truncate">{item.label}</span>}
            </button>
          ))}
        </nav>

        {/* User Profile & Sign Out */}
        <div className="p-4 space-y-3 border-t border-border/30 bg-gradient-to-t from-muted/20 to-transparent">
          <div className="flex items-center gap-3 px-1">
            <div className="avatar avatar-md bg-primary/20 text-primary shrink-0 shadow-sm">
              {userAvatar}
            </div>
            {(!isMobile && sidebarOpen) && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{role}</p>
              </div>
            )}
            {isMobile && sidebarOpen && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-foreground truncate">
                  {userName}
                </p>
                <p className="text-xs text-muted-foreground truncate">{role}</p>
              </div>
            )}
          </div>
          <button
            onClick={async () => {
              await logout();
              navigate("/", { replace: true });
            }}
            className="btn-ghost w-full justify-start text-sm hover:text-destructive hover:bg-destructive/10"
          >
            <LogOut className="h-4 w-4 shrink-0" />
            {(!isMobile && sidebarOpen) && <span>Sign Out</span>}
            {isMobile && sidebarOpen && <span>Sign Out</span>}
          </button>
        </div>
      </aside>

      {/* Main Area */}
      <div className="content-area flex flex-col overflow-hidden bg-gradient-to-b from-background via-background to-muted/20">
        {/* Header */}
        <header className="top-nav h-16 shrink-0 border-b border-border/50 flex items-center justify-between px-4 md:px-6 bg-gradient-to-r from-card via-card/95 to-muted/30 shadow-sm backdrop-blur-sm">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="btn-ghost btn-icon text-muted-foreground hover:text-foreground"
            aria-label="Toggle sidebar"
          >
            <Menu className="h-5 w-5" />
          </button>

          <div className="flex items-center gap-3">
            {/* Theme Toggle */}
            <button
              onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
              className="btn-outline btn-icon h-9 w-9 border-border/50 bg-background/50 text-muted-foreground hover:text-foreground"
              aria-label="Toggle theme"
              type="button"
            >
              {mounted && resolvedTheme === "dark" ? (
                <Sun className="h-4 w-4" />
              ) : (
                <Moon className="h-4 w-4" />
              )}
            </button>

            {/* Notification Bell (or custom slot) */}
            {notificationSlot || (
              <button className="btn-ghost btn-icon relative text-muted-foreground hover:text-foreground">
                <Bell className="h-5 w-5" />
                <span className="absolute -top-0.5 -right-0.5 h-5 w-5 bg-destructive text-destructive-foreground text-xs rounded-full flex items-center justify-center font-bold shadow-sm animate-pulse-subtle">
                  3
                </span>
              </button>
            )}
          </div>
        </header>

        {/* Main Content */}
        <main className="flex-1 overflow-auto scrollbar-thin">
          <div className="page-container">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
};

export default PortalLayout;
