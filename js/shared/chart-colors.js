export const palette = Object.freeze([
  "#D39B84",
  "#AFCFBF",
  "#E7C8A5",
  "#B9B7D9",
  "#9EC8D8",
  "#E3B5C2",
  "#C7D8A3",
  "#D7BFA8"
]);

function clampAlpha(value) {
  const safe = Number(value);
  if (!Number.isFinite(safe)) {
    return 1;
  }
  return Math.max(0, Math.min(1, safe));
}

export function hexToRgba(hex, alpha) {
  const clean = String(hex || "").replace("#", "").trim();
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    return `rgba(200, 107, 74, ${clampAlpha(alpha)})`;
  }

  const r = Number.parseInt(clean.slice(0, 2), 16);
  const g = Number.parseInt(clean.slice(2, 4), 16);
  const b = Number.parseInt(clean.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
}

export function getSequentialColors(count) {
  const total = Math.max(0, Number.parseInt(count, 10) || 0);
  if (total === 0) {
    return [];
  }

  if (palette.length === 1) {
    return Array.from({ length: total }, () => palette[0]);
  }

  return Array.from({ length: total }, (_, index) => {
    const color = palette[index % palette.length];
    const previous = index > 0 ? palette[(index - 1) % palette.length] : null;
    if (color !== previous) {
      return color;
    }

    return palette[(index + 1) % palette.length];
  });
}

export function withAlpha(colorOrColors, alpha) {
  const safeAlpha = clampAlpha(alpha);
  if (Array.isArray(colorOrColors)) {
    return colorOrColors.map((color) => hexToRgba(color, safeAlpha));
  }

  return hexToRgba(colorOrColors, safeAlpha);
}
