/**
 * src/content-contracts/pageContracts.js
 *
 * Single source of truth for every CODE_TEMPLATE page's editable content.
 *
 * SOURCES:
 *   PAGE_SECTION   — content stored in a Section record; editable in the Page Editor
 *   ENTITY         — owned by an entity editor (Blog, Service, Recipe, Quiz…)
 *   GLOBAL_SETTINGS — owned by Global Settings (services banner config, etc.)
 *   SYSTEM         — managed by code / the platform; read-only
 *   UNBOUND        — region exists in the template registry but is not yet bound
 *                    to any rendered component output
 *
 * FIELD TYPES  (for Page Editor UI rendering):
 *   text           — single-line text input
 *   multiline-text — textarea treated as a single value (newlines are semantic)
 *   textarea       — multi-line text
 *   url            — text input with URL validation
 *   image          — image picker / URL input
 *   boolean        — toggle / checkbox
 *   string-list    — ordered list of plain strings (Add / Remove / Reorder)
 *   object-list    — ordered list of structured objects (declared via itemFields)
 *
 * LEGACY ALIASES:
 *   Fields listed in legacyAliases are READ as fallbacks from stored content.
 *   They are NEVER written back. Only the canonical key is saved.
 *
 * DATA DEPENDENCIES:
 *   For PAGE_SECTION regions that also depend on entity data, list the entity
 *   in dataDependencies. These are informational — not editable here.
 */

// ---------------------------------------------------------------------------
// Field factory helpers
// ---------------------------------------------------------------------------

function field(key, label, type, opts = {}) {
  return {
    key,
    label,
    type,
    defaultValue: opts.defaultValue ?? (type === 'boolean' ? true : type === 'object-list' || type === 'string-list' ? [] : ''),
    required: opts.required ?? false,
    legacyAliases: opts.legacyAliases ?? [],
    validation: opts.validation ?? {},
    ...(opts.itemFields ? { itemFields: opts.itemFields } : {}),
  };
}

function region(key, label, source, opts = {}) {
  return {
    key,
    label,
    source,                             // PAGE_SECTION | ENTITY | GLOBAL_SETTINGS | SYSTEM | UNBOUND
    editorLink: opts.editorLink ?? null, // link to owner editor for non-PAGE_SECTION
    fields: opts.fields ?? [],
    required: opts.required ?? false,
    dataDependencies: opts.dataDependencies ?? [],
  };
}

// ---------------------------------------------------------------------------
// HOME  —  /
// ---------------------------------------------------------------------------

const HOME_REGIONS = {
  hero: region('hero', 'Hero', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', {
        legacyAliases: ['eyebrow'],
        defaultValue: 'Your Health Journey Begins with Improved Information',
      }),
      field('title', 'Title', 'multiline-text', {
        legacyAliases: ['titleLine1', 'titleLine2'],
        defaultValue: 'Your Daily Guide To\nHealth & Wellness',
        validation: { maxLines: 2, hint: 'Use a new line to create a visual line break.' },
      }),
      field('description', 'Description', 'textarea', {
        legacyAliases: ['body'],
        defaultValue: 'All health decisions are preceded by a question. From general health information to improving your diet, from understanding a condition to making healthier choices, A Health Place can help you make informed decisions with confidence.',
      }),
      field('primaryButtonText', 'Primary Button Text', 'text', {
        legacyAliases: ['btn1Text'],
        defaultValue: 'Explore Blogs',
      }),
      field('primaryButtonUrl', 'Primary Button URL', 'url', {
        legacyAliases: ['btn1Link'],
        defaultValue: '/blogs',
      }),
      field('secondaryButtonText', 'Secondary Button Text', 'text', {
        legacyAliases: ['btn2Text'],
        defaultValue: 'Explore Magazines',
      }),
      field('secondaryButtonUrl', 'Secondary Button URL', 'url', {
        legacyAliases: ['btn2Link'],
        defaultValue: '/publication',
      }),
      field('bgImageMobile', 'Background Image (Mobile)', 'image'),
      field('bgImageDesktop', 'Background Image (Desktop)', 'image'),
    ],
  }),

  articles: region('articles', 'Articles / Magazine Grid', 'PAGE_SECTION', {
    // Magazine records are entity-owned; only display copy is PAGE_SECTION
    dataDependencies: [{ source: 'ENTITY', entity: 'MAGAZINE', editableHere: false }],
    fields: [
      field('sectionTag', 'Section Tag', 'text', { defaultValue: 'DIGITAL ISSUES' }),
      field('heading', 'Heading', 'text', { defaultValue: 'Latest Magazine' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Step into our latest featured edition containing clinically reviewed blueprints, expert columns, and mindfulness guides.',
      }),
      field('button1Text', 'Button 1 Text', 'text', { defaultValue: 'Read Edition →' }),
      field('button1Url', 'Button 1 URL', 'url', { defaultValue: '/blogs' }),
      field('button2Text', 'Button 2 Text', 'text', { defaultValue: 'Explore Archive' }),
      field('button2Url', 'Button 2 URL', 'url', { defaultValue: '/publication' }),
      field('middleEyebrow', 'Middle Column Eyebrow', 'text', { defaultValue: 'INSIDE THIS ISSUE' }),
      field('hintText', 'Spread Stack Hint Text', 'text', { defaultValue: 'Hover to fan out recent editions' }),
    ],
  }),

  blogCategories: region('blogCategories', 'Blog Category Slider', 'PAGE_SECTION', {
    dataDependencies: [{ source: 'ENTITY', entity: 'BLOG_POST', editableHere: false }],
    fields: [
      field('heading', 'Heading', 'text', { defaultValue: 'Latest Blogs' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Browse our articles to get inspired, stay informed and live healthier every day.',
      }),
    ],
  }),

  wellnessBanner: region('wellnessBanner', 'Wellness Showcase (Banner)', 'PAGE_SECTION', {
    fields: [
      field('enabled', 'Show Section', 'boolean', { defaultValue: true }),
      field('headline', 'Headline', 'multiline-text', {
        defaultValue: 'Know your body,\none quiz at a time.',
        validation: { hint: 'Use a new line for a visual line break.' },
      }),
      field('subtext', 'Subtext', 'textarea', {
        defaultValue: 'Our clinically informed quizzes help you understand your health from the inside out covering sleep, stress, nutrition, and Ayurvedic wellness. Start free, go deeper with a free account.',
      }),
      field('buttonText', 'CTA Button Text', 'text', {
        defaultValue: 'Start Free →',
        legacyAliases: ['heroPrimaryLabel'],
      }),
      field('buttonUrl', 'CTA Button URL', 'url', {
        defaultValue: '/quizzes/dashboard',
        legacyAliases: ['heroPrimaryLink'],
      }),
    ],
  }),

  quiz: region('quiz', 'Home Quiz Widget', 'ENTITY', {
    // HomeQuizWidget.js fetches quiz data independently; content prop is ignored
    editorLink: '/dashboard/quizzes',
  }),

  wellnessKitchen: region('wellnessKitchen', 'Wellness Showcase (Kitchen / Recipes)', 'PAGE_SECTION', {
    // The section shows whether the component renders; recipe data is entity-owned
    dataDependencies: [{ source: 'ENTITY', entity: 'RECIPE', editableHere: false }],
    fields: [
      field('enabled', 'Show Section', 'boolean', { defaultValue: true }),
    ],
  }),

  authenticated: region('authenticated', 'Authenticated Sections (Ad Slot)', 'SYSTEM', {
    // HomepageAuthenticatedSections only renders <AdSlot>; ignores content
  }),

  communityEvents: region('communityEvents', 'Community & Events', 'ENTITY', {
    // CommunityEvents.js fetches from /api/events; ignores page content prop
    editorLink: '/dashboard/events',
  }),

  servicesBanner: region('servicesBanner', 'Services / PR Banner', 'GLOBAL_SETTINGS', {
    // ServicesBanner.js fetches from /api/services/banner-config; ignores page content prop
    editorLink: '/dashboard/services/banner-config',
  }),

  newsletter: region('newsletter', 'Newsletter', 'PAGE_SECTION', {
    fields: [
      field('eyebrow', 'Eyebrow Tag', 'text', { defaultValue: 'STAY CONNECTED' }),
      field('heading', 'Heading', 'text', { defaultValue: 'Subscribe to our newsletter' }),
      field('subtext', 'Subtext', 'textarea', {
        defaultValue: 'Join 50,000+ wellness readers receiving expert medical guidelines directly in their inbox every week. Zero spam, unsubscribe at any time.',
      }),
      field('placeholder', 'Email Placeholder', 'text', { defaultValue: 'Enter your email' }),
      field('buttonText', 'Button Text', 'text', { defaultValue: 'Subscribe' }),
      field('footnote', 'Footnote', 'text', { defaultValue: 'No credit card required · Cancel anytime' }),
    ],
  }),
};

// ---------------------------------------------------------------------------
// ABOUT  —  /about
// ---------------------------------------------------------------------------

const ABOUT_REGIONS = {
  hero: region('hero', 'Hero', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', {
        legacyAliases: ['eyebrow'],
        defaultValue: 'Our Story',
      }),
      // About renders title and subtitle as TWO separate styled lines — not merged
      field('title', 'Title (Line 1)', 'text', {
        legacyAliases: ['titleLine1'],
        defaultValue: "Health Isn't About Being Perfect.",
      }),
      field('subtitle', 'Subtitle (Line 2 — accent colour)', 'text', {
        legacyAliases: ['titleLine2'],
        defaultValue: "It's About Making Better Choices Every Day.",
      }),
      field('description', 'Description', 'multiline-text', {
        legacyAliases: ['body'],
      }),
      field('primaryButtonText', 'Primary Button Text', 'text', { defaultValue: 'Explore Articles' }),
      field('primaryButtonUrl', 'Primary Button URL', 'url', { defaultValue: '/blogs' }),
      field('secondaryButtonText', 'Secondary Button Text', 'text', { defaultValue: 'Our Values' }),
      field('secondaryButtonUrl', 'Secondary Button URL', 'url', { defaultValue: '/about#values' }),
      field('cardEyebrow', 'Verification Card Eyebrow', 'text', { defaultValue: 'Medically Verified' }),
      field('cardHeading', 'Verification Card Heading', 'text', { defaultValue: 'Science-backed.\nHuman-first.' }),
      field('cardDescription', 'Verification Card Description', 'textarea', { defaultValue: 'Our review board spans cardiology, psychiatry, Ayurveda, clinical dietetics, and insurance navigation.' }),
      field('cardChips', 'Verification Card Chips', 'string-list', { defaultValue: ['Physicians', 'Dietitians', 'Specialists', 'Advisors'] }),
    ],
  }),

  stats: region('stats', 'Stats Banner', 'PAGE_SECTION', {
    fields: [
      field('items', 'Stats', 'object-list', {
        itemFields: [
          field('value', 'Value', 'text'),
          field('label', 'Label', 'text'),
        ],
        defaultValue: [
          { value: '500+', label: 'Verified Articles' },
          { value: '40+', label: 'Clinical Advisors' },
          { value: '1M+', label: 'Monthly Readers' },
          { value: '8', label: 'Health Categories' },
        ],
      }),
    ],
  }),

  mission: region('mission', 'Our Mission', 'PAGE_SECTION', {
    fields: [
      field('eyebrow', 'Eyebrow', 'text', { defaultValue: 'Our Mission' }),
      field('heading', 'Heading', 'text', { defaultValue: 'Empathetic, verified, and forward-thinking.' }),
      field('paragraph1', 'Paragraph 1', 'textarea'),
      field('paragraph2', 'Paragraph 2', 'textarea'),
    ],
  }),

  values: region('values', 'What We Stand For', 'PAGE_SECTION', {
    fields: [
      field('heading', 'Section Heading', 'text', { defaultValue: 'Six principles that guide everything we do' }),
      field('items', 'Values', 'object-list', {
        itemFields: [
          field('title', 'Title', 'text'),
          // icon and color are set by the fixed frontend design — not editable
          field('description', 'Description', 'textarea', { legacyAliases: ['desc'] }),
        ],
      }),
    ],
  }),

  categories: region('categories', 'Categories We Cover', 'PAGE_SECTION', {
    fields: [
      field('heading', 'Section Heading', 'text', { defaultValue: 'Eight health categories. Thousands of answers.' }),
      field('description', 'Section Description', 'textarea'),
      field('items', 'Categories', 'object-list', {
        // Component reads: cat.name, cat.icon, cat.desc (legacy) / cat.description
        itemFields: [
          field('name', 'Name', 'text'),
          field('icon', 'Icon Emoji', 'text'),
          field('description', 'Description', 'text', { legacyAliases: ['desc'] }),
        ],
      }),
    ],
  }),

  cta: region('cta', 'Bottom CTA', 'PAGE_SECTION', {
    fields: [
      field('eyebrow', 'Eyebrow', 'text', { defaultValue: 'Start Your Journey' }),
      field('title', 'Title', 'multiline-text', {
        defaultValue: 'Small changes.\nBig impact.',
        validation: { hint: 'Use a new line for a visual line break. Do not use HTML.' },
      }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Browse hundreds of clinically reviewed guides — free, forever. Your health journey starts with one article.',
      }),
      field('primaryButtonText', 'Primary Button Text', 'text', { defaultValue: 'Read Our Guides' }),
      field('primaryButtonUrl', 'Primary Button URL', 'url', { defaultValue: '/blogs' }),
      field('secondaryButtonText', 'Secondary Button Text', 'text', { defaultValue: 'Partner With Us' }),
      field('secondaryButtonUrl', 'Secondary Button URL', 'url', { defaultValue: '/services' }),
    ],
  }),
};

// ---------------------------------------------------------------------------
// CONTACT  —  /contact
// ---------------------------------------------------------------------------

const CONTACT_REGIONS = {
  hero: region('hero', 'Hero', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', {
        legacyAliases: ['eyebrow'],
        defaultValue: 'GET IN TOUCH',
      }),
      // Contact hero renders a single title; titleLine1/2 was wrong
      field('title', 'Title', 'text', {
        legacyAliases: ['titleLine1'],
        defaultValue: 'Contact Our Team',
      }),
      field('description', 'Description', 'textarea', {
        legacyAliases: ['body', 'subtitle', 'titleLine2'],
        defaultValue: 'Have questions about our clinically reviewed articles, digital publications, or partnerships? Write to us, and our team will get back to you.',
      }),
      // No buttons — the Contact hero layout does not render button elements
    ],
  }),

  form: region('form', 'Contact Form Copy', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('channelTitle', 'Channel Section Title', 'text', { defaultValue: 'Communication Channels' }),
      field('channelDescription', 'Channel Section Description', 'textarea', {
        defaultValue: 'We look forward to helping you with any queries. For general support, partnerships, or editorial board concerns, please reach out via the emails below.',
      }),
      field('formEyebrow', 'Form Eyebrow', 'text', { defaultValue: 'FEEDBACK FORM' }),
      field('formTitle', 'Form Title', 'text', {
        legacyAliases: ['title'],
        defaultValue: 'Send Us a Message',
      }),
      field('nameLabel', 'Name Field Label', 'text', { defaultValue: 'Name' }),
      field('namePlaceholder', 'Name Field Placeholder', 'text', { defaultValue: 'Your full name' }),
      field('emailLabel', 'Email Field Label', 'text', { defaultValue: 'Email Address' }),
      field('emailPlaceholder', 'Email Field Placeholder', 'text', { defaultValue: 'Your email address' }),
      field('subjectLabel', 'Subject Field Label', 'text', { defaultValue: 'Subject' }),
      field('messageLabel', 'Message Field Label', 'text', { defaultValue: 'Message' }),
      field('messagePlaceholder', 'Message Field Placeholder', 'text', { defaultValue: 'Please write your detailed request here...' }),
      field('disclaimerText', 'Disclaimer Text', 'textarea', { defaultValue: 'Inquiries via this contact page do not constitute medical consultation or advice. For immediate health emergencies, please consult a physician.' }),
      field('buttonText', 'Submit Button Text', 'text', { defaultValue: 'Submit Message' }),
      field('loadingButtonText', 'Loading Button Text', 'text', { defaultValue: 'Subscribing...' }),
      field('successTitle', 'Success Title', 'text', { defaultValue: 'Message Sent Successfully!' }),
      field('successMessage', 'Success Message', 'textarea', { defaultValue: 'Thank you for contacting us. One of our wellness representatives will reach out to you shortly.' }),
    ],
  }),

  // faq: UNBOUND — ContactClient.js does not render a FAQ block
  faq: region('faq', 'FAQ (Not Yet Rendered)', 'UNBOUND', {
    editorLink: null,
  }),
};

// ---------------------------------------------------------------------------
// SERVICES  —  /services
// ---------------------------------------------------------------------------

const SERVICES_REGIONS = {
  hero: region('hero', 'Hero', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', {
        legacyAliases: ['eyebrow'],
        defaultValue: 'AHP MEDIA DIRECTORY',
      }),
      field('title', 'Title', 'text', {
        legacyAliases: ['titleLine1'],
        defaultValue: 'Media & PR Partnership Packages',
      }),
      field('description', 'Description', 'textarea', {
        legacyAliases: ['body', 'subtitle', 'titleLine2'],
        defaultValue: 'Unlock professional authority and reach our health-conscious audience. Explore our cover features, standalone articles, display ads, and custom partnerships.',
      }),
      // No buttons — the Services hero layout does not render button elements
    ],
  }),

  // servicesList: ENTITY — cards managed by the Service entity editor
  servicesList: region('servicesList', 'Services List', 'ENTITY', {
    editorLink: '/dashboard/services',
    dataDependencies: [{ source: 'ENTITY', entity: 'SERVICE', editableHere: false }],
  }),

  faq: region('faq', 'Partnership FAQs', 'PAGE_SECTION', {
    fields: [
      field('heading', 'Section Heading', 'text', {
        defaultValue: 'Partnership Questions & FAQs',
        // Binds to the currently hardcoded h2 text in ServicesClient.js
      }),
      field('items', 'FAQ Items', 'object-list', {
        itemFields: [
          field('q', 'Question', 'text'),
          field('a', 'Answer', 'textarea'),
        ],
      }),
    ],
  }),

  // cta: UNBOUND — ServicesClient.js does not render a CTA section
  cta: region('cta', 'CTA (Not Yet Rendered)', 'UNBOUND', {
    editorLink: null,
  }),
};

// ---------------------------------------------------------------------------
// BLOGS  —  /blogs
// ---------------------------------------------------------------------------

const BLOGS_REGIONS = {
  hero: region('hero', 'Hero', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', {
        legacyAliases: ['eyebrow'],
        defaultValue: 'WELLNESS LIBRARY',
      }),
      field('title', 'Title', 'text', {
        legacyAliases: ['titleLine1'],
        defaultValue: 'Explore Wellness Guides',
      }),
      field('description', 'Description', 'textarea', {
        legacyAliases: ['body', 'subtitle', 'titleLine2'],
        defaultValue: 'Read our medically vetted blogs and health guides created to keep you informed about physical and emotional wellness.',
      }),
      // No button fields — the Blogs hero does not render buttons
    ],
  }),

  // Blog cards are entity-owned; only display copy is PAGE_SECTION
  blogsList: region('blogsList', 'Blogs List Display Copy', 'PAGE_SECTION', {
    dataDependencies: [{ source: 'ENTITY', entity: 'BLOG_POST', editableHere: false }],
    fields: [
      field('heading', 'List Section Heading', 'text', {
        defaultValue: 'All Articles',
      }),
      field('description', 'List Section Description', 'textarea'),
    ],
  }),

  partnerCta: region('partnerCta', 'Partnerships Banner', 'PAGE_SECTION', {
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', { defaultValue: 'PARTNERSHIPS' }),
      field('heading', 'Heading', 'text', { defaultValue: 'Advertise With Us' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Promote your brand to our health-conscious audience of wellness readers. Custom editorial integration, newsletter sponsorships, and media kits available.',
      }),
      field('buttonText', 'Button Text', 'text', { defaultValue: 'Contact Us' }),
      field('buttonUrl', 'Button URL', 'url', { defaultValue: '/info?tab=contact' }),
    ],
  }),
};

// ---------------------------------------------------------------------------
// PUBLICATION  —  /publication
// ---------------------------------------------------------------------------

const PUBLICATION_REGIONS = {
  heroChrome: region('heroChrome', 'Hero Chrome & Buttons', 'PAGE_SECTION', {
    required: true,
    dataDependencies: [{ source: 'ENTITY', entity: 'MAGAZINE', editableHere: false }],
    fields: [
      field('latestIssueLabel', 'Latest Issue Tag Label', 'text', { defaultValue: 'LATEST ISSUE' }),
      field('readIssueButtonText', 'Read Digital Issue Button Text', 'text', { defaultValue: 'Read Digital Issue' }),
      field('archiveButtonText', 'Browse Archive Button Text', 'text', { defaultValue: 'Browse Archive' }),
    ],
  }),

  trustBadges: region('trustBadges', 'Trust Badges', 'PAGE_SECTION', {
    fields: [
      field('items', 'Trust Badges', 'object-list', {
        itemFields: [
          field('label', 'Label', 'text'),
        ],
        defaultValue: [
          { label: 'NATIONAL HEALTH COUNCIL' },
          { label: 'WEBBY NOMINEE 2024' },
          { label: 'PRIVACY FIRST CONTENT' },
          { label: 'AD-FREE READING' },
        ],
      }),
    ],
  }),

  recentIssues: region('recentIssues', 'Recent Issues Section', 'PAGE_SECTION', {
    dataDependencies: [{ source: 'ENTITY', entity: 'MAGAZINE', editableHere: false }],
    fields: [
      field('sectionTag', 'Section Tag', 'text', { defaultValue: 'BACK JOURNAL' }),
      field('heading', 'Heading', 'text', { defaultValue: 'Recent Issues' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Journey through our curated collection of wellness wisdom.',
      }),
      field('emptyTitle', 'Empty State Title', 'text', { defaultValue: 'No Magazines Found' }),
      field('emptyDescription', 'Empty State Description', 'textarea', {
        defaultValue: "We haven't published any magazine issues yet. Please check back later!",
      }),
      field('readIssueButtonText', 'Read Issue Card Button Text', 'text', { defaultValue: 'Read Issue →' }),
      field('noAdditionalIssuesText', 'No Additional Issues Hint', 'text', { defaultValue: 'No additional past issues available.' }),
    ],
  }),

  newsletterCta: region('newsletterCta', 'Newsletter Banner', 'PAGE_SECTION', {
    fields: [
      field('headingLine1', 'Heading (Line 1)', 'text', { defaultValue: 'Never miss a moment' }),
      field('headingLine2', 'Heading (Line 2)', 'text', { defaultValue: 'of wellness.' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Subscribe to our digital edition for just $15/year. Get exclusive interviews, medically-vetted health guides, and a sanctuary of inspiration delivered to your inbox every quarter.',
      }),
      field('placeholder', 'Email Placeholder', 'text', { defaultValue: 'Your email address' }),
      field('buttonText', 'Button Text', 'text', { defaultValue: 'Subscribe Now' }),
      field('loadingButtonText', 'Loading Button Text', 'text', { defaultValue: 'Subscribing...' }),
      field('successMessage', 'Success Message', 'text', { defaultValue: "✅ You're subscribed! Welcome to the A Health Place community." }),
      field('privacyPrefix', 'Privacy Notice Prefix', 'text', { defaultValue: 'By subscribing, you agree to our' }),
      field('privacyLinkText', 'Privacy Link Text', 'text', { defaultValue: 'Privacy Policy' }),
    ],
  }),

  partnerCta: region('partnerCta', 'Partner Banner', 'PAGE_SECTION', {
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', { defaultValue: 'Partnerships' }),
      field('heading', 'Heading', 'text', { defaultValue: 'Partner With Us' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Align your brand with holistic health and mindful wellness in our next edition.',
      }),
      field('buttonText', 'Button Text', 'text', { defaultValue: 'View Packages' }),
      field('buttonUrl', 'Button URL', 'url', { defaultValue: '/services' }),
    ],
  }),

  // Unbound / Entity references
  articles: region('articles', 'Magazine Entities', 'ENTITY', { editorLink: '/dashboard/magazines' }),
};

// ---------------------------------------------------------------------------
// QUIZZES  —  /quizzes
// ---------------------------------------------------------------------------

const QUIZZES_REGIONS = {
  hero: region('hero', 'Hero Header', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', { defaultValue: '✦ Interactive Fun Zone ✦' }),
      field('titleLine1', 'Title Line 1', 'text', { defaultValue: 'Take a Quiz and Test' }),
      field('titleLine2', 'Title Line 2 (Accent)', 'text', { defaultValue: 'Your Wellness Knowledge' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Pick a category below and discover actionable insights about sleep quality, stress indices, nutrition, gut health, and Ayurvedic dosha mind-body constitution.',
      }),
      field('searchPlaceholder', 'Search Placeholder', 'text', { defaultValue: 'Search wellness quizzes...' }),
    ],
  }),

  authGate: region('authGate', 'Member Benefits & Login Gate', 'PAGE_SECTION', {
    fields: [
      field('badge', 'Section Badge', 'text', { defaultValue: 'Exclusive Member Benefits' }),
      field('headingLine1', 'Heading Line 1', 'text', { defaultValue: 'Unlock Your Personalized' }),
      field('headingLine2', 'Heading Line 2 (Accent)', 'text', { defaultValue: 'Wellness Dashboard' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Take control of your health. Create a free account to access our interactive wellness checks, save your scores, and receive advisor-vetted insights.',
      }),
      field('features', 'Feature List', 'object-list', {
        itemFields: [
          field('title', 'Title', 'text'),
          field('description', 'Description', 'textarea'),
        ],
        defaultValue: [
          { title: 'Interactive Health Checks', description: 'Evaluate sleep patterns, stress resilience, and biophilic dosha maps.' },
          { title: 'Secure Progress Logs', description: 'Track score metrics over time and save trends to your dashboard.' },
          { title: 'Empathetic Advising Matches', description: 'Receive tailored advice based on your unique wellness profiles.' },
        ],
      }),
      field('loginHeading', 'Login Box Heading', 'text', { defaultValue: 'Login Required' }),
      field('loginDescription', 'Login Box Description', 'textarea', {
        defaultValue: 'Please sign in to view all wellness quizzes, evaluate your profile, and track your scores.',
      }),
      field('loginButtonText', 'Login Button Text', 'text', { defaultValue: 'Login to Continue' }),
    ],
  }),

  saveProgress: region('saveProgress', 'Save Progress Banner', 'PAGE_SECTION', {
    fields: [
      field('title', 'Title', 'text', { defaultValue: 'Save your wellness progress' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Complete any quiz and keep track of your wellness profile. No hidden charges.',
      }),
      field('buttonText', 'Button Text', 'text', { defaultValue: 'My Dashboard' }),
    ],
  }),

  emptyState: region('emptyState', 'Empty States & Messages', 'PAGE_SECTION', {
    fields: [
      field('searchEmptyTitle', 'Search Empty Title', 'text', { defaultValue: 'No Quizzes Found' }),
      field('searchEmptyDescription', 'Search Empty Description', 'text', { defaultValue: 'Try a different search term.' }),
      field('noQuizzesTitle', 'No Quizzes Available Title', 'text', { defaultValue: 'No Quizzes Available' }),
      field('noQuizzesDescription', 'No Quizzes Available Description', 'text', { defaultValue: 'Check back soon — quizzes are being added.' }),
      field('clearSearchButtonText', 'Clear Search Button Text', 'text', { defaultValue: 'Clear search' }),
    ],
  }),

  quizzesList: region('quizzesList', 'Quiz Entities', 'ENTITY', { editorLink: '/dashboard/quizzes' }),
};

// ---------------------------------------------------------------------------
// RECIPES  —  /recipes
// ---------------------------------------------------------------------------

const RECIPES_REGIONS = {
  hero: region('hero', 'Hero Header', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('discoverLabel', 'Discover Label', 'text', { defaultValue: 'Discover' }),
      field('title', 'Title', 'text', { defaultValue: 'Healthy Meals That Fit Real Life' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Nutritious meals can be a fun and delicious way of life with simple ingredients, balanced recipes, and some ideas.',
      }),
    ],
  }),

  search: region('search', 'Search & Category Bar', 'PAGE_SECTION', {
    fields: [
      field('placeholder', 'Search Placeholder', 'text', { defaultValue: 'Search for ingredients, dishes...' }),
      field('buttonText', 'Search Button Text', 'text', { defaultValue: 'Search' }),
      field('allCategoriesLabel', 'All Categories Pill Label', 'text', { defaultValue: 'All' }),
    ],
  }),

  listSection: region('listSection', 'Recipe List Section Header', 'PAGE_SECTION', {
    dataDependencies: [{ source: 'ENTITY', entity: 'RECIPE', editableHere: false }],
    fields: [
      field('heading', 'Section Heading', 'text', { defaultValue: 'Popular Healthy Recipes' }),
      field('subtext', 'Section Subtext', 'text', { defaultValue: 'Explore wholesome meals from our community' }),
    ],
  }),

  emptyState: region('emptyState', 'Empty States & Card Defaults', 'PAGE_SECTION', {
    fields: [
      field('loadingText', 'Loading Text', 'text', { defaultValue: 'Loading delicious recipes...' }),
      field('emptyTitle', 'Empty State Title', 'text', { defaultValue: 'No recipes found' }),
      field('emptyDescription', 'Empty State Description', 'textarea', { defaultValue: 'Try adjusting your search or category filter.' }),
      field('defaultRecipeDescription', 'Default Card Fallback Description', 'textarea', { defaultValue: 'A delicious, healthy recipe thoughtfully shared by our wellness community.' }),
      field('defaultTagLabel', 'Default Tag Fallback Label', 'text', { defaultValue: 'Recipe' }),
      field('bottomButtonText', 'Explore More Button Text', 'text', { defaultValue: 'Explore More Recipes' }),
    ],
  }),

  recipesList: region('recipesList', 'Recipe Entities', 'ENTITY', { editorLink: '/dashboard/recipes' }),
};

// ---------------------------------------------------------------------------
// INFO  —  /info
// ---------------------------------------------------------------------------

const INFO_REGIONS = {
  hero: region('hero', 'Hero Header', 'PAGE_SECTION', {
    required: true,
    fields: [
      field('badge', 'Badge / Eyebrow', 'text', { defaultValue: 'A HEALTH PLACE INFO HUB' }),
      field('title', 'Title', 'text', { defaultValue: 'How Can We Help You Today?' }),
      field('description', 'Description', 'textarea', {
        defaultValue: 'Explore medically verified wellness guides, review our board standards, submit a support inquiry, or read our policy documentation.',
      }),
      field('supportTabLabel', 'Support Tab Label', 'text', { defaultValue: 'Contact Support' }),
      field('legalTabLabel', 'Legal Tab Label', 'text', { defaultValue: 'Legal & Policies' }),
    ],
  }),

  support: region('support', 'Support Section Copy', 'PAGE_SECTION', {
    fields: [
      field('heading', 'Section Heading', 'text', { defaultValue: 'Get in touch' }),
      field('description', 'Section Description', 'textarea', {
        defaultValue: 'Have questions about an article, feedback on our content, or general technical support inquiries? Our team is here to assist.',
      }),
      field('nameLabel', 'Name Field Label', 'text', { defaultValue: 'Full Name' }),
      field('namePlaceholder', 'Name Field Placeholder', 'text', { defaultValue: 'John Doe' }),
      field('emailLabel', 'Email Field Label', 'text', { defaultValue: 'Email Address' }),
      field('emailPlaceholder', 'Email Field Placeholder', 'text', { defaultValue: 'john@example.com' }),
      field('subjectLabel', 'Subject Field Label', 'text', { defaultValue: 'Subject' }),
      field('subjectPlaceholder', 'Subject Field Placeholder', 'text', { defaultValue: 'Feedback on Guide / Editorial Support' }),
      field('messageLabel', 'Message Field Label', 'text', { defaultValue: 'Message' }),
      field('messagePlaceholder', 'Message Field Placeholder', 'text', { defaultValue: 'Write your query or feedback here...' }),
      field('submitButtonText', 'Submit Button Text', 'text', { defaultValue: 'Submit Support Ticket' }),
      field('successHeading', 'Success Message Heading', 'text', { defaultValue: 'Message Sent Successfully!' }),
      field('successDescription', 'Success Message Description', 'textarea', {
        defaultValue: 'Thank you for reaching out. A board-certified content supervisor or technical editor will contact you within 24-48 hours.',
      }),
      field('sendAnotherButtonText', 'Send Another Message Button Text', 'text', { defaultValue: 'Send Another Message' }),
    ],
  }),

  legal: region('legal', 'Legal Document Content', 'ENTITY', { editorLink: '/dashboard/legal' }),
  boardMembers: region('boardMembers', 'Board Members (Unbound)', 'UNBOUND', { editorLink: null }),
  mockArticles: region('mockArticles', 'Mock Articles (Unbound)', 'UNBOUND', { editorLink: null }),
};

// ---------------------------------------------------------------------------
// Master contract map
// ---------------------------------------------------------------------------

export const PAGE_CONTRACTS = {
  HOME: {
    templateKey: 'HOME',
    name: 'Home Page',
    route: '/',
    regions: HOME_REGIONS,
  },
  ABOUT: {
    templateKey: 'ABOUT',
    name: 'About Us',
    route: '/about',
    regions: ABOUT_REGIONS,
  },
  CONTACT: {
    templateKey: 'CONTACT',
    name: 'Contact',
    route: '/contact',
    regions: CONTACT_REGIONS,
  },
  SERVICES: {
    templateKey: 'SERVICES',
    name: 'Services',
    route: '/services',
    regions: SERVICES_REGIONS,
  },
  BLOGS: {
    templateKey: 'BLOGS',
    name: 'Blogs',
    route: '/blogs',
    regions: BLOGS_REGIONS,
  },
  PUBLICATION: {
    templateKey: 'PUBLICATION',
    name: 'Publication',
    route: '/publication',
    regions: PUBLICATION_REGIONS,
  },
  QUIZZES: {
    templateKey: 'QUIZZES',
    name: 'Quizzes',
    route: '/quizzes',
    regions: QUIZZES_REGIONS,
  },
  RECIPES: {
    templateKey: 'RECIPES',
    name: 'Recipes',
    route: '/recipes',
    regions: RECIPES_REGIONS,
  },
  INFO: {
    templateKey: 'INFO',
    name: 'Info Hub',
    route: '/info',
    regions: INFO_REGIONS,
  },
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Get the field definitions for a specific template + region combination.
 * Returns null for unknown combinations (fail-closed).
 */
export function getContractFields(templateKey, regionKey) {
  const contract = PAGE_CONTRACTS[templateKey];
  if (!contract) return null;
  const reg = contract.regions[regionKey];
  if (!reg) return null;
  return reg.fields ?? [];
}

/**
 * Get the region map for a template.
 */
export function getContractRegions(templateKey) {
  return PAGE_CONTRACTS[templateKey]?.regions ?? null;
}

/**
 * Get a single region definition.
 */
export function getContractRegion(templateKey, regionKey) {
  return PAGE_CONTRACTS[templateKey]?.regions[regionKey] ?? null;
}

/**
 * Returns an array of region keys that have source === 'PAGE_SECTION' for a given templateKey.
 * Normalizes templateKey using trim().toUpperCase().
 */
export function getEditableRegionKeys(templateKey) {
  const normKey = String(templateKey || '').trim().toUpperCase();
  const regionMap = getContractRegions(normKey);
  if (!regionMap) return [];
  return Object.values(regionMap)
    .filter((region) => region.source === 'PAGE_SECTION')
    .map((region) => region.key);
}

/**
 * Build the TEMPLATE_REGISTRY shape (for backward-compat re-export).
 */
export function buildTemplateRegistry() {
  const registry = {};
  for (const [tKey, contract] of Object.entries(PAGE_CONTRACTS)) {
    registry[tKey] = {
      name: contract.name,
      version: 1,
      regions: {},
    };
    for (const [rKey, reg] of Object.entries(contract.regions)) {
      const isPageSection = reg.source === 'PAGE_SECTION';
      registry[tKey].regions[rKey] = {
        label: reg.label,
        allowedBlocks: inferAllowedBlocks(tKey, rKey, reg),
        minItems: reg.required ? 1 : 0,
        maxItems: 1,
        reorderable: false,
        deletable: false,
        hideable: false,
        source: reg.source,
        editorLink: reg.editorLink ?? null,
      };
    }
  }
  return registry;
}

function inferAllowedBlocks(templateKey, regionKey, reg) {
  // Map region key patterns to block types for backward compat
  const map = {
    hero: 'HERO',
    newsletter: 'NEWSLETTER',
    blogsList: 'BLOGS',
    servicesList: 'SERVICES',
    faq: 'FAQ',
    cta: 'CTA',
  };
  return [map[regionKey] || 'TEXT_BLOCK'];
}

/**
 * Filter a content object to only include canonically declared fields for a region.
 * Returns null if the region is unknown (unknown region = reject).
 * Does NOT silently strip: returns the filtered set only.
 *
 * IMPORTANT: This does NOT delete legacy/unknown fields from the DB — it only
 * filters what the editor writes. The DB may still hold legacy fields.
 */
export function filterToContractFields(templateKey, regionKey, content) {
  const fields = getContractFields(templateKey, regionKey);
  if (fields === null) return null; // unknown region — caller should 400

  const filtered = {};
  for (const f of fields) {
    if (Object.prototype.hasOwnProperty.call(content, f.key)) {
      filtered[f.key] = content[f.key];
    }
  }
  return filtered;
}

/**
 * Validate a content object strictly against declared fields.
 * Returns { valid: true } or { valid: false, unknownFields: [...], invalidFields: [...] }
 */
export function validateContractContent(templateKey, regionKey, content) {
  const fields = getContractFields(templateKey, regionKey);
  if (fields === null) {
    return {
      valid: false,
      unknownRegion: true,
      unknownFields: [],
      invalidFields: [],
    };
  }

  const declaredKeys = new Set(fields.map((f) => f.key));
  const unknownFields = Object.keys(content).filter((k) => !declaredKeys.has(k));
  const invalidFields = [];

  // Type-level validation
  for (const f of fields) {
    if (f.required && (!Object.prototype.hasOwnProperty.call(content, f.key) || content[f.key] === null || content[f.key] === undefined || content[f.key] === '')) {
      invalidFields.push({ field: f.key, reason: 'is required' });
      continue;
    }

    if (!Object.prototype.hasOwnProperty.call(content, f.key)) continue;
    const val = content[f.key];
    
    if (val === null || val === undefined) continue;

    if (f.type === 'boolean' && typeof val !== 'boolean') {
      invalidFields.push({ field: f.key, reason: 'must be a boolean' });
    } else if (f.type === 'string-list') {
      if (!Array.isArray(val)) {
        invalidFields.push({ field: f.key, reason: 'must be an array' });
      } else if (!val.every(item => typeof item === 'string')) {
        invalidFields.push({ field: f.key, reason: 'must contain only strings' });
      }
    } else if (f.type === 'object-list') {
      if (!Array.isArray(val)) {
        invalidFields.push({ field: f.key, reason: 'must be an array' });
      } else if (!val.every(item => item !== null && typeof item === 'object' && !Array.isArray(item))) {
        invalidFields.push({ field: f.key, reason: 'must contain only objects' });
      } else if (f.itemFields) {
        // Deep validate item fields
        const allowedSubKeys = new Set(f.itemFields.map(sub => sub.key));
        for (let i = 0; i < val.length; i++) {
          const item = val[i];
          const unknownSubKeys = Object.keys(item).filter(k => !allowedSubKeys.has(k));
          if (unknownSubKeys.length > 0) {
            invalidFields.push({ field: `${f.key}[${i}]`, reason: `unknown fields: ${unknownSubKeys.join(', ')}` });
          }
          for (const subField of f.itemFields) {
            if (subField.required && (!Object.prototype.hasOwnProperty.call(item, subField.key) || item[subField.key] === null || item[subField.key] === undefined || item[subField.key] === '')) {
              invalidFields.push({ field: `${f.key}[${i}].${subField.key}`, reason: 'is required' });
              continue;
            }

            if (Object.prototype.hasOwnProperty.call(item, subField.key)) {
              const subVal = item[subField.key];
              if (subVal !== null && subVal !== undefined) {
                if (typeof subVal !== 'string') {
                  invalidFields.push({ field: `${f.key}[${i}].${subField.key}`, reason: 'must be a string' });
                } else {
                  if (subField.validation?.maxLength && subVal.length > subField.validation.maxLength) {
                    invalidFields.push({ field: `${f.key}[${i}].${subField.key}`, reason: `exceeds max length of ${subField.validation.maxLength}` });
                  }
                  if (subField.validation?.maxLines && subVal.split(/\r\n|\r|\n/).length > subField.validation.maxLines) {
                    invalidFields.push({ field: `${f.key}[${i}].${subField.key}`, reason: `exceeds max lines of ${subField.validation.maxLines}` });
                  }
                  if (subField.type === 'url') {
                    if (subVal.toLowerCase().startsWith('javascript:') || subVal.toLowerCase().startsWith('data:')) {
                      invalidFields.push({ field: `${f.key}[${i}].${subField.key}`, reason: 'unsafe URL protocol' });
                    }
                  }
                }
              }
            }
          }
        }
      }
    } else if (['text', 'textarea', 'multiline-text', 'image', 'url', 'color'].includes(f.type)) {
      if (typeof val !== 'string') {
        invalidFields.push({ field: f.key, reason: 'must be a string' });
      } else {
        if (f.validation?.maxLength && val.length > f.validation.maxLength) {
          invalidFields.push({ field: f.key, reason: `exceeds max length of ${f.validation.maxLength}` });
        }
        if (f.validation?.maxLines && val.split(/\r\n|\r|\n/).length > f.validation.maxLines) {
          invalidFields.push({ field: f.key, reason: `exceeds max lines of ${f.validation.maxLines}` });
        }
        if (f.type === 'url') {
          if (val.toLowerCase().startsWith('javascript:') || val.toLowerCase().startsWith('data:')) {
            invalidFields.push({ field: f.key, reason: 'unsafe URL protocol' });
          }
        }
      }
    }
  }

  return {
    valid: unknownFields.length === 0 && invalidFields.length === 0,
    unknownFields,
    invalidFields,
  };
}

/**
 * Read canonical value from stored content, falling back through legacyAliases.
 * Used by frontend components and migration helpers.
 */
export function readField(content, fieldDef) {
  if (!content) return fieldDef.defaultValue;
  // Check canonical key first
  if (Object.prototype.hasOwnProperty.call(content, fieldDef.key)) {
    const val = content[fieldDef.key];
    if (val !== null && val !== undefined) return val;
  }
  // Then check legacy aliases in order
  for (const alias of fieldDef.legacyAliases ?? []) {
    if (Object.prototype.hasOwnProperty.call(content, alias)) {
      const val = content[alias];
      if (val !== null && val !== undefined) return val;
    }
  }
  return fieldDef.defaultValue;
}

/**
 * Creates a new array of canonical objects from a raw array of items.
 * Drops any keys not defined in field.itemFields.
 */
export function toCanonicalObjectList(rawItems, field) {
  if (!Array.isArray(rawItems)) return [];

  return rawItems.map((rawItem) => {
    const canonicalItem = {};

    for (const itemField of field.itemFields || []) {
      canonicalItem[itemField.key] = readField(rawItem || {}, itemField);
    }

    return canonicalItem;
  });
}
