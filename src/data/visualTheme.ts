/** Semantic display colors reference the shared CSS palette, never financial assumptions. */
export type SectionTheme =
  "profile" | "assets" | "lifestyle" | "family" | "legacy";

export const assetColors = [
  "var(--sage)",
  "var(--amber)",
  "var(--blue)",
  "var(--lavender)",
  "var(--rose)",
];

export const scenarioAppearance: Record<
  string,
  { theme: SectionTheme; stroke: string; dash: string }
> = {
  conservative: { theme: "assets", stroke: "var(--blue-strong)", dash: "8 5" },
  base: { theme: "profile", stroke: "var(--sage-strong)", dash: "" },
  optimistic: {
    theme: "lifestyle",
    stroke: "var(--lavender-strong)",
    dash: "3 4",
  },
  custom: { theme: "legacy", stroke: "var(--amber-strong)", dash: "10 3 2 3" },
};
