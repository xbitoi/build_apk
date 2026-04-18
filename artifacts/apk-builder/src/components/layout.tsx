import { useState } from "react";
import { Link, useLocation } from "wouter";
import {
  LayoutDashboard,
  FolderGit2,
  PlayCircle,
  Key,
  Settings,
  MessageSquareCode,
  Sun,
  Moon,
  Menu,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTheme } from "@/lib/theme";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";
import { FloatingChat } from "@/components/floating-chat";

const navigation = [
  { name: "Dashboard", href: "/", icon: LayoutDashboard },
  { name: "Projects", href: "/projects", icon: FolderGit2 },
  { name: "Builds", href: "/builds", icon: PlayCircle },
  { name: "Keystore", href: "/keystore", icon: Key },
  { name: "AI Chat", href: "/chat", icon: MessageSquareCode },
  { name: "Settings", href: "/settings", icon: Settings },
];

function SidebarContent({ onNav }: { onNav?: () => void }) {
  const [location] = useLocation();
  const { theme, toggle } = useTheme();

  return (
    <div className="flex flex-col h-full bg-sidebar border-r border-sidebar-border">
      <div className="p-4 border-b border-sidebar-border h-14 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-2 text-primary font-mono font-bold text-sm">
          <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs font-bold shrink-0">
            A
          </div>
          APK Builder Pro
        </div>
        <Button
          variant="ghost"
          size="icon"
          className="h-7 w-7 text-sidebar-foreground/70 hover:text-sidebar-foreground"
          onClick={toggle}
          title={theme === "dark" ? "Light mode" : "Dark mode"}
        >
          {theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 overflow-y-auto py-3 px-2 space-y-0.5">
        {navigation.map((item) => {
          const active =
            location === item.href ||
            (item.href !== "/" && location.startsWith(item.href));
          return (
            <Link
              key={item.name}
              href={item.href}
              onClick={onNav}
              className={cn(
                "flex items-center gap-3 px-3 py-2.5 rounded-md text-sm font-medium transition-colors w-full",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground"
                  : "text-sidebar-foreground/70 hover:bg-sidebar-accent/60 hover:text-sidebar-foreground"
              )}
            >
              <item.icon className="h-4 w-4 shrink-0" />
              {item.name}
            </Link>
          );
        })}
      </nav>

      <div className="p-3 border-t border-sidebar-border shrink-0">
        <p className="text-[11px] text-sidebar-foreground/40 font-mono text-center">
          APK Builder Pro v1.0
        </p>
      </div>
    </div>
  );
}

export function AppLayout({ children }: { children: React.ReactNode }) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  return (
    <div className="flex min-h-screen w-full bg-background text-foreground">
      {isMobile ? (
        <>
          <div className="fixed top-0 left-0 right-0 z-40 h-14 bg-sidebar border-b border-sidebar-border flex items-center px-4 gap-3">
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 text-sidebar-foreground"
              onClick={() => setDrawerOpen(true)}
            >
              <Menu className="h-5 w-5" />
            </Button>
            <div className="flex items-center gap-2 text-primary font-mono font-bold text-sm">
              <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs font-bold">
                A
              </div>
              APK Builder Pro
            </div>
          </div>

          {drawerOpen && (
            <>
              <div
                className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm"
                onClick={() => setDrawerOpen(false)}
              />
              <div className="fixed top-0 left-0 bottom-0 z-50 w-64 shadow-xl">
                <div className="absolute top-3 right-3 z-10">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-sidebar-foreground"
                    onClick={() => setDrawerOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
                <SidebarContent onNav={() => setDrawerOpen(false)} />
              </div>
            </>
          )}

          <main className="flex-1 flex flex-col min-w-0 pt-14 min-h-screen">
            <div className="flex-1 overflow-auto">{children}</div>
          </main>
        </>
      ) : (
        <>
          <div className="w-56 shrink-0 h-screen sticky top-0">
            <SidebarContent />
          </div>
          <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
            {children}
          </main>
        </>
      )}

      <FloatingChat />
    </div>
  );
}
