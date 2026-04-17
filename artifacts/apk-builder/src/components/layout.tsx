import { useState, useEffect } from "react";
import { Link, useLocation } from "wouter";
import { 
  LayoutDashboard, 
  FolderGit2, 
  PlayCircle, 
  Key, 
  Settings, 
  MessageSquareCode
} from "lucide-react";
import { Sidebar, SidebarContent, SidebarHeader, SidebarMenu, SidebarMenuItem, SidebarMenuButton, SidebarProvider } from "@/components/ui/sidebar";

export function AppLayout({ children }: { children: React.ReactNode }) {
  const [location] = useLocation();

  const navigation = [
    { name: "Dashboard", href: "/", icon: LayoutDashboard },
    { name: "Projects", href: "/projects", icon: FolderGit2 },
    { name: "Builds", href: "/builds", icon: PlayCircle },
    { name: "Keystore", href: "/keystore", icon: Key },
    { name: "AI Chat", href: "/chat", icon: MessageSquareCode },
    { name: "Settings", href: "/settings", icon: Settings },
  ];

  return (
    <SidebarProvider>
      <div className="flex min-h-screen w-full bg-background dark">
        <Sidebar className="border-r border-border bg-sidebar h-screen flex flex-col">
          <SidebarHeader className="p-4 border-b border-border h-14 flex items-center justify-start shrink-0">
            <div className="flex items-center gap-2 text-primary font-mono font-bold">
              <div className="w-6 h-6 bg-primary rounded-sm flex items-center justify-center text-primary-foreground text-xs">
                A
              </div>
              APK Builder Pro
            </div>
          </SidebarHeader>
          <SidebarContent className="flex-1 overflow-y-auto py-4">
            <SidebarMenu>
              {navigation.map((item) => (
                <SidebarMenuItem key={item.name}>
                  <SidebarMenuButton 
                    asChild 
                    isActive={location === item.href || (item.href !== "/" && location.startsWith(item.href))}
                  >
                    <Link href={item.href} className="flex items-center gap-3 w-full">
                      <item.icon className="h-4 w-4" />
                      <span>{item.name}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarContent>
        </Sidebar>
        <main className="flex-1 flex flex-col min-w-0 h-screen overflow-hidden">
          {children}
        </main>
      </div>
    </SidebarProvider>
  );
}
