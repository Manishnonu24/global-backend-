import React from "react";
import ServiceEditor from "../../ServiceEditor";
import prisma from "@/lib/prisma";
import { requireAuth } from "@/lib/requireAuth";
import { getSiteForUser } from "@/lib/getSiteForUser";

export const metadata = {
  title: "Edit Service | Global Backend Admin",
  description: "Configure business services, pricing tags, CTAs, custom descriptions, and specific page FAQs.",
};

export default async function EditServicePage({ params: rawParams }) {
  const user = await requireAuth();
  if (!user) return null;

  const site = await getSiteForUser(user);
  if (!site) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Edit Service</h1>
        <p className="mt-4 text-sm text-red-600">No active site configured for your profile.</p>
      </div>
    );
  }

  const actualParams = await rawParams;
  const { serviceId } = actualParams;

  const service = await prisma.service.findFirst({
    where: { id: serviceId, deletedAt: null },
    include: { featuredImage: true },
  });

  if (!service || service.siteId !== site.id) {
    return (
      <div className="p-6">
        <h1 className="text-2xl font-bold text-gray-900">Error</h1>
        <p className="mt-4 text-sm text-red-600">Service not found or unauthorized access.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 md:text-3xl">Edit Service</h1>
        <p className="text-sm text-gray-500 mt-1">
          Editing: <span className="font-semibold text-gray-800">{service.title}</span> (Site: {site.name})
        </p>
      </div>
      <div className="bg-white border rounded-xl p-6 shadow-sm">
        <ServiceEditor siteId={site.id} service={service} />
      </div>
    </div>
  );
}

