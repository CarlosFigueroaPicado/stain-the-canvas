export function shouldUseCarousel(images) {
  if (!Array.isArray(images)) {
    return false;
  }

  const valid = images.map((item) => String(item || "").trim()).filter(Boolean);
  return valid.length > 1;
}
