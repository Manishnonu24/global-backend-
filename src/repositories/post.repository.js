import { BaseRepository } from "@/core/repository";

export class PostRepository extends BaseRepository {
  constructor() {
    super("post");
  }

  async findBySlug(siteId, slug) {
    return this.findFirst(siteId, {
      where: { slug },
      include: { categories: true, tags: true, author: true, featuredImage: true },
    });
  }
}

export const postRepository = new PostRepository();
