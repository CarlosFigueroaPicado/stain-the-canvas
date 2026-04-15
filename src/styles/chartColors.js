(function chartColorsModule() {
  const palette = Object.freeze([
    "#D39B84", // terracota suave
    "#AFCFBF", // salvia pastel
    "#E7C8A5", // arena melocoton
    "#B9B7D9", // lavanda grisacea
    "#9EC8D8", // azul niebla
    "#E3B5C2", // rosa empolvado
    "#C7D8A3", // verde seco
    "#D7BFA8" // beige calido
  ]);

  function clampAlpha(value) {
    const safe = Number(value);
    if (!Number.isFinite(safe)) {
      return 1;
    }
    return Math.max(0, Math.min(1, safe));
  }

  function hexToRgba(hex, alpha) {
    const clean = String(hex || "").replace("#", "").trim();
    if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
      return `rgba(200, 107, 74, ${clampAlpha(alpha)})`;
    }

    const r = Number.parseInt(clean.slice(0, 2), 16);
    const g = Number.parseInt(clean.slice(2, 4), 16);
    const b = Number.parseInt(clean.slice(4, 6), 16);
    return `rgba(${r}, ${g}, ${b}, ${clampAlpha(alpha)})`;
  }

  function getSequentialColors(count) {
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

  function withAlpha(colorOrColors, alpha) {
    const safeAlpha = clampAlpha(alpha);
    if (Array.isArray(colorOrColors)) {
      return colorOrColors.map((color) => hexToRgba(color, safeAlpha));
    }
    return hexToRgba(colorOrColors, safeAlpha);
  }

  const module = Object.freeze({
    palette,
    getSequentialColors,
    withAlpha,
    hexToRgba
  });

  if (typeof globalThis !== "undefined") {
    globalThis.stcChartColors = module;
  }
})();
