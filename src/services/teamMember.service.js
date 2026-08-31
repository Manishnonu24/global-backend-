import { teamMemberRepository } from "@/repositories/teamMember.repository";
import { BaseService } from "@/core/service";
import { TeamMemberValidationSchema } from "@/lib/validators/team";

export class TeamMemberService extends BaseService {
  constructor() {
    super(teamMemberRepository, TeamMemberValidationSchema);
  }

  async getTeamMembers(siteId, options = {}) {
    const where = {};
    return this.getList(siteId, {
      where,
      orderBy: { sortOrder: "asc" },
    });
  }
}

export const teamMemberService = new TeamMemberService();
