/**
 * Central Registry of Email Trigger Events
 * Single source of truth for email event -> template mappings across the application.
 */
export const EMAIL_TRIGGERS = {
  user_verification: {
    label: "User Verification / OTP",
    description: "Sent when a new user registers and must verify their email with an OTP code.",
    variables: ["{name}", "{otpCode}", "{email}", "{siteName}"],
  },
  newsletter_welcome: {
    label: "Newsletter Welcome",
    description: "Sent immediately after someone subscribes to the newsletter.",
    variables: ["{email}", "{siteName}"],
  },
  user_signup_welcome: {
    label: "Sign Up Welcome",
    description: "Sent once, immediately after a new user account is created.",
    variables: ["{name}", "{email}", "{siteName}"],
  },
  lead_auto_reply: {
    label: "Lead User Auto-Reply",
    description: "Sent to a lead/contact-form submitter as an automatic acknowledgement.",
    variables: ["{name}", "{email}", "{phone}", "{serviceInterest}", "{siteName}"],
  },
  admin_lead_notification: {
    label: "Admin Lead Notification",
    description: "Sent to site admins when a new lead/contact submission arrives.",
    variables: ["{name}", "{email}", "{phone}", "{message}", "{query}", "{serviceInterest}", "{siteName}"],
  },
  blog_published: {
    label: "New Blog Notification",
    description: "Sent to subscribers when a new blog post is published.",
    variables: ["{blogTitle}", "{blogExcerpt}", "{blogUrl}", "{blogImage}", "{siteName}"],
  },
  magazine_published: {
    label: "New Magazine Notification",
    description: "Sent to subscribers when a new magazine issue is published.",
    variables: ["{magazineTitle}", "{magazineDescription}", "{magazineUrl}", "{magazineCover}", "{siteName}"],
  },
  daily_diet_digest: {
    label: "Daily Diet Update",
    description: "Sent when a new daily-diet entry or meal plan is published.",
    variables: ["{dietTitle}", "{dietSummary}", "{dietUrl}", "{siteName}"],
  },
  daily_diet_recipe_submission: {
    label: "Daily Diet Recipe Submission",
    description: "Acknowledgement sent to a user after they submit a recipe for review.",
    variables: ["{name}", "{recipeName}", "{siteName}"],
  },
  article_submission: {
    label: "Article Submission Acknowledgement",
    description: "Acknowledgement sent to an author after submitting an article for review.",
    variables: ["{name}", "{articleTitle}", "{siteName}"],
  },
  community_event_announcement: {
    label: "Community Event Announcement",
    description: "Sent to subscribers when a new community event is announced.",
    variables: ["{eventTitle}", "{eventDescription}", "{eventDate}", "{eventLocation}", "{eventUrl}", "{siteName}"],
  },
  weekly_blog_digest: {
    label: "Weekly Blog Digest",
    description: "Cron-triggered weekly roundup of published blog posts.",
    variables: ["{blogList}", "{weekRange}", "{siteName}"],
  },
  newsletter_digest: {
    label: "Periodic Newsletter Digest",
    description: "Periodic newsletter roundup featuring articles and health tips.",
    variables: ["{name}", "{featuredTitle}", "{featuredSummary}", "{healthTip}", "{siteName}"],
  },
  promotions_offers: {
    label: "Promotions & Offers",
    description: "Manually triggered marketing or promo campaign email.",
    variables: ["{offerTitle}", "{offerBody}", "{offerUrl}", "{siteName}"],
  },
  password_reset: {
    label: "Password Reset",
    description: "Sent when a user requests a password reset.",
    variables: ["{resetUrl}", "{siteName}"],
  },
  password_changed: {
    label: "Password Changed Notification",
    description: "Sent after a user's password has been successfully changed/reset.",
    variables: ["{name}", "{email}", "{siteName}", "{loginUrl}"],
  },
};
