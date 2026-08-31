import { z } from "zod";

export const CtaConfigSchema = z.object({
  main: z
    .object({
      text: z.string().optional(),
      link: z.string().optional(),
      icon: z.string().optional(),
    })
    .passthrough()
    .optional(),

  floatingButtons: z
    .array(
      z.object({
        id: z.string(),
        label: z.string(),
        link: z.string().optional(),
        icon: z.string().optional(),
        position: z.string().optional(),
        color: z.string().optional(),
        textColor: z.string().optional(),
        enabled: z.boolean().optional(),
      }).passthrough()
    )
    .optional(),

  popups: z
    .array(
      z.object({
        id: z.string(),
        title: z.string(),
        body: z.string().optional(),
        type: z.string().optional(),
        buttonText: z.string().optional(),
        buttonLink: z.string().optional(),
        triggerOn: z.string().optional(),
        triggerValue: z.string().optional(),
        showOnce: z.boolean().optional(),
      }).passthrough()
    )
    .optional(),
});
