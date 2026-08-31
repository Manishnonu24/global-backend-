/**
 * lib/novu-service-events.js
 *
 * Novu trigger functions for service-related events in the AHP application.
 *
 * These functions are the single source of truth for service notification logic.
 * Import them wherever a service event occurs:
 *
 *   - api/services/booking/route.js       → triggerServiceBooked()
 *   - Lead status update API route        → triggerLeadStatusChanged()
 *   - Service record update (admin)       → triggerServiceUpdated()
 *   - api/cron/service-reminders/route.js → triggerServiceReminder()
 *
 * Each function:
 *   1. Builds a Novu subscriber object from available lead/user data
 *   2. Calls notifyUser() or notifyMultiple() from novu-triggers.js
 *   3. Returns null silently on failure — never throws
 *
 * Novu Workflows required (create these in the Novu dashboard):
 *   - service-booked
 *   - service-status-changed
 *   - service-updated
 *   - service-reminder
 */

import { notifyUser, notifyMultiple } from "@/lib/novu-triggers";
import { NOVU_WORKFLOWS, novuSubscriberId } from "@/lib/novu";

// ---------------------------------------------------------------------------
// Internal helper: build a Novu recipient from a Lead record
// ---------------------------------------------------------------------------
function _leadToRecipient(siteId, lead) {
  // Use lead email as subscriber ID for external/non-User leads
  // Prefix with "lead_" to distinguish from admin User subscribers
  const subscriberId = `lead_${siteId}_${lead.id}`;
  return {
    subscriberId,
    email: lead.email,
    firstName: (lead.name || "").split(" ")[0] || "",
    lastName: (lead.name || "").split(" ").slice(1).join(" ") || "",
    ...(lead.phone && { phone: lead.phone }),
  };
}

// ---------------------------------------------------------------------------
// 1. Service Booked
//    Fires when: a booking form is submitted → Lead created
// ---------------------------------------------------------------------------

/**
 * Trigger a booking confirmation notification to the lead (customer).
 *
 * @param {string} siteId
 * @param {object} lead     - Prisma Lead record { id, name, email, phone, serviceInterest, notes }
 * @param {object} [service] - Optional Service record for additional context
 * @returns {Promise<object|null>}
 */
export async function triggerServiceBooked(siteId, lead, service = null) {
  const recipient = _leadToRecipient(siteId, lead);

  const payload = {
    // Lead data
    clientName:      lead.name     || "Valued Client",
    clientEmail:     lead.email,
    clientPhone:     lead.phone    || "",

    // Service / package data
    serviceName:     service?.title || lead.serviceInterest || "Media Package",
    servicePrice:    service?.price || "",
    serviceDesc:     service?.description || "",

    // Booking meta
    timeline:        lead.notes?.match(/Timeline:\s*(.+)/)?.[1] || "",
    leadId:          lead.id,
    sourcePage:      lead.sourcePage || "Services",

    // Action URL for admin to view this lead
    adminLeadUrl:    `${process.env.NEXTAUTH_URL || ""}/dashboard/crm/leads`,

    // For customer-facing email body
    message:         `Thank you for your interest in ${service?.title || "our services"}! We have received your booking request and our team will be in touch within 24 hours.`,
  };

  return notifyUser(
    recipient.subscriberId,
    NOVU_WORKFLOWS.SERVICE_BOOKED,
    payload,
    {
      siteId,
      email:     recipient.email,
      firstName: recipient.firstName,
      lastName:  recipient.lastName,
      phone:     recipient.phone,
    }
  );
}

/**
 * Trigger a booking alert to an admin/PR team member.
 * Fires alongside triggerServiceBooked() to notify internal staff.
 *
 * @param {string} siteId
 * @param {object} lead
 * @param {object} [service]
 * @param {string} adminUserId    - User.id of the team member to notify
 * @param {string} adminEmail     - Team member email
 * @param {string} [adminName]    - Team member display name
 * @returns {Promise<object|null>}
 */
export async function triggerServiceBookedAdminAlert(
  siteId,
  lead,
  service = null,
  adminUserId,
  adminEmail,
  adminName = "Team"
) {
  const subscriberId = novuSubscriberId(siteId, adminUserId);

  const payload = {
    clientName:    lead.name  || "Unknown",
    clientEmail:   lead.email,
    clientPhone:   lead.phone || "",
    serviceName:   service?.title || lead.serviceInterest || "Media Package",
    leadId:        lead.id,
    adminLeadUrl:  `${process.env.NEXTAUTH_URL || ""}/dashboard/crm/leads`,
    message:       `New booking from ${lead.name || lead.email} for ${service?.title || lead.serviceInterest || "a service"}.`,
    title:         `New Booking: ${lead.name || lead.email}`,
  };

  return notifyUser(
    subscriberId,
    NOVU_WORKFLOWS.SERVICE_BOOKED,
    payload,
    { siteId, email: adminEmail, firstName: adminName }
  );
}

// ---------------------------------------------------------------------------
// 2. Lead / Service Status Changed
//    Fires when: admin updates lead.status (e.g., new → confirmed → won)
// ---------------------------------------------------------------------------

const STATUS_LABELS = {
  new:        "Received",
  reviewing:  "Under Review",
  confirmed:  "Confirmed",
  won:        "Approved",
  converted:  "Completed",
  lost:       "Cancelled",
  cancelled:  "Cancelled",
};

/**
 * Trigger a status-change notification to the lead (customer).
 *
 * @param {string} siteId
 * @param {object} lead       - Updated Lead record
 * @param {string} oldStatus  - Previous status value
 * @param {string} newStatus  - New status value
 * @returns {Promise<object|null>}
 */
export async function triggerLeadStatusChanged(siteId, lead, oldStatus, newStatus) {
  // Don't notify on trivially minor status changes (e.g., new → reviewing)
  const significantStatuses = ["confirmed", "won", "converted", "lost", "cancelled"];
  if (!significantStatuses.includes(newStatus)) return null;

  const recipient = _leadToRecipient(siteId, lead);
  const statusLabel = STATUS_LABELS[newStatus] || newStatus;

  const payload = {
    clientName:    lead.name || "Valued Client",
    clientEmail:   lead.email,
    serviceName:   lead.serviceInterest || "Media Package",
    oldStatus:     STATUS_LABELS[oldStatus] || oldStatus,
    newStatus:     statusLabel,
    leadId:        lead.id,
    message:       _getStatusMessage(newStatus, lead),
    title:         `Your booking status: ${statusLabel}`,
    adminLeadUrl:  `${process.env.NEXTAUTH_URL || ""}/dashboard/crm/leads`,
  };

  return notifyUser(
    recipient.subscriberId,
    NOVU_WORKFLOWS.SERVICE_STATUS_CHANGED,
    payload,
    {
      siteId,
      email:     recipient.email,
      firstName: recipient.firstName,
    }
  );
}

function _getStatusMessage(status, lead) {
  const name = lead.serviceInterest || "your requested service";
  switch (status) {
    case "confirmed":
      return `Great news! Your booking for ${name} has been confirmed. Our team will reach out shortly with next steps.`;
    case "won":
    case "converted":
      return `Your booking for ${name} has been approved and is now complete. Thank you for choosing us!`;
    case "lost":
    case "cancelled":
      return `We regret to inform you that your booking for ${name} could not be accommodated at this time. Please contact us if you have questions.`;
    default:
      return `Your booking status has been updated to: ${STATUS_LABELS[status] || status}.`;
  }
}

// ---------------------------------------------------------------------------
// 3. Service Updated (admin edits a service record)
//    Fires when: admin updates a Service that has active/new leads
// ---------------------------------------------------------------------------

/**
 * Trigger update notifications to multiple leads associated with a service.
 *
 * @param {string}   siteId
 * @param {object}   service      - Updated Service record { title, description, price }
 * @param {object[]} leads        - Array of Lead records associated with this service
 * @returns {Promise<object|null>}
 */
export async function triggerServiceUpdated(siteId, service, leads = []) {
  if (leads.length === 0) return null;

  const recipients = leads.map((lead) => _leadToRecipient(siteId, lead));

  const payload = {
    serviceName:  service.title,
    serviceDesc:  service.description || "",
    servicePrice: service.price       || "",
    message:      `We have updated information about ${service.title}. Please review the latest details.`,
    title:        `Update: ${service.title}`,
    adminLeadUrl: `${process.env.NEXTAUTH_URL || ""}/dashboard/crm/leads`,
  };

  return notifyMultiple(
    recipients,
    NOVU_WORKFLOWS.SERVICE_UPDATED,
    payload,
    { siteId }
  );
}

// ---------------------------------------------------------------------------
// 4. Service Reminder (24h before appointment / deadline)
//    Fires from: /api/cron/service-reminders
// ---------------------------------------------------------------------------

/**
 * Trigger a reminder notification to a lead about an upcoming service.
 *
 * @param {string} siteId
 * @param {object} lead           - Lead record
 * @param {object} [service]      - Related Service record
 * @param {number} [hoursUntil=24] - Hours until the appointment / deadline
 * @returns {Promise<object|null>}
 */
export async function triggerServiceReminder(
  siteId,
  lead,
  service = null,
  hoursUntil = 24
) {
  const recipient = _leadToRecipient(siteId, lead);
  const timeLabel = hoursUntil === 24 ? "tomorrow" : `in ${hoursUntil} hours`;

  const payload = {
    clientName:    lead.name || "Valued Client",
    clientEmail:   lead.email,
    serviceName:   service?.title || lead.serviceInterest || "your booked service",
    hoursUntil,
    timeLabel,
    message:       `This is a friendly reminder about your upcoming session for ${service?.title || lead.serviceInterest || "your booked service"} — it's ${timeLabel}!`,
    title:         `Reminder: Your session is ${timeLabel}`,
    leadId:        lead.id,
  };

  return notifyUser(
    recipient.subscriberId,
    NOVU_WORKFLOWS.SERVICE_REMINDER,
    payload,
    {
      siteId,
      email:     recipient.email,
      firstName: recipient.firstName,
    }
  );
}
