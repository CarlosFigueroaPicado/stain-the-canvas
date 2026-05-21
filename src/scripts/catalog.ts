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

type ProductMediaItem =
  | { type: 'image'; url: string }
  | { type: 'video'; url: string };

let currentModalProduct: Product | null = null;
let currentModalMediaIndex = 0;
let touchStartX: number | null = null;

function formatPrice(value: number) {
  return `C$${Number(value || 0).toFixed(2)}`;
}

function getProductMedia(product: Product): ProductMediaItem[] {
  const images = product.galleryUrls.length > 0 ? product.galleryUrls : [product.imageUrl].filter(Boolean);
  const media: ProductMediaItem[] = images.map((url) => ({ type: 'image', url }));

  if (product.videoUrl) {
    media.push({ type: 'video', url: product.videoUrl });
  }

  return media;
}

function getCurrentMediaState(product: Product, mediaIndex: number) {
  const media = getProductMedia(product);
  const safeIndex = Math.max(0, Math.min(mediaIndex, media.length - 1));
  return { media, safeIndex, current: media[safeIndex] || media[0] || null };
}

function renderModalStage(product: Product, current: ProductMediaItem | null) {
  const stage = document.querySelector<HTMLElement>('[data-product-modal-stage]');
  if (!stage) return;

  if (!current) {
    stage.innerHTML = '';
    return;
  }

  if (current.type === 'video') {
    stage.innerHTML = `
      <video class="product-modal__stage-media" controls playsinline preload="metadata" poster="${product.galleryUrls[0] || product.imageUrl}">
        <source src="${current.url}">
      </video>`;
    return;
  }

  stage.innerHTML = `
    <img class="product-modal__stage-media" src="${current.url}" alt="${product.name}">`;
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
  const { media, safeIndex, current } = getCurrentMediaState(product, imageIndex);
  const consult = document.querySelector('[data-product-modal-consult]') as HTMLAnchorElement | null;

  renderModalStage(product, current);

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
    dots.innerHTML = media
      .map((_, index) => `<span class="product-modal__dot${index === safeIndex ? ' is-active' : ''}"></span>`)
      .join('');
  }

  currentModalProduct = product;
  currentModalMediaIndex = safeIndex;
}

function stepModalProduct(delta: number) {
  if (!currentModalProduct) return;

  const media = getProductMedia(currentModalProduct);
  if (media.length === 0) return;

  const nextIndex = (currentModalMediaIndex + delta + media.length) % media.length;
  setModalProduct(currentModalProduct, nextIndex);
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

  const stage = document.querySelector<HTMLElement>('[data-product-modal-stage]');
  if (stage) stage.innerHTML = '';

  currentModalProduct = null;
  currentModalMediaIndex = 0;

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
    stepModalProduct(-1);
  });

  document.querySelector('[data-product-modal-next]')?.addEventListener('click', () => {
    stepModalProduct(1);
  });

  const stage = document.querySelector<HTMLElement>('[data-product-modal-stage]');
  if (stage && !stage.dataset.swipeBound) {
    stage.dataset.swipeBound = 'true';

    stage.addEventListener('touchstart', (event) => {
      touchStartX = event.touches[0]?.clientX ?? null;
    }, { passive: true });

    stage.addEventListener('touchend', (event) => {
      if (touchStartX === null) return;

      const touchEndX = event.changedTouches[0]?.clientX ?? null;
      if (touchEndX === null) return;

      const deltaX = touchEndX - touchStartX;
      touchStartX = null;

      if (Math.abs(deltaX) < 45) return;

      if (deltaX < 0) {
        stepModalProduct(1);
      } else {
        stepModalProduct(-1);
      }
    });
  }
}

export function initCatalog() {
  const products = getCatalogProducts();
  const search = document.getElementById('catalogSearch') as HTMLInputElement | null;

  search?.addEventListener('input', () => applySearchFilter(search.value));
  bindDropdowns();
  bindModal(products);
}
