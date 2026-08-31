import { leadRepository } from "@/repositories/lead.repository";
import { BaseService } from "@/core/service";
import { EventBus } from "@/core/events";

export class LeadService extends BaseService {
  constructor() {
    super(leadRepository);
  }

  async getLeads(siteId, options = {}) {
    const where = {};
    if (options.status) {
      where.status = options.status;
    }
    return this.getList(siteId, {
      where,
      orderBy: { createdAt: "desc" }
    });
  }

  async create(siteId, data, userId = null, options = {}) {
    const lead = await super.create(siteId, data, userId, options);
    EventBus.emit("lead.created", { siteId, data: lead });
    return lead;
  }

  async exportLeadsToCsv(siteId) {
    const leads = await this.getLeads(siteId);

    const headers = ["ID", "Name", "Email", "Phone", "Service Interest", "Source Page", "Status", "Notes", "Created At"];
    const rows = leads.map(l => [
      l.id,
      l.name,
      l.email,
      l.phone || "",
      l.serviceInterest || "",
      l.sourcePage || "",
      l.status,
      (l.notes || "").replace(/"/g, '""'),
      l.createdAt.toISOString()
    ]);

    const csvContent = [
      headers.join(","),
      ...rows.map(row => row.map(val => `"${val}"`).join(","))
    ].join("\n");

    return csvContent;
  }
}

export const leadService = new LeadService();
