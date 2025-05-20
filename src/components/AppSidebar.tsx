
"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Home, Mic, BarChart3, Voicemail } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  Sidebar, // Removed SidebarProvider from here
  SidebarHeader,
  SidebarContent,
  SidebarMenu,
  SidebarMenuItem,
  SidebarMenuButton,
} from "@/components/ui/sidebar";

const baseMenuItems = [
  { href: "/", label: "Home", icon: Home },
  { href: "/stress-check", label: "Stress Check", icon: Mic },
  { href: "/reports", label: "Reports", icon: BarChart3 },
];

export function AppSidebar() {
  const pathname = usePathname();

  return (
    // SidebarProvider is removed from here; it's now in layout.tsx
    <Sidebar className="border-r"> 
      <SidebarHeader className="p-4">
        <Link href="/" className="flex items-center gap-2">
          <Voicemail className="h-8 w-8 text-sidebar-primary" />
          <h1 className="text-2xl font-semibold text-sidebar-foreground">StressCall</h1>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarMenu>
          {baseMenuItems.map((item) => (
            <SidebarMenuItem key={item.href}>
              <Link href={item.href} legacyBehavior passHref>
                <SidebarMenuButton
                  className={cn(
                    "w-full justify-start",
                    pathname === item.href
                      ? "bg-sidebar-primary-foreground text-sidebar-primary"
                      : "hover:bg-sidebar-accent-foreground hover:text-sidebar-accent"
                  )}
                  isActive={pathname === item.href}
                  tooltip={item.label}
                >
                  <item.icon className="mr-2 h-5 w-5" />
                  <span>{item.label}</span>
                </SidebarMenuButton>
              </Link>
            </SidebarMenuItem>
          ))}
        </SidebarMenu>
      </SidebarContent>
      {/* Footer is intentionally left empty */}
    </Sidebar>
  );
}
