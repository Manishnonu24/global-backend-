import { BaseRepository } from "@/core/repository";

export class TeamMemberRepository extends BaseRepository {
  constructor() {
    super("teammember");
  }
}

export const teamMemberRepository = new TeamMemberRepository();
