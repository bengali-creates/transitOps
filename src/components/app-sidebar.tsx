"use client";

import * as React from "react";
import {
  LayoutDashboard,
  Truck,
  Users,
  Map,
  Wrench,
  Fuel,
  CreditCard,
  PieChart,
  Bot,
  LogOut,
  Grid,
} from "lucide-react";

import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarGroup,
  SidebarGroupLabel,
  SidebarGroupContent,
} from "@/components/ui/sidebar";
import { signOut } from "next-auth/react";
import { can, type Role } from "@/lib/rbac";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Button } from "@/components/ui/button";

const navItems = [
  { title: "Dashboard", url: "/dashboard", icon: LayoutDashboard, permission: null },
  { title: "Fleet", url: "/vehicles", icon: Truck, permission: "vehicle:read" as const },
  { title: "Drivers", url: "/drivers", icon: Users, permission: "driver:read" as const },
  { title: "Trips", url: "/trips", icon: Map, permission: "trip:read" as const },
  { title: "Maintenance", url: "/maintenance", icon: Wrench, permission: "maintenance:read" as const },
  { title: "Fuel", url: "/fuel", icon: Fuel, permission: "finance:read" as const },
  { title: "Expenses", url: "/expenses", icon: CreditCard, permission: "finance:read" as const },
  { title: "Analytics", url: "/analytics", icon: PieChart, permission: "reports:read" as const },
  { title: "Assistant", url: "/assistant", icon: Bot, permission: "ai:use" as const },
];

export function AppSidebar({ user }: { user: any }) {
  const pathname = usePathname();
  const role = user?.role as Role;

  const filteredNav = navItems.filter(
    (item) => item.permission === null || can(role, item.permission)
  );

  return (
    <Sidebar>
      <SidebarHeader className="h-16 flex items-center justify-center border-b px-4">
        <div className="flex items-center gap-2 w-full">
          <div className="w-8 h-8 rounded bg-amber-600/20 flex items-center justify-center text-amber-600">
            <Grid className="w-5 h-5" />
          </div>
          <span className="font-semibold tracking-tight text-lg">TransitOps</span>
        </div>
      </SidebarHeader>
      
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {filteredNav.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild isActive={pathname === item.url}>
                    <Link href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="border-t p-4">
        <div className="flex flex-col gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center font-bold text-sm">
              {user?.name?.charAt(0) || "U"}
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="text-sm font-medium truncate">{user?.name}</span>
              <span className="text-xs text-muted-foreground capitalize truncate">{role?.replace("_", " ")}</span>
            </div>
          </div>
          <Button variant="outline" className="w-full justify-start" onClick={() => signOut({ callbackUrl: "/" })}>
            <LogOut className="w-4 h-4 mr-2" />
            Log out
          </Button>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
