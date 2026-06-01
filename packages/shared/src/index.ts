import { z } from "zod";

export const LAYOUTS = ["hero", "split", "grid", "minimal"] as const;
export const LayoutSchema = z.enum(LAYOUTS);
export type MockLayout = (typeof LAYOUTS)[number];

export const CategorySchema = z.object({
  id: z.string(), // 퍼블릭 식별자 = slug ("cafe")
  label: z.string(),
});
export type Category = z.infer<typeof CategorySchema>;

export const ShowcaseSchema = z.object({
  id: z.string(), // 퍼블릭 식별자 = slug ("cafe-bloom")
  title: z.string(),
  blurb: z.string(),
  category: z.string(), // category slug
  accent: z.string(),
  layout: LayoutSchema,
  desktop: z.string().nullable(),
  mobile: z.string().nullable(),
  thumb: z.string().nullable(),
});
export type Showcase = z.infer<typeof ShowcaseSchema>;

export const ShowcaseListSchema = z.object({
  items: z.array(ShowcaseSchema),
  nextCursor: z.string().nullable(),
});
export type ShowcaseList = z.infer<typeof ShowcaseListSchema>;
