export function shouldUseCarousel(images) {
  console.assert(images == null || Array.isArray(images), "shouldUseCarousel esperaba null o un arreglo de imagenes");

  if (!Array.isArray(images)) {
    return false;
  }

  const totalImages = images.map((item) => String(item || "").trim()).filter(Boolean).length;
  return totalImages > 1;
}
