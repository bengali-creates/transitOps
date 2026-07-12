import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";
import { SettingsClient } from "./settings-client";
import { getSettings } from "@/server/actions/settings";
import { can } from "@/lib/rbac";

export const metadata = {
  title: "Settings & RBAC | TransitOps",
};

export default async function SettingsPage() {
  const session = await auth();
  if (!session?.user) redirect("/");

  const role = (session.user as any).role;
  // If we just want any logged in user to see the page, or limit to certain roles.
  // The image shows "Settings & RBAC", admins have all access, others might have view access.
  // Let's assume everyone can at least see it, but only admins can write settings.
  // But wait, only admins might be able to change settings. We will pass role to client.

  const settings = await getSettings();
  const canWrite = can(role, "vehicle:write") && role === "admin"; // Admin check or similar

  return (
    <div className="flex h-full w-full flex-col">
      <main className="flex-1 space-y-4 p-4 md:p-8 pt-6">
        <SettingsClient initialSettings={settings} userRole={role} />
      </main>
    </div>
  );
}
