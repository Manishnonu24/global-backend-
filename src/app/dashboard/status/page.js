import { redirect } from "next/navigation";

export const metadata = {
  title: "System Status | Global Backend Admin",
  description: "View internal infrastructure status and telemetry",
};

export default function StatusPage() {
  redirect("/dashboard/performance?tab=observability");
}
