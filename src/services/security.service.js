import prisma from "@/lib/prisma";
import { BaseService } from "@/core/service";
import { logAction } from "@/lib/audit";
import { ValidationError } from "@/core/errors";

export class SecurityService extends BaseService {
  constructor() {
    super({ modelName: "globalsettings" });
  }

  async getSecurityControls(siteId) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { securityControls: true },
    });
    return settings?.securityControls || { ipBlocklist: [], rateLimit: 60 };
  }

  async blockIp(siteId, ip, userId) {
    const net = await import("net");
    if (net.isIP(ip) === 0) {
      throw new ValidationError("Invalid IP address format. Must be a valid IPv4 or IPv6 address.");
    }

    const controls = await this.getSecurityControls(siteId);
    const ipBlocklist = controls.ipBlocklist || [];

    if (!ipBlocklist.includes(ip)) {
      ipBlocklist.push(ip);
    }

    await prisma.globalSettings.update({
      where: { siteId },
      data: {
        securityControls: {
          ...controls,
          ipBlocklist,
        },
      },
    });

    await logAction(siteId, userId, "IP_BLOCKED", { ip });
    return ipBlocklist;
  }

  async unblockIp(siteId, ip, userId) {
    const controls = await this.getSecurityControls(siteId);
    const ipBlocklist = controls.ipBlocklist || [];
    const updatedBlocklist = ipBlocklist.filter((item) => item !== ip);

    await prisma.globalSettings.update({
      where: { siteId },
      data: {
        securityControls: {
          ...controls,
          ipBlocklist: updatedBlocklist,
        },
      },
    });

    await logAction(siteId, userId, "IP_UNBLOCKED", { ip });
    return updatedBlocklist;
  }

  async isIpBlocked(siteId, ip) {
    const controls = await this.getSecurityControls(siteId);
    const ipBlocklist = controls.ipBlocklist || [];
    return ipBlocklist.includes(ip);
  }
}

export const securityService = new SecurityService();
