import { redirect } from "next/navigation";

export default function TemplatesListingPage() {
  redirect("/dashboard/pages?type=CODE_TEMPLATE");
}
