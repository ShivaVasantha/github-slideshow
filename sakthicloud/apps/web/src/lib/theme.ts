// Per-tenant white-label theming via CSS variables. The prototype carried 16
// inline-style theme objects; here each becomes a token set applied to :root,
// so switching a tenant's brand is just swapping variable values (no re-render
// of styled components). Three representative presets are included; the full 16
// port over as more token sets with zero structural change.

export interface ThemeTokens {
  bg: string;
  surface: string;
  surfaceAlt: string;
  border: string;
  text: string;
  dim: string;
  primary: string;
  primaryText: string;
  accent: string;
  ok: string;
  warn: string;
  danger: string;
}

export interface ThemePreset {
  id: string;
  name: string;
  tokens: ThemeTokens;
}

export const THEME_PRESETS: ThemePreset[] = [
  {
    id: "sakthi-ivory",
    name: "Sakthi Ivory",
    tokens: {
      bg: "#f6f3ec", surface: "#fffdf8", surfaceAlt: "#f1ece0", border: "#e4ddcd",
      text: "#2c2a24", dim: "#7a7364", primary: "#8a6d3b", primaryText: "#fffdf8",
      accent: "#b8925a", ok: "#4b8b5a", warn: "#c08a2d", danger: "#b4513f",
    },
  },
  {
    id: "royal-porcelain",
    name: "Royal Porcelain",
    tokens: {
      bg: "#f2f4f8", surface: "#ffffff", surfaceAlt: "#eaeef5", border: "#dbe1ec",
      text: "#1f2733", dim: "#66707f", primary: "#2f4a7c", primaryText: "#ffffff",
      accent: "#5b7bb4", ok: "#3f8f6a", warn: "#c08a2d", danger: "#c0473f",
    },
  },
  {
    id: "emerald-garden",
    name: "Emerald Garden",
    tokens: {
      bg: "#f1f6f2", surface: "#ffffff", surfaceAlt: "#e6efe8", border: "#d5e4d8",
      text: "#20302a", dim: "#5f7168", primary: "#2c6b4f", primaryText: "#ffffff",
      accent: "#559a76", ok: "#3f8f6a", warn: "#c08a2d", danger: "#c0473f",
    },
  },
];

export const DEFAULT_THEME_ID = "sakthi-ivory";

export function applyTheme(preset: ThemePreset) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(preset.tokens)) {
    root.style.setProperty(`--sc-${key}`, value);
  }
  root.dataset.theme = preset.id;
}

export function getPreset(id: string): ThemePreset {
  return THEME_PRESETS.find((p) => p.id === id) ?? THEME_PRESETS[0];
}
