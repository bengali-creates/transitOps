import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { AppSidebar } from "@/components/app-sidebar";
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar";
import { ThemeToggle } from "@/components/theme-toggle";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { GlobalSearch } from "@/components/global-search";
import { AICopilotPanel } from "@/components/ai-copilot-panel";
import { can, type Role } from "@/lib/rbac";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const role = (session.user as { role?: string }).role as Role | undefined;
  const hasAiAccess = can(role, "ai:use");

  return (
    <SidebarProvider>
      <AppSidebar user={session.user} />
      <SidebarInset>
        <header className="flex h-16 shrink-0 items-center gap-4 border-b px-4">
          <SidebarTrigger className="-ml-1" />
          <Separator orientation="vertical" className="h-4" />
          <GlobalSearch />
          <div className="flex-1" />
          <div className="flex items-center gap-2 md:gap-3">
            <span className="text-sm font-medium hidden md:inline-block truncate max-w-[100px]">{session.user.name}</span>
            <Badge variant="secondary" className="capitalize hidden sm:inline-flex">
              {role?.replace("_", " ")}
            </Badge>
            <ThemeToggle />
            {/* AI Co-pilot — only rendered for roles with ai:use permission */}
            {hasAiAccess && <AICopilotPanel />}
          </div>
        </header>
        <main className="flex-1 overflow-auto bg-muted/20">
          {children}
        </main>
      </SidebarInset>
    </SidebarProvider>
  );
}
