import { getAnalyticsData } from "@/server/actions/analytics";
import { AnalyticsClient } from "./analytics-client";
import { auth } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function AnalyticsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/");
  }

  const data = await getAnalyticsData();

  return <AnalyticsClient data={data} />;
}
