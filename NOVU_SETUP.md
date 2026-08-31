# Novu Push Notification Setup Guide

This document explains how Novu is configured in the AHP application.
Novu is used **exclusively for Push Notifications & In-App Push Notifications** (`push-notification` workflow).

Email campaigns, service confirmation emails, and other system emails continue to use the application's native email system (`email.service.js` / BullMQ / SMTP / Resend).

---

## 1. Account Setup

1. Sign up or log in at **https://app.novu.co**
2. Go to **Settings → API Keys**
3. Copy:
   - **API Key** (secret) → `NOVU_API_KEY` in `.env`
   - **Application Identifier** (public) → `NEXT_PUBLIC_NOVU_APP_ID` in `.env`

---

## 2. Create Workflows in the Dashboard

Navigate to **Workflows → Create Workflow** for each of the following.

> **Important**: The "Workflow Identifier" field must match exactly what is
> configured in your `.env` (default values shown below). Identifiers are
> lowercase-kebab-case and cannot contain spaces.

### 2.1 `push-notification` (already in use)

| Field | Value |
|---|---|
| **Name** | Push Notification |
| **Identifier** | `push-notification` |
| **Steps** | Push → In-App |
| **Channels** | Push, In-App |

**Push step template:**
```
Title:   {{payload.title}}
Content: {{payload.message}}
URL:     {{payload.url}}
```

---

### 2.2 `service-booked` — Booking Confirmation

| Field | Value |
|---|---|
| **Name** | Service Booked |
| **Identifier** | `service-booked` |
| **Steps** | Email → Push → In-App |

**Email step template:**
```
Subject: Your booking request has been received — {{payload.serviceName}}

Hi {{payload.clientName}},

{{payload.message}}

Your booking details:
- Service: {{payload.serviceName}}
- Timeline: {{payload.timeline}}

We'll be in touch within 24 hours.

— The AHP Team
```

**Push / In-App step template:**
```
Title:   {{payload.title}}
Content: {{payload.message}}
```

---

### 2.3 `service-status-changed` — Lead Status Update

| Field | Value |
|---|---|
| **Name** | Service Status Changed |
| **Identifier** | `service-status-changed` |
| **Steps** | Email → Push → In-App |

**Email step template:**
```
Subject: Update on your booking — {{payload.newStatus}}

Hi {{payload.clientName}},

{{payload.message}}

Service: {{payload.serviceName}}
Status:  {{payload.newStatus}}

If you have questions, reply to this email.

— The AHP Team
```

---

### 2.4 `service-updated` — Service Record Changed

| Field | Value |
|---|---|
| **Name** | Service Updated |
| **Identifier** | `service-updated` |
| **Steps** | Email → In-App |

**Email step template:**
```
Subject: Update: {{payload.serviceName}}

Hi there,

{{payload.message}}

{{#if payload.servicePrice}}
Price: {{payload.servicePrice}}
{{/if}}

— The AHP Team
```

---

### 2.5 `service-reminder` — 24h Appointment Reminder

| Field | Value |
|---|---|
| **Name** | Service Reminder |
| **Identifier** | `service-reminder` |
| **Steps** | Email → Push |

**Email step template:**
```
Subject: Reminder: {{payload.serviceName}} is {{payload.timeLabel}}

Hi {{payload.clientName}},

{{payload.message}}

See you soon!

— The AHP Team
```

---

### 2.6 `email-campaign` — Optional Campaign via Novu

| Field | Value |
|---|---|
| **Name** | Email Campaign |
| **Identifier** | `email-campaign` |
| **Steps** | Email |

**Email step template:**
```
Subject: {{payload.subject}}

{{payload.body}}
```

> Only used when `NOVU_ENABLE_CAMPAIGN_TRIGGER=true`. Otherwise campaigns
> are delivered entirely via the existing BullMQ + nodemailer/Resend path.

---

### 2.7 `welcome-user` — New User Welcome

| Field | Value |
|---|---|
| **Name** | Welcome User |
| **Identifier** | `welcome-user` |
| **Steps** | Email → In-App |

---

## 3. Configure Email Provider in Novu

For Novu to send emails through its workflows, you need to connect an email provider.

1. Go to **Integrations → Email**
2. Choose your provider:

   | Provider | What to enter |
   |---|---|
   | **Resend** | API Key from resend.com dashboard |
   | **SendGrid** | API Key from SendGrid |
   | **SMTP** | Host, port, username, password |

3. Set the **From Email** and **From Name**
4. Save and test the integration

> **Note**: This is separate from the SMTP/Resend config in `GlobalSettings.emailSettings`
> (which is used by the existing BullMQ email path). Novu has its own provider registry.

---

## 4. Configure Push Provider in Novu (optional)

For web/mobile push notifications:

1. Go to **Integrations → Push**
2. Choose **Firebase Cloud Messaging (FCM)** for web/Android push
3. Enter your FCM Server Key
   - Firebase Console → Project Settings → Cloud Messaging → Server Key
4. To capture browser push tokens, you need a service worker (out of scope here;
   Novu's client SDK handles this automatically when installed on the frontend).

> The current `push.service.js` uses Novu **Topics** to broadcast to segments.
> This works for in-app and any push provider configured in Novu.

---

## 5. Set Up Topics (Segments)

Topics let you broadcast to groups of subscribers without listing each ID.

1. Go to **Topics** in the Novu dashboard (or use the API)
2. Create a topic with key `subscribed-users` for the default push segment
3. Add subscriber IDs to this topic as users opt in

You can also manage topics via the Novu API:
```bash
# Create topic
curl -X POST https://api.novu.co/v1/topics \
  -H "Authorization: ApiKey YOUR_NOVU_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{ "key": "subscribed-users", "name": "Subscribed Users" }'
```

---

## 6. Sync Subscribers

After setting up workflows, sync your existing users to Novu:

```bash
curl -X POST https://yourdomain.com/api/novu/sync-subscriber \
  -H "Content-Type: application/json" \
  -H "Cookie: next-auth.session-token=YOUR_SESSION_TOKEN"
```

Or call it from the admin dashboard. This upserts all active `User` records
into Novu using the `<siteId>_<userId>` subscriber ID convention.

---

## 7. In-App Notification Bell

To show the notification bell in the admin dashboard:

1. Install the Novu React package:
   ```bash
   npm install @novu/react
   ```

2. Import and use the component in your dashboard layout:
   ```jsx
   import NovuNotificationBell from "@/components/NovuNotificationBell";

   // Inside your layout JSX where session is available:
   <NovuNotificationBell userId={session.user.id} siteId="AHP" />
   ```

3. `NEXT_PUBLIC_NOVU_APP_ID` must be set in `.env`.

---

## 8. Service Reminders Cron

To activate 24h service reminders:

**Option A — Vercel Cron** (recommended):
Add to `vercel.json`:
```json
{
  "crons": [{
    "path": "/api/cron/service-reminders",
    "schedule": "0 8 * * *"
  }]
}
```
Then set `CRON_SECRET` in Vercel environment variables.

**Option B — External cron** (cron-job.org, GitHub Actions):
```
GET https://yourdomain.com/api/cron/service-reminders
Header: Authorization: Bearer YOUR_CRON_SECRET
```

---

## 9. Testing

### Test subscriber sync
```bash
POST /api/novu/sync-subscriber
Body: { "userId": "YOUR_USER_ID" }
```
Then check **Novu Dashboard → Subscribers** for your user.

### Test a workflow trigger
```bash
POST /api/novu/service-events
Body: {
  "event": "test",
  "workflowId": "push-notification",
  "subscriberId": "AHP_YOUR_USER_ID",
  "payload": { "title": "Test!", "message": "Hello from AHP" }
}
```
Check **Novu Dashboard → Activity Feed** for the trigger.

### Test service-booked (end-to-end)
```bash
POST /api/services/booking
Body: {
  "fullName": "Test User",
  "email": "test@example.com",
  "mediaPackage": "Podcast Package",
  "timeline": "1 month",
  "story": "Test booking"
}
```
Both the customer confirmation and PR team alert should appear in the Activity Feed.

### Test cron (locally)
```bash
GET /api/cron/service-reminders
# CRON_SECRET not needed in development
```

---

## 10. Where Each Novu Call is Hooked In

| Event | File | Function called |
|---|---|---|
| New booking form submitted | `api/services/booking/route.js` | `triggerServiceBooked()` + `triggerServiceBookedAdminAlert()` |
| Lead status changed | `api/novu/service-events/route.js` | `triggerLeadStatusChanged()` |
| Service record updated | `api/novu/service-events/route.js` | `triggerServiceUpdated()` |
| 24h reminder cron | `api/cron/service-reminders/route.js` | `triggerServiceReminder()` |
| Bulk push send | `services/push.service.js` → `sendPushNotification()` | `novu.trigger()` via centralized client |
| Email campaign send | `services/campaign.service.js` → `executeCampaign()` | `notifyMultiple()` (when `NOVU_ENABLE_CAMPAIGN_TRIGGER=true`) |
| Admin subscriber sync | `api/novu/sync-subscriber/route.js` | `bulkSyncNovuSubscribers()` |
| User preference update | `api/novu/preferences/route.js` | `updateNovuPreferences()` |

---

## Subscriber ID Convention

All Novu subscriber IDs in this app follow the pattern: `<siteId>_<userId>`

- Admin users: `AHP_clxyz1234` (User.id)
- Leads/customers: `lead_AHP_clxyz1234` (Lead.id)
- PR team: `pr-team` (static, well-known)

This prevents ID collisions when multiple sites share the same Novu account.
