import { step } from '@novu/framework/step-resolver';

export default step.inApp(
  'in-app-step',
  async (controls, { payload, subscriber }) => ({
    subject: controls.subject,
    body: controls.body,
    // avatar: subscriber.avatar,
    primaryAction: {
      label: controls.ctaLabel,
      redirect: { url: controls.ctaUrl, target: '_blank' },
    },
    // secondaryAction: { label: 'Dismiss' },
  }),
  {
    controlSchema: {
      type: 'object',
      properties: {
        subject: { type: 'string', default: 'New activity' },
        body: { type: 'string', default: 'You have a new notification.' },
        ctaLabel: { type: 'string', default: 'View details' },
        ctaUrl: { type: 'string', default: '/' },
      },
      additionalProperties: false,
    } as const,
    // skip: (_controls, { subscriber }) => !subscriber.channels?.in_app,
  }
);
