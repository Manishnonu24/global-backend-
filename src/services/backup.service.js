import prisma from "@/lib/prisma";
import { BaseService } from "@/core/service";
import { ValidationError } from "@/core/errors";

export class BackupService extends BaseService {
  constructor() {
    super({ modelName: "globalsettings" });
  }

  async createBackup(siteId) {
    const pages = await prisma.page.findMany({
      where: { siteId },
      include: { sections: true },
    });
    const posts = await prisma.post.findMany({
      where: { siteId },
      include: { categories: true, tags: true },
    });
    const services = await prisma.service.findMany({ where: { siteId } });
    const testimonials = await prisma.testimonial.findMany({
      where: { siteId },
    });
    const faqs = await prisma.faq.findMany({ where: { siteId } });
    const teamMembers = await prisma.teammember.findMany({ where: { siteId } });
    const legalPages = await prisma.legalpage.findMany({ where: { siteId } });
    const redirects = await prisma.redirect.findMany({ where: { siteId } });
    const submissions = await prisma.contactFormSubmission.findMany({
      where: { siteId },
    });
    const leads = await prisma.lead.findMany({ where: { siteId } });

    const categories = await prisma.category.findMany({ where: { siteId } });
    const tags = await prisma.tag.findMany({ where: { siteId } });

    const backupData = {
      version: "1.1",
      siteId,
      timestamp: new Date().toISOString(),
      data: {
        pages,
        posts,
        services,
        testimonials,
        faqs,
        teamMembers,
        legalPages,
        redirects,
        submissions,
        leads,
        categories,
        tags,
      },
    };

    return backupData;
  }

  async restoreBackup(siteId, backup) {
    if (!backup || !backup.data) {
      throw new ValidationError("Invalid backup payload structure");
    }

    backup.siteId = siteId;

    const {
      pages,
      posts,
      services,
      testimonials,
      faqs,
      teamMembers,
      legalPages,
      redirects,
      submissions,
      leads,
      categories,
      tags,
    } = backup.data;

    await prisma.$transaction(async (tx) => {
      await tx.page.deleteMany({ where: { siteId } });
      await tx.post.deleteMany({ where: { siteId } });
      await tx.service.deleteMany({ where: { siteId } });
      await tx.testimonial.deleteMany({ where: { siteId } });
      await tx.faq.deleteMany({ where: { siteId } });
      await tx.teammember.deleteMany({ where: { siteId } });
      await tx.legalpage.deleteMany({ where: { siteId } });
      await tx.redirect.deleteMany({ where: { siteId } });
      await tx.contactFormSubmission.deleteMany({ where: { siteId } });
      await tx.lead.deleteMany({ where: { siteId } });

      if (categories && Array.isArray(categories)) {
        for (const cat of categories) {
          await tx.category.upsert({
            where: { siteId_slug: { siteId, slug: cat.slug } },
            update: {},
            create: { siteId, name: cat.name, slug: cat.slug },
          });
        }
      }

      if (tags && Array.isArray(tags)) {
        for (const tag of tags) {
          await tx.tag.upsert({
            where: { siteId_slug: { siteId, slug: tag.slug } },
            update: {},
            create: { siteId, name: tag.name, slug: tag.slug },
          });
        }
      }

      if (pages && Array.isArray(pages)) {
        for (const p of pages) {
          const { id, sections, ...pageProps } = p;
          await tx.page.create({
            data: {
              id,
              ...pageProps,
              siteId,
            },
          });
          if (sections && Array.isArray(sections)) {
            for (const sec of sections) {
              const { id: secId, pageId: _, ...secProps } = sec;
              await tx.section.create({
                data: {
                  id: secId,
                  ...secProps,
                  pageId: id,
                },
              });
            }
          }
        }
      }

      if (posts && Array.isArray(posts)) {
        for (const p of posts) {
          const {
            id,
            categories: postCats,
            tags: postTags,
            author,
            featuredImage,
            ...postProps
          } = p;
          await tx.post.create({
            data: {
              id,
              ...postProps,
              siteId,
            },
          });

          if (postCats && postCats.length > 0) {
            await tx.post.update({
              where: { id },
              data: {
                categories: {
                  connect: postCats.map((c) => ({ slug: c.slug })),
                },
              },
            });
          }
          if (postTags && postTags.length > 0) {
            await tx.post.update({
              where: { id },
              data: {
                tags: { connect: postTags.map((t) => ({ slug: t.slug })) },
              },
            });
          }
        }
      }

      if (services && Array.isArray(services)) {
        for (const s of services) {
          const { id, featuredImage, ...serviceProps } = s;
          await tx.service.create({
            data: {
              id,
              ...serviceProps,
              siteId,
            },
          });
        }
      }

      if (testimonials && Array.isArray(testimonials)) {
        for (const t of testimonials) {
          const { id, ...testProps } = t;
          await tx.testimonial.create({
            data: {
              id,
              ...testProps,
              siteId,
            },
          });
        }
      }

      if (faqs && Array.isArray(faqs)) {
        for (const f of faqs) {
          const { id, ...faqProps } = f;
          await tx.faq.create({
            data: {
              id,
              ...faqProps,
              siteId,
            },
          });
        }
      }

      if (teamMembers && Array.isArray(teamMembers)) {
        for (const tm of teamMembers) {
          const { id, ...tmProps } = tm;
          await tx.teammember.create({
            data: {
              id,
              ...tmProps,
              siteId,
            },
          });
        }
      }

      if (legalPages && Array.isArray(legalPages)) {
        for (const lp of legalPages) {
          const { id, ...lpProps } = lp;
          await tx.legalpage.create({
            data: {
              id,
              ...lpProps,
              siteId,
            },
          });
        }
      }

      if (redirects && Array.isArray(redirects)) {
        for (const r of redirects) {
          const { id, ...rProps } = r;
          await tx.redirect.create({
            data: {
              id,
              ...rProps,
              siteId,
            },
          });
        }
      }

      if (submissions && Array.isArray(submissions)) {
        for (const sub of submissions) {
          const { id, ...subProps } = sub;
          await tx.contactFormSubmission.create({
            data: {
              id,
              ...subProps,
              siteId,
            },
          });
        }
      }

      if (leads && Array.isArray(leads)) {
        for (const l of leads) {
          const { id, ...leadProps } = l;
          await tx.lead.create({
            data: {
              id,
              ...leadProps,
              siteId,
            },
          });
        }
      }
    });

    return { success: true };
  }

  async createMediaBackup(siteId) {
    const media = await prisma.media.findMany({
      where: { siteId },
      orderBy: { createdAt: "desc" },
    });

    const folders = await prisma.mediafolder.findMany({
      where: { siteId },
      orderBy: { createdAt: "asc" },
    });

    return {
      version: "1.1",
      siteId,
      timestamp: new Date().toISOString(),
      media,
      folders,
    };
  }

  async restoreMediaBackup(siteId, backup) {
    if (
      !backup ||
      backup.siteId !== siteId ||
      (!backup.media && !backup.folders)
    ) {
      throw new ValidationError(
        "Invalid media backup payload or siteId mismatch",
      );
    }

    const { media, folders } = backup;

    await prisma.$transaction(async (tx) => {
      await tx.media.deleteMany({ where: { siteId } });
      await tx.mediafolder.deleteMany({ where: { siteId } });

      if (folders && Array.isArray(folders)) {
        for (const folder of folders) {
          const {
            id,
            siteId: _,
            children,
            media: folderMedia,
            ...folderProps
          } = folder;
          await tx.mediafolder.create({
            data: {
              id,
              ...folderProps,
              siteId,
            },
          });
        }
      }

      if (media && Array.isArray(media)) {
        for (const m of media) {
          const { id, siteId: _, folder, posts, services, ...mediaProps } = m;
          await tx.media.create({
            data: {
              id,
              ...mediaProps,
              siteId,
            },
          });
        }
      }
    });

    return { success: true };
  }

  async getBackupHistory(siteId) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { devTools: true },
    });

    const devTools = settings?.devTools || {};
    return devTools.backupHistory || [];
  }

  async getLastBackupTimestamp(siteId, type) {
    const history = await this.getBackupHistory(siteId);
    const recent = history.find(b => b.type === type);
    return recent ? recent.timestamp : null;
  }

  async logBackupHistory(siteId, type, size, fileUrl = null) {
    const settings = await prisma.globalSettings.findUnique({
      where: { siteId },
      select: { devTools: true },
    });

    const devTools = settings?.devTools || {};
    const backupHistory = devTools.backupHistory || [];

    const backupId =
      type === "media" ? `bkup_media_${Date.now()}` : `bkup_${Date.now()}`;
    backupHistory.unshift({
      id: backupId,
      type,
      timestamp: new Date().toISOString(),
      size,
      ...(fileUrl ? { fileUrl } : {}),
    });

    await prisma.globalSettings.update({
      where: { siteId },
      data: {
        devTools: {
          ...devTools,
          backupHistory,
        },
      },
    });

    return backupId;
  }
}

export const backupService = new BackupService();
