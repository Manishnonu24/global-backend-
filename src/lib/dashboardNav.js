import {
  LayoutDashboard,
  ImageIcon,
  FileText,
  FileCode2,
  Newspaper,
  Briefcase,
  Settings,
  Users,
  Inbox,
  Quote,
  HelpCircle,
  UsersRound,
  Database,
  ArrowLeftRight,
  PanelBottom,
  Layers,
  PanelTop,
  ShieldCheck,
  Phone,
  Megaphone,
  BarChart2,
  Scale,
  Menu,
  Mail,
  Activity,
  Bell,
  Fingerprint,
  Terminal,
  Package,
  Utensils,
  Calendar,
  UserCog,
} from "lucide-react";
import { hasRole } from "./rbac";

export const CMS_SECTIONS = [
  {
    title: "Overview",
    key: "cms_overview",
    links: [
      { href: "/dashboard/dashboard", label: "Dashboard", icon: LayoutDashboard, minRole: "VIEWER" },
    ],
  },
  {
    title: "Content",
    key: "cms_content",
    links: [
      { href: "/dashboard/pages", label: "Pages", icon: FileText, minRole: "EDITOR" },
      { href: "/dashboard/blogs", label: "Blogs", icon: Newspaper, minRole: "AUTHOR" },
      { href: "/dashboard/magazines", label: "Magazines", icon: Layers, minRole: "AUTHOR" },
      { href: "/dashboard/services", label: "Services", icon: Briefcase, minRole: "EDITOR" },
      { href: "/dashboard/media", label: "Media", icon: ImageIcon, minRole: "AUTHOR" },
      { href: "/dashboard/quizzes", label: "Quizzes", icon: HelpCircle, minRole: "EDITOR" },
      { href: "/dashboard/recipes", label: "Recipes", icon: Utensils, minRole: "EDITOR" },
    ],
  },
  {
    title: "Website",
    key: "cms_website",
    links: [
      { href: "/dashboard/navigation", label: "Navigation", icon: Menu, minRole: "EDITOR" },
      { href: "/dashboard/header", label: "Header Builder", icon: PanelTop, minRole: "ADMIN" },
      { href: "/dashboard/footer", label: "Footer Builder", icon: PanelBottom, minRole: "ADMIN" },
      { href: "/dashboard/cta", label: "CTA & Popups", icon: Megaphone, minRole: "ADMIN" },
      { href: "/dashboard/seo", label: "SEO", icon: BarChart2, minRole: "EDITOR" },
      { href: "/dashboard/contact", label: "Contact", icon: Phone, minRole: "EDITOR" },
      { href: "/dashboard/legal", label: "Legal Pages", icon: Scale, minRole: "EDITOR" },
    ],
  },
  {
    title: "People",
    key: "cms_people",
    links: [
      { href: "/dashboard/team", label: "Team", icon: UsersRound, minRole: "EDITOR" },
      { href: "/dashboard/testimonials", label: "Testimonials", icon: Quote, minRole: "EDITOR" },
      { href: "/dashboard/faq", label: "FAQs", icon: HelpCircle, minRole: "EDITOR" },
    ],
  },
  {
    title: "System",
    key: "cms_system",
    links: [
      { href: "/dashboard/admins", label: "Admins", icon: UserCog, minRole: "ADMIN" },
      { href: "/dashboard/users", label: "Users", icon: Users, minRole: "ADMIN" },
      { href: "/dashboard/security", label: "Security", icon: ShieldCheck, minRole: "ADMIN" },
      { href: "/dashboard/redirects", label: "Redirects", icon: ArrowLeftRight, minRole: "ADMIN" },
      { href: "/dashboard/notifications", label: "Notifications", icon: Bell, minRole: "ADMIN" },
    ],
  },
];

export const CMS_ADVANCED_LINKS = [
  { href: "/dashboard/backup", label: "Backup & Restore", icon: Database, minRole: "ADMIN" },
  { href: "/dashboard/compliance", label: "Compliance", icon: Fingerprint, minRole: "ADMIN" },
  { href: "/dashboard/performance", label: "Performance & Observability", icon: Activity, minRole: "ADMIN" },
  { href: "/dashboard/dev", label: "Developer Tools", icon: Terminal, minRole: "ADMIN" },
  { href: "/dashboard/settings", label: "Settings", icon: Settings, minRole: "ADMIN" },
];

export const CRM_SECTIONS = [
  {
    title: "CRM Overview",
    key: "crm_overview",
    links: [
      { href: "/crm", label: "CRM Dashboard", icon: LayoutDashboard, minRole: "VIEWER" },
      { href: "/crm/subscribers", label: "Subscribers", icon: Users, minRole: "EDITOR" },
      { href: "/crm/lists", label: "Subscriber Lists", icon: UsersRound, minRole: "EDITOR" },
      { href: "/crm/leads", label: "Leads & Contact Forms", icon: Inbox, minRole: "EDITOR" },
      { href: "/crm/services", label: "Service Bookings", icon: Package, minRole: "EDITOR" },
      { href: "/crm/events", label: "Events & Community", icon: Calendar, minRole: "EDITOR" },
      { href: "/crm/visitors", label: "Analytics Dashboard", icon: BarChart2, minRole: "VIEWER" },
      { href: "/crm?tab=reports", label: "Advanced Reports", icon: BarChart2, minRole: "VIEWER" },
    ],
  },
  {
    title: "Marketing",
    key: "crm_marketing",
    links: [
      { href: "/crm/campaigns", label: "Email Campaigns", icon: Megaphone, minRole: "EDITOR" },
      { href: "/crm/email-logs", label: "Email Logs & History", icon: Terminal, minRole: "EDITOR" },
      { href: "/crm/templates", label: "Email Templates", icon: Mail, minRole: "EDITOR" },
      { href: "/crm/push", label: "Push Notifications", icon: Bell, minRole: "EDITOR" },
      { href: "/crm/ads", label: "Advertisement Management", icon: Megaphone, minRole: "EDITOR" },
    ],
  },
  {
    title: "Moderation",
    key: "crm_moderation",
    links: [
      { href: "/crm/comments", label: "Comments", icon: Inbox, minRole: "EDITOR" },
      { href: "/crm/consent", label: "Cookie Consent", icon: Fingerprint, minRole: "EDITOR" },
    ],
  },
  {
    title: "System Settings",
    key: "crm_system",
    links: [
      { href: "/crm/email", label: "Email Settings", icon: Mail, minRole: "ADMIN" },
      { href: "/crm/notifications", label: "Notification Settings", icon: Bell, minRole: "ADMIN" },
    ],
  },
];

export const TOPBAR_WORKSPACE_CONFIG = {
  "marketing-crm": {
    name: "Marketing CRM",
    searchPlaceholder: "Search Marketing CRM…",
    badgeColor: "var(--admin-accent, #0f7c85)",
    actions: [
      { label: "Add Lead", href: "/crm/leads", icon: Inbox, minRole: "EDITOR" },
      { label: "Create Campaign", href: "/crm/campaigns", icon: Megaphone, minRole: "EDITOR" },
    ],
    destinationsLabel: "CRM Administration",
    destinations: [
      { label: "Email Settings", href: "/crm/email", icon: Mail, minRole: "ADMIN" },
      { label: "Notification Settings", href: "/crm/notifications", icon: Bell, minRole: "ADMIN" },
    ],
    switchCommand: { label: "Switch to Global Backend", href: "/dashboard/dashboard" },
  },
  "global-backend": {
    name: "Global Backend",
    searchPlaceholder: "Search Global Backend…",
    badgeColor: "var(--admin-accent, #0f7c85)",
    actions: [
      { label: "Create Page", href: "/dashboard/pages", icon: FileText, minRole: "EDITOR" },
      { label: "Create Blog", href: "/dashboard/blogs/new", icon: Newspaper, minRole: "AUTHOR" },
      { label: "Upload Media", href: "/dashboard/media", icon: ImageIcon, minRole: "AUTHOR" },
    ],
    destinationsLabel: "System Administration",
    destinations: [
      { label: "System & Global Settings", href: "/dashboard/settings", icon: Settings, minRole: "ADMIN" },
      { label: "Security & Audit Logs", href: "/dashboard/security", icon: ShieldCheck, minRole: "ADMIN" },
      { label: "Admin Management & Roles", href: "/dashboard/admins", icon: UserCog, minRole: "ADMIN" },
      { label: "Frontend Users Directory", href: "/dashboard/users", icon: Users, minRole: "ADMIN" },
      { label: "Notification Settings", href: "/dashboard/notifications", icon: Bell, minRole: "EDITOR" },
    ],
    switchCommand: { label: "Switch to Marketing CRM", href: "/crm" },
  },
};

export function filterNavItems(sections, userRole) {
  return sections
    .map((section) => ({
      ...section,
      links: section.links.filter((link) => hasRole(userRole, link.minRole)),
    }))
    .filter((section) => section.links.length > 0);
}

export function buildCommandPaletteItems(userRole) {
  const items = [];

  // Flatten CMS Sections
  CMS_SECTIONS.forEach((section) => {
    section.links.forEach((link) => {
      if (hasRole(userRole, link.minRole)) {
        items.push({
          name: link.label,
          href: link.href,
          group: `Global Backend — ${section.title}`,
          icon: link.icon,
        });
      }
    });
  });

  // Flatten CMS Advanced Links
  CMS_ADVANCED_LINKS.forEach((link) => {
    if (hasRole(userRole, link.minRole)) {
      items.push({
        name: link.label,
        href: link.href,
        group: "Global Backend — Advanced",
        icon: link.icon,
      });
    }
  });

  // Flatten CRM Sections
  CRM_SECTIONS.forEach((section) => {
    section.links.forEach((link) => {
      if (hasRole(userRole, link.minRole)) {
        items.push({
          name: link.label,
          href: link.href,
          group: section.title === "CRM Overview" ? "CRM" : `CRM — ${section.title}`,
          icon: link.icon,
        });
      }
    });
  });

  return items;
}
