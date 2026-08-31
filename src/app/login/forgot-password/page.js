import { redirect } from "next/navigation";

/**
 * Orphaned duplicate page at /login/forgot-password.
 * Permanently redirects to the canonical forgot-password page at /forgot-password
 * so any existing links continue to work.
 */
export default function LegacyForgotPasswordPage() {
  redirect("/forgot-password");
}
