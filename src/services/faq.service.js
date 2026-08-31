import { faqRepository } from "@/repositories/faq.repository";
import { pageRepository } from "@/repositories/page.repository";
import { BaseService } from "@/core/service";
import { FaqValidationSchema } from "@/lib/validators/faq";

function normalizeSlug(slug) {
  if (!slug) return null;
  return slug.startsWith("/") ? slug : `/${slug}`;
}

export class FaqService extends BaseService {
  constructor() {
    super(faqRepository, FaqValidationSchema);
  }

  async resolvePageId(siteId, pageSlug) {
    if (!pageSlug) return null;

    const normalized = normalizeSlug(pageSlug);
    const page = await pageRepository.findFirst(siteId, {
      where: {
        slug: { in: [pageSlug, normalized].filter(Boolean) },
        deletedAt: null,
      },
      select: { id: true },
    });

    return page?.id ?? null;
  }

  async getFaqs(siteId, options = {}) {
    const where = {};

    if (options.pageId !== undefined) {
      where.pageId = options.pageId;
    } else if (options.pageSlug || options.page) {
      const pageId = await this.resolvePageId(siteId, options.pageSlug || options.page);
      if (!pageId) return [];
      where.pageId = pageId;
    }

    if (options.showHide !== undefined) {
      where.showHide = options.showHide;
    }

    return this.getList(siteId, {
      where,
      orderBy: { sortOrder: "asc" },
      include: options.includePage
        ? { page: { select: { id: true, title: true, slug: true } } }
        : undefined,
    });
  }

  generateFaqSchemaMarkup(faqs) {
    if (!faqs || faqs.length === 0) return null;

    return {
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: faqs.map((faq) => ({
        "@type": "Question",
        name: faq.question,
        acceptedAnswer: {
          "@type": "Answer",
          text: faq.answer,
        },
      })),
    };
  }

  async getSchemaMarkupForPage(siteId, pageSlug) {
    const pageId = await this.resolvePageId(siteId, pageSlug);
    if (!pageId) return null;

    const faqs = await this.getFaqs(siteId, {
      pageId,
      showHide: true,
    });

    const schemaFaqs = faqs.filter((f) => f.schemaMarkup);
    if (schemaFaqs.length === 0) return null;

    return this.generateFaqSchemaMarkup(schemaFaqs);
  }
}

export const faqService = new FaqService();
