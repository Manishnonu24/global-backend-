import { step } from '@novu/framework/step-resolver';

export default step.push(
  'push-step',
  async (controls, { payload, subscriber }) => ({
    subject: controls.title,
    body: controls.body,
  }),
  {
    controlSchema: {
      type: 'object',
      properties: {
        title: { type: 'string', default: 'New activity' },
        body: { type: 'string', default: 'You have a new notification.' },
      },
      additionalProperties: false,
    } as const,
    // skip: (_controls, { subscriber }) => !subscriber.channels?.push,
  }
);
