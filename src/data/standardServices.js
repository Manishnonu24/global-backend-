/**
 * src/data/standardServices.js
 *
 * Shared data and slug utilities for standard and confidential media packages.
 * Used by /services (listing) and /services/[slug] (detail page).
 */

export function slugifyServiceTitle(title) {
  if (!title) return '';
  return title
    .toString()
    .toLowerCase()
    .trim()
    .replace(/\s+/g, '-')
    .replace(/[^\w\-]+/g, '')
    .replace(/\-\-+/g, '-')
    .replace(/^-+/, '')
    .replace(/-+$/, '');
}

export const STANDARD_PACKAGES = [
  {
    id: 's1',
    slug: 'front-cover-feature-package',
    title: 'Front Cover Feature Package',
    dropdownVal: 'Front Cover Feature Package ($599)',
    description: "Own the Cover. Own the Credibility. There's a difference between being featured in a health publication and being the face of one. This is that difference. Your Front Cover Feature Package puts you on the digital cover of A Health Place — the ultimate visibility asset for practitioners, founders, and health brands who are ready to be seen as the authority they already are.",
    includes: [
      'Main digital front cover portrait/image featuring the client or brand.',
      'Your choice of a deep-dive biographical article OR an exclusive, full-length Q&A interview layout.',
      'Premium Boost: Pinned as a highlighted feature at the top of our website homepage for 30 Days.',
      'Deliverables: High-resolution digital cover asset for your personal marketing + a free copy of the digital issue.',
      'Licensed "As Seen On A Health Place" digital badge for your website.',
      '2 dedicated social media features: post and story.'
    ],
    price: '$599',
    ctaButtonText: 'Secure Cover Spot',
    category: 'Premium Editorial',
    badge: 'Most Popular',
    img: '/images/mag_sleep.webp',
  },
  {
    id: 's2',
    slug: 'back-cover-feature-package',
    title: 'Back Cover Feature Package',
    dropdownVal: 'Back Cover Feature Package ($399)',
    description: "A Statement Placement. The back cover is the last thing a reader sees — which makes it one of the most memorable placements in the entire issue. Whether you want a bold full-page brand statement or a polished executive profile, this package gives you premium real estate without the cover-story price tag.",
    includes: [
      'Premium digital back cover full-page placement (perfect for brand ads or a signature closing profile).',
      'Your choice of a standalone brand article OR an executive interview feature.',
      'Premium Boost: Pinned as a highlighted feature on our website homepage for 14 Days.',
      'Deliverables: High-resolution digital back cover asset + a free copy of the digital issue.',
      'Licensed "As Seen On" digital badge + 1 social media mention.'
    ],
    price: '$399',
    ctaButtonText: 'Reserve Back Cover',
    category: 'Premium Editorial',
    img: '/images/mag_strength.webp',
  },
  {
    id: 's3',
    slug: 'article-feature',
    title: 'Article Feature',
    dropdownVal: 'Article Feature ($179)',
    description: "Tell Your Story, Professionally Written and Permanently Published. Whether it's your practice, your health journey, or your product's origin story — some things are better told than summarized. Our Standalone PR Article turns your story into a fully formatted, professionally published feature that lives permanently on the web.",
    includes: [
      'A fully formatted narrative article spotlighting yourself, your practice, your health journey, or your product brand.',
      'Published on both the website feed and inside the digital magazine issue.',
      'Deliverables: Free copy of the digital issue + permanent live web URL.'
    ],
    price: '$179',
    ctaButtonText: 'Order Article',
    category: 'Standard Editorial',
    badge: 'Best Seller',
    img: '/images/mag_nutrition.webp',
  },
  {
    id: 's4',
    slug: 'interview-feature',
    title: 'Interview Feature',
    dropdownVal: 'Interview Feature ($249)',
    description: "Your Insight, In Your Own Words. Not every story needs a narrative arc — sometimes the most compelling content is simply you, answering the questions your patients and peers actually want asked. Our Standalone Q&A gives your expertise a polished, professional stage.",
    includes: [
      'A curated, high-impact conversational transcript highlighting your health insights and clinical philosophy.',
      'Includes headshots and custom layout formatting.',
      'Published on both the website and in the digital magazine issue.',
      'Also included: Free copy of the digital issue + permanent live web URL + "As Seen In" digital badge.'
    ],
    price: '$249',
    ctaButtonText: 'Schedule Q&A Interview',
    category: 'Standard Editorial',
    img: '/images/service_interview_mockup.webp',
  },
  {
    id: 's5',
    slug: 'magazine-advertisement',
    title: 'Magazine Advertisement',
    dropdownVal: 'Magazine Advertisement Space Full Page ($199)',
    description: "Get Seen Where Your Audience Is Already Reading. Place your brand directly inside our editorial content — visually distinct, professionally positioned, and seen by a health-conscious readership already primed to engage.",
    includes: [
      'Double-Page Spread (DPS) Ad — A massive, side-by-side two-page visual takeover ($249).',
      'Full-Page Ad — A standard single full-page standalone advertisement graphic ($199).',
      'Half / Quarter Page Ad — A smaller visual banner sharing space with our articles ($99).'
    ],
    price: '$99 - $249',
    ctaButtonText: 'Book Ad Space',
    category: 'Display Ads',
    img: '/images/mag_mindfulness.webp',
  },
  {
    id: 's6',
    slug: 'website-feature',
    title: 'Website Feature',
    dropdownVal: 'Website Feature / Guest Post ($99)',
    description: "A Web-First Way to Get Discovered. For brands who want a lighter-touch entry into our editorial ecosystem, the Website Feature delivers a fully written article and real backlink value — without the full-package investment.",
    includes: [
      '1 pre-written informational article published strictly on the website content feed.',
      'Contains 1 or 2 permanent links back to the client\'s site.',
      'Note: This is a web-only article. It does not include homepage pinning or placement inside the digital magazine issue.'
    ],
    price: '$99',
    ctaButtonText: 'Order Web Post',
    category: 'Web SEO Placement',
    img: '/images/mag_phone.webp',
  },
  {
    id: 's7',
    slug: 'media-event-partnerships',
    title: 'Media & Event Partnerships',
    dropdownVal: 'Media & Event Partnership Inquiry',
    description: "Let's Build Something Custom. Got an event, a launch, or a campaign that doesn't fit neatly into a standard package? We partner on joint branding, banner exchanges, ticketing promotions, and dedicated event-previews.",
    includes: [
      'Joint branding, banner exchanges, ticketing promotions, or dedicated event-preview features.',
      'Available on an open trade/barter or custom budget basis.'
    ],
    price: 'From $499',
    ctaButtonText: 'Inquire Partnering',
    category: 'Custom Brand Trades',
    img: '/images/service_partnership_mockup.webp',
  },
];

export const HIDDEN_PACKAGES = [
  {
    id: 'h1',
    slug: 'featured-partner-placement',
    title: 'Featured Partner Placement',
    dropdownVal: 'Featured Partner Placement ($299)',
    description: "Get Ranked. Get Recognized. Position your practice or brand inside one of our curated \"Featured Partners\" roundups — a high-visibility, sponsored placement designed to put you in front of readers actively looking for trusted names in health.",
    includes: [
      'Inclusion in 1 upcoming "Featured Partners" roundup/directory page (clearly labeled Sponsored/Featured Partner).',
      'Client bio (up to 150 words) and headshot.',
      '1 permanent contextual link.',
      'Social distribution: 1 Instagram/Facebook feed post + 2 Stories.',
      '30 days as a highlighted website feature.'
    ],
    price: '$299',
    ctaButtonText: 'Book Partner Slot',
    category: 'Confidential Placements',
    img: '/images/service_partner_roundup_mockup.webp',
  },
  {
    id: 'h2',
    slug: 'annual-pr-partnership-retainer',
    title: 'Annual PR Partnership Retainer',
    dropdownVal: 'Annual PR Partnership Retainer ($1499)',
    description: "Stop Chasing Press. Have It On Retainer. One-off features get you a moment. A retainer gets you a presence — consistent visibility, built into your marketing calendar all year long, without renegotiating every quarter.",
    includes: [
      '1 Front Cover feature + 1 additional standalone piece during the year.',
      'Web features: monthly short feature article (12/year total).',
      'Social placement per feature: 1 feed post + 2 Stories + 1 Reel at time of each publish (annualized: 12 feed posts, 24 Stories, 12 Reels).',
      'Full badge rights web + print use.',
      'Priority access to Media & Event Partnerships.',
      'Homepage pinning included on the cover feature (30 days).',
      'All Year Round website placement.'
    ],
    price: 'From $1499 / Year',
    ctaButtonText: 'Inquire Retainer',
    category: 'Confidential Retainers',
    img: '/images/service_pr_retainer_mockup.webp',
  },
];

export function findStaticPackageBySlug(slug) {
  if (!slug) return null;
  const all = [...STANDARD_PACKAGES, ...HIDDEN_PACKAGES];
  return all.find(p => p.slug === slug || slugifyServiceTitle(p.title) === slug) || null;
}
