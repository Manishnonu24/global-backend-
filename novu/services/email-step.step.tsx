import { step } from '@novu/framework/step-resolver';

export default step.email(
  'email-step',
  async (controls, { payload, subscriber }) => ({
    subject: controls.subject,
    body: `
      <html>
        <body>
          <h1>${controls.heading}</h1>
          <p>Hi ${subscriber.firstName ?? 'there'},</p>
          <p>${controls.body}</p>
          <p><a href="${controls.ctaUrl}">View details</a></p>
        </body>
      </html>
    `,
    // Optionally override the sender for this step:
    // from: { email: 'noreply@example.com', name: 'My App' },
  }),
  {
    controlSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', default: 'You have a new notification' },
        heading: { type: 'string', default: 'New activity' },
        body: { type: 'string', default: 'You have a new message.' },
        ctaUrl: { type: 'string', default: '/' },
      },
      additionalProperties: false,
    } as const,
    // skip: (_controls, { subscriber }) => !subscriber.email,
  }
);
