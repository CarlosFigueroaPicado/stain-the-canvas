type Product = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  description: string;
  price: number;
  imageUrl: string;
  galleryUrls: string[];
  videoUrl?: string | null;
};

function formatPrice(value: number) {
  return `C$${Number(value || 0).toFixed(2)}`;
}

function getCatalogProducts(): Product[] {
  const source = document.getElementById('catalogData');
  if (!source?.textContent) return [];

  try {
    const parsed = JSON.parse(source.textContent) as { products?: Product[] };
    return Array.isArray(parsed.products) ? parsed.products : [];
  } catch {
    return [];
  }
}

function setModalProduct(product: Product, imageIndex: number) {
  const gallery = product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl];
  const safeIndex = Math.max(0, Math.min(imageIndex, gallery.length - 1));
  const image = document.getElementById('productModalImage') as HTMLImageElement | null;
  const videoWrap = document.querySelector<HTMLElement>('[data-product-modal-video-wrap]');
  const video = document.querySelector<HTMLVideoElement>('[data-product-modal-video]');
  const consult = document.querySelector('[data-product-modal-consult]') as HTMLAnchorElement | null;
  const posterUrl = gallery[safeIndex] || product.imageUrl;

  if (image) {
    image.src = posterUrl;
    image.alt = product.name;
    image.dataset.index = String(safeIndex);
  }

  if (videoWrap && video) {
    if (product.videoUrl) {
      video.src = product.videoUrl;
      video.poster = posterUrl;
      videoWrap.hidden = false;
    } else {
      video.pause();
      video.removeAttribute('src');
      video.removeAttribute('poster');
      video.load();
      videoWrap.hidden = true;
    }
  }

  document.getElementById('productModalTitle')!.textContent = product.name;
  document.getElementById('productModalCategory')!.textContent = product.category;
  document.getElementById('productModalSubcategory')!.textContent = product.subcategory || 'Sin subcategoría';
  document.getElementById('productModalPrice')!.textContent = formatPrice(product.price);
  document.getElementById('productModalDescription')!.textContent = product.description;

  if (consult) {
    consult.href = `https://wa.me/?text=${encodeURIComponent(`Hola, quiero consultar por ${product.name}`)}`;
  }

  const dots = document.querySelector('[data-product-modal-dots]');
  if (dots) {
    dots.innerHTML = gallery
      .map((_, index) => `<span class="product-modal__dot${index === safeIndex ? ' is-active' : ''}"></span>`)
      .join('');
  }
}

function openModal(product: Product) {
  const modal = document.querySelector('[data-product-modal]');
  if (!modal) return;

  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('has-modal');
  setModalProduct(product, 0);
}

function closeModal() {
  const modal = document.querySelector('[data-product-modal]');
  if (!modal) return;

  const video = document.querySelector<HTMLVideoElement>('[data-product-modal-video]');
  if (video) {
    video.pause();
  }

  modal.setAttribute('aria-hidden', 'true');
  document.body.classList.remove('has-modal');
}

function applySearchFilter(query: string) {
  const normalizedQuery = query.trim().toLowerCase();

  document.querySelectorAll<HTMLElement>('[data-product-card]').forEach((card) => {
    const haystack = `${card.dataset.name || ''} ${card.dataset.category || ''} ${card.dataset.subcategory || ''}`.toLowerCase();
    card.hidden = Boolean(normalizedQuery) && !haystack.includes(normalizedQuery);
  });
}

function bindDropdowns() {
  document.querySelectorAll('[data-category-trigger]').forEach((trigger) => {
    trigger.addEventListener('click', () => {
      const dropdown = trigger.closest('[data-category-dropdown]');
      document.querySelectorAll('[data-category-dropdown]').forEach((item) => {
        if (item !== dropdown) item.classList.remove('is-open');
      });
      dropdown?.classList.toggle('is-open');
    });
  });

  document.querySelectorAll<HTMLElement>('[data-subcategory-filter]').forEach((button) => {
    button.addEventListener('click', () => {
      const search = document.getElementById('catalogSearch') as HTMLInputElement | null;
      if (!search) return;

      search.value = button.dataset.subcategoryFilter || '';
      applySearchFilter(search.value);
    });
  });
}

function bindModal(products: Product[]) {
  document.querySelectorAll<HTMLElement>('[data-product-card]').forEach((card) => {
    card.addEventListener('click', () => {
      const product = products[Number(card.dataset.productIndex)];
      if (product) openModal(product);
    });
  });

  document.querySelector('[data-product-modal-close]')?.addEventListener('click', closeModal);
  document.querySelector('[data-product-modal]')?.addEventListener('click', (event) => {
    if (event.target === event.currentTarget) closeModal();
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModal();
  });

  document.querySelector('[data-product-modal-prev]')?.addEventListener('click', () => {
    const products = getCatalogProducts();
    const title = document.getElementById('productModalTitle')?.textContent || '';
    const product = products.find((item) => item.name === title);
    const image = document.getElementById('productModalImage') as HTMLImageElement | null;
    if (!product || !image) return;

    const gallery = product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl];
    const current = Number(image.dataset.index || 0);
    setModalProduct(product, (current - 1 + gallery.length) % gallery.length);
  });

  document.querySelector('[data-product-modal-next]')?.addEventListener('click', () => {
    const products = getCatalogProducts();
    const title = document.getElementById('productModalTitle')?.textContent || '';
    const product = products.find((item) => item.name === title);
    const image = document.getElementById('productModalImage') as HTMLImageElement | null;
    if (!product || !image) return;

    const gallery = product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl];
    const current = Number(image.dataset.index || 0);
    setModalProduct(product, (current + 1) % gallery.length);
  });
}

export function initCatalog() {
  const products = getCatalogProducts();
  const search = document.getElementById('catalogSearch') as HTMLInputElement | null;

  search?.addEventListener('input', () => applySearchFilter(search.value));
  bindDropdowns();
  bindModal(products);
}
