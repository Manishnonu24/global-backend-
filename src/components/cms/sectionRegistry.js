// src/components/cms/sectionRegistry.js
import { z } from "zod";

export const SECTION_TYPES = [
  "HERO",
  "TEXT_BLOCK",
  "SERVICES",
  "TEAM",
  "TESTIMONIALS",
  "FAQ",
  "CTA",
  "BLOGS",
  "CONTACT_FORM",
  "NEWSLETTER",
  "MAGAZINE_SHOWCASE",
  "BLOG_SLIDER",
];

export const sectionSchemas = {
  HERO: z
    .object({
      eyebrow: z.string().optional(),
      title: z.string().optional(),
      subtitle: z.string().optional(),
      description: z.string().optional(),
      alignment: z.enum(["left", "center", "right"]).optional().default("center"),
      backgroundImage: z.string().optional(),
      bgImageMobile: z.string().optional(),
      bgImageDesktop: z.string().optional(),
      primaryButtonText: z.string().optional(),
      primaryButtonUrl: z.string().optional(),
      secondaryButtonText: z.string().optional(),
      secondaryButtonUrl: z.string().optional(),
    })
    .passthrough(),
  TEXT_BLOCK: z
    .object({
      title: z.string().optional(),
      body: z.string().optional(),
      imagePosition: z.enum(["left", "right", "top", "bottom"]).optional().default("left"),
      imageUrl: z.string().optional(),
      buttonText: z.string().optional(),
      buttonUrl: z.string().optional(),
    })
    .passthrough(),
  SERVICES: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        title: z.string(),
        description: z.string(),
        price: z.string().optional(),
        ctaButtonText: z.string().optional(),
        ctaButtonLink: z.string().optional(),
      })).optional(),
    })
    .passthrough(),
  TEAM: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        name: z.string(),
        role: z.string(),
        bio: z.string().optional(),
        photo: z.string().optional(),
      })).optional(),
    })
    .passthrough(),
  TESTIMONIALS: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        clientName: z.string(),
        quote: z.string(),
        rating: z.number().min(1).max(5).optional().default(5),
        clientImage: z.string().optional(),
      })).optional(),
    })
    .passthrough(),
  FAQ: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      items: z.array(z.object({
        id: z.string(),
        question: z.string(),
        answer: z.string(),
      })).optional(),
    })
    .passthrough(),
  BLOGS: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
  CONTACT_FORM: z
    .object({
      title: z.string().optional(),
      description: z.string().optional(),
      buttonText: z.string().optional(),
    })
    .passthrough(),
  CTA: z
    .object({
      title: z.string().optional(),
      subtitle: z.string().optional(),
      primaryButtonText: z.string().optional(),
      primaryButtonUrl: z.string().optional(),
    })
    .passthrough(),
  NEWSLETTER: z
    .object({
      eyebrow: z.string().optional(),
      heading: z.string().optional(),
      subtext: z.string().optional(),
      placeholder: z.string().optional(),
      buttonText: z.string().optional(),
      footnote: z.string().optional(),
    })
    .passthrough(),
  MAGAZINE_SHOWCASE: z
    .object({
      sectionTag: z.string().optional(),
      heading: z.string().optional(),
      description: z.string().optional(),
      button1Text: z.string().optional(),
      button2Text: z.string().optional(),
      middleEyebrow: z.string().optional(),
      middleGreeting: z.string().optional(),
      hintText: z.string().optional(),
      button3Text: z.string().optional(),
    })
    .passthrough(),
  BLOG_SLIDER: z
    .object({
      heading: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
};

export const defaultSectionContent = {
  HERO: {
    title: "Welcome to Our Platform",
    subtitle: "Creating high-fidelity digital solutions that work.",
    alignment: "center",
    bgImageMobile: "/images/hero_img_mob.webp",
    bgImageDesktop: "/images/Group-2608466.webp",
  },
  TEXT_BLOCK: {
    title: "Our Story",
    body: "We build systems using clean principles, pure Javascript components, and high-performance databases.",
  },
  SERVICES: {
    title: "Our Services",
    description: "Professional services tailored to help your brand grow.",
  },
  TEAM: {
    title: "Our Leadership Team",
    description: "Meet the experienced professionals guiding our company.",
  },
  TESTIMONIALS: {
    title: "Client Feedback",
    description: "Hear directly from our global partners.",
  },
  FAQ: {
    title: "Frequently Asked Questions",
    description: "Common questions and detailed answers.",
  },
  BLOGS: {
    title: "Latest Articles & News",
    description: "Read our fresh updates, guides, and corporate blog posts.",
  },
  CONTACT_FORM: {
    title: "Get In Touch",
    description: "Fill out the form below and we will get back to you shortly.",
    buttonText: "Send Message",
  },
  CTA: {
    title: "Ready to get started?",
    subtitle: "Contact us today for a free consultation or general inquiry.",
    primaryButtonText: "Contact Us",
    primaryButtonUrl: "/contact",
  },
  NEWSLETTER: {
    eyebrow: "GET INVOLVED",
    heading: "Get A Health Place Delivered to Your Inbox",
    subtext: "Join our community for weekly tips, inspiring stories, and exclusive resources delivered right to you.",
    placeholder: "Your email address",
    buttonText: "Sign Up",
    footnote: "By signing up you agree to our Terms of Service & Privacy Policy.",
  },
  MAGAZINE_SHOWCASE: {
    sectionTag: "Our Offerings",
    heading: "The Tools for Real Results",
    description: "Explore our publications designed to inspire and inform.",
    button1Text: "Find Health Services Near Me",
    button2Text: "Shop Our Curated Health Store",
    middleEyebrow: "Hello Health Enthusiasts",
    middleGreeting: "Discover Your Next Read",
    hintText: "Click Below to Preview",
    button3Text: "Check out our latest publication",
  },
  BLOG_SLIDER: {
    heading: "Explore Categories",
    description: "Browse articles by topic.",
  },
};

export const sectionMetadata = {
  HERO: { label: "Hero Section Banner", description: "Large eye-catching banner with title, subtitle, and action buttons." },
  TEXT_BLOCK: { label: "Rich Text Block Area", description: "Flexible markdown or rich text content block." },
  SERVICES: { label: "Services Feature Listing", description: "Displays active services configured for the site." },
  TEAM: { label: "Corporate Team Section", description: "Showcases team members and leadership." },
  TESTIMONIALS: { label: "Customer Testimonials List", description: "Client reviews and feedback quotes." },
  FAQ: { label: "Frequently Asked Questions", description: "Collapsible Q&A list for common inquiries." },
  BLOGS: { label: "Latest Articles & Blogs", description: "Grid of recently published blog posts." },
  CONTACT_FORM: { label: "Interactive Contact Form", description: "Lead generation and inquiry submission form." },
  CTA: { label: "Call-To-Action Button Row", description: "High-conversion banner prompting user interaction." },
  NEWSLETTER: { label: "Newsletter Signup", description: "Email capture form for newsletters." },
  MAGAZINE_SHOWCASE: { label: "Magazine Showcase", description: "Grid layout featuring magazines and tools." },
  BLOG_SLIDER: { label: "Blog Category Slider", description: "Horizontal slider for blog categories." },
};

export function validateSectionContent(type, content = {}) {
  const schema = sectionSchemas[type];
  if (!schema) {
    console.warn(`[sectionRegistry] Unknown section type "${type}", skipping validation.`);
    return content;
  }
  const parsed = schema.safeParse(content);
  if (parsed.success) {
    return parsed.data;
  } else {
    console.warn(`[sectionRegistry] Validation failed for section type "${type}":`, parsed.error.format());
    return content; // Fallback to raw content so we don't crash rendering
  }
}

export function getDefaultContent(type) {
  const defaults = defaultSectionContent[type];
  return defaults ? JSON.parse(JSON.stringify(defaults)) : {};
}

export function getSectionMetadata(type) {
  return sectionMetadata[type] || { label: type, description: "CMS Section" };
}
