import { redirect } from "next/navigation";

/**
 * Global Backend root — redirect to the dashboard.
 * All public-facing pages are not served by this application.
 */
export default function RootPage() {
  redirect("/dashboard");
}
