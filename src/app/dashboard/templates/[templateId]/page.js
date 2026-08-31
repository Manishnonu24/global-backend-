import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";
import { TEMPLATE_REGISTRY } from "@/components/cms/templateRegistry";
import { ensureCodeTemplatePage } from "@/lib/codeTemplatePages";
import { redirect } from "next/navigation";
import Link from "next/link";
import { ChevronLeft } from "lucide-react";

export async function generateMetadata(props) {
  const params = await props.params;
  const { templateId } = params;
  const decodedId = decodeURIComponent(templateId);
  const config = TEMPLATE_REGISTRY[decodedId];
  
  return {
    title: config ? `Edit ${config.name} | Dashboard` : "Template Not Found",
  };
}

export default async function TemplateEditorPage(props) {
  const params = await props.params;
  const user = await requireAuth();
  const site = await getSiteForUser(user);

  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold">Template Editor</h1>
        <p className="mt-4 text-sm text-red-600">
          No active site found. Please configure a site in the database.
        </p>
      </div>
    );
  }

  const { templateId } = params;
  const decodedId = decodeURIComponent(templateId);
  const templateConfig = TEMPLATE_REGISTRY[decodedId];

  if (!templateConfig) {
    redirect("/dashboard/templates");
  }

  const result = await ensureCodeTemplatePage({
    siteId: site.id,
    templateKey: decodedId,
  });

  if (result.status === "active") {
    redirect(`/dashboard/pages/${result.page.id}/edit?mode=template`);
  }

  return (
    <div className="p-6 w-full max-w-5xl">
      <Link 
        href="/dashboard/templates" 
        className="inline-flex items-center text-xs font-semibold text-gray-500 hover:text-gray-900 transition mb-4"
      >
        <ChevronLeft size={14} className="mr-1" />
        Back to Templates
      </Link>
      <h1 className="text-2xl font-bold text-gray-900 mb-4">Restore Template Page</h1>
      <p className="text-sm text-gray-700 mb-4">
        The template <strong>{templateConfig.name}</strong> (Page ID: {result.page.id}, Slug: {result.page.slug}) is soft-deleted. 
        It must be restored before it can be edited.
      </p>
      <form action={`/api/dashboard/pages/${result.page.id}/restore`} method="POST">
        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded font-medium hover:bg-blue-700">
          Restore Template Page
        </button>
      </form>
    </div>
  );
}

