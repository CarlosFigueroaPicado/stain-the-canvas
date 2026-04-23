import { subscribe } from "../../../core/store.js";
import { getProducts } from "../service.js";
import { buildWhatsappLink, escapeHtml, formatCurrency, getProductImageUrls } from "../../../shared/product-utils.js";
import { trackEvent, trackVisit } from "../../analytics/service.js";
import { loadAppConfig } from "../../../core/config.js";

function pickHomeProductsSource(products) {
  const source = Array.isArray(products) ? products : [];
  const rankedByClicks = source
    .filter((product) => Number(product && product.clicks) > 0)
    .sort((a, b) => Number(b.clicks || 0) - Number(a.clicks || 0));

  if (rankedByClicks.length > 0) {
    return rankedByClicks;
  }

  const featured = source.filter((product) => product.featured);
  return featured.length ? featured : source;
}

export function initHomeProductsUI() {
  const gridEl = document.getElementById("homeFeaturedGrid");
  const statusEl = document.getElementById("homeFeaturedStatus");
  const modalEl = document.getElementById("homeProductModal");
  const categoryFiltersEl = document.getElementById("homeCategoryFilters");

  if (!gridEl || !statusEl || !modalEl || !categoryFiltersEl) {
    return;
  }

  const modalRefs = {
    image: document.getElementById("homeModalProductImage"),
    category: document.getElementById("homeModalProductCategory"),
    name: document.getElementById("homeModalProductName"),
    price: document.getElementById("homeModalProductPrice"),
    description: document.getElementById("homeModalProductDescription"),
    whatsapp: document.getElementById("homeModalWhatsappBtn"),
    prev: document.getElementById("homeModalPrevBtn"),
    next: document.getElementById("homeModalNextBtn")
  };

  if (Object.values(modalRefs).some((ref) => !ref)) {
    console.error("Home no pudo inicializarse: faltan elementos del modal de producto.");
    return;
  }

  if (!globalThis.bootstrap || !globalThis.bootstrap.Modal) {
    console.error("Home no pudo inicializarse: Bootstrap Modal no esta disponible.");
    return;
  }

  const state = {
    products: [],
    cards: [],
    activeProduct: null,
    modalImages: [],
    modalImageIndex: 0,
    activeCategory: "Todos"
  };

  const productModal = new globalThis.bootstrap.Modal(modalEl);

  function setStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger mb-4" : "alert alert-brand-subtle mb-4";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function hideStatus() {
    statusEl.classList.add("d-none");
  }

  function getFilteredHomeProducts() {
    const source = pickHomeProductsSource(state.products);
    const byCategory =
      state.activeCategory === "Todos"
        ? source
        : source.filter((product) => product.categoria === state.activeCategory);

    return byCategory.slice(0, 3);
  }

  function renderCategoryFilters() {
    const fixedCategories = ["Bisuteria", "Pinatas", "Arreglos", "Decoraciones"];
    const dynamicCategories = pickHomeProductsSource(state.products).map((product) => product.categoria).filter(Boolean);
    const categories = Array.from(new Set(["Todos", ...fixedCategories, ...dynamicCategories]));

    categoryFiltersEl.innerHTML = categories
      .map((category) => {
        const isActive = category === state.activeCategory;
        const activeClass = isActive ? "active" : "";
        const ariaPressed = isActive ? "true" : "false";
        return `<button type="button" class="category-chip ${activeClass}" data-category="${escapeHtml(category)}" aria-pressed="${ariaPressed}">${escapeHtml(category)}</button>`;
      })
      .join("");
  }

  function renderCards(products) {
    state.cards = Array.isArray(products) ? products : [];

    if (!state.cards.length) {
      gridEl.innerHTML = "";
      const statusMessage =
        state.activeCategory === "Todos"
          ? "Aun no hay productos publicados para mostrar en inicio."
          : `No hay productos destacados en la categoria ${state.activeCategory}.`;
      setStatus(statusMessage, "danger");
      return;
    }

    hideStatus();
    gridEl.innerHTML = state.cards
      .map((product, index) => {
        const heroImage = getProductImageUrls(product, "900x700")[0];
        return `
          <div class="col-12 col-md-6 col-xl-4">
            <article class="card product-card h-100 border-0" data-action="open-modal" data-index="${index}" tabindex="0" role="button" aria-label="Abrir detalle de ${escapeHtml(product.nombre)}">
              <img src="${escapeHtml(heroImage)}" class="card-img-top product-card-image" alt="${escapeHtml(product.nombre)}" loading="lazy" decoding="async" fetchpriority="low" data-action="open-modal" data-index="${index}" />
              <div class="card-body d-flex flex-column">
                <p class="small text-uppercase letter-space text-brand mb-2">${escapeHtml(product.categoria)}</p>
                <h3 class="h4 mb-2">${escapeHtml(product.nombre)}</h3>
                <p class="fw-semibold mb-2">${escapeHtml(formatCurrency(product.precio))}</p>
                <p class="text-muted-brand flex-grow-1 mb-3">${escapeHtml(product.descripcion)}</p>
                <small class="text-muted-brand mt-auto">${product.featured ? "Destacado en tienda" : "Disponible en catalogo"}</small>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  function renderModalImage(index) {
    const total = state.modalImages.length;
    if (!total || !state.activeProduct) {
      return;
    }

    state.modalImageIndex = ((index % total) + total) % total;
    modalRefs.image.src = state.modalImages[state.modalImageIndex];
    modalRefs.image.alt = `${state.activeProduct.nombre} - imagen ${state.modalImageIndex + 1}`;
    const many = total > 1;
    modalRefs.prev.disabled = !many;
    modalRefs.next.disabled = !many;
  }

  function openProductModal(product) {
    if (!product) {
      return;
    }

    state.activeProduct = product;
    state.modalImages = getProductImageUrls(product, "900x700");
    renderModalImage(0);
    modalRefs.category.textContent = product.categoria;
    modalRefs.name.textContent = product.nombre;
    modalRefs.price.textContent = formatCurrency(product.precio);
    modalRefs.description.textContent = product.descripcion;
    modalRefs.whatsapp.href = buildWhatsappLink(product);
    trackEvent({ tipo: "view_producto", producto_id: product.id, categoria: product.categoria || null });
    productModal.show();
  }

  function moveModalImage(step) {
    if (state.modalImages.length <= 1) {
      return;
    }

    renderModalImage(state.modalImageIndex + step);
  }

  function bindGlobalWhatsappTracking() {
    const whatsappButtons = [
      document.getElementById("homeTopWhatsappBtn"),
      document.getElementById("homeIdeaWhatsappBtn")
    ].filter(Boolean);

    if (!whatsappButtons.length) {
      return;
    }

    loadAppConfig()
      .then((configResult) => {
        if (!configResult.success) {
          return;
        }

        const text = encodeURIComponent("Hola, quiero informacion de sus productos");
        const link = `https://wa.me/${configResult.data.whatsappNumber}?text=${text}`;
        whatsappButtons.forEach((button) => {
          button.href = link;
        });
      })
      .catch((error) => {
        console.error("No se pudo cargar la configuracion publica para WhatsApp:", error);
      });

    whatsappButtons.forEach((button) => {
      button.addEventListener("click", () => {
        trackEvent({ tipo: "click_whatsapp" });
      });
    });
  }

  subscribe((nextState) => {
    state.products = Array.isArray(nextState.products) ? nextState.products : [];
    renderCategoryFilters();
    renderCards(getFilteredHomeProducts());
  });

  bindGlobalWhatsappTracking();

  categoryFiltersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }

    state.activeCategory = button.dataset.category || "Todos";
    renderCategoryFilters();
    renderCards(getFilteredHomeProducts());
  });

  gridEl.addEventListener("click", (event) => {
    const trigger = event.target.closest("[data-action='open-modal']");
    const index = trigger ? Number.parseInt(trigger.dataset.index || "-1", 10) : -1;
    if (Number.isInteger(index) && index >= 0) {
      openProductModal(state.cards[index]);
    }
  });

  gridEl.addEventListener("keydown", (event) => {
    const trigger = event.target.closest("article[data-action='open-modal']");
    if (!trigger || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    const index = Number.parseInt(trigger.dataset.index || "-1", 10);
    if (Number.isInteger(index) && index >= 0) {
      openProductModal(state.cards[index]);
    }
  });

  modalRefs.whatsapp.addEventListener("click", () => {
    if (state.activeProduct) {
      trackEvent({ tipo: "click_whatsapp", producto_id: state.activeProduct.id, categoria: state.activeProduct.categoria || null });
    }
  });

  modalRefs.prev.addEventListener("click", () => moveModalImage(-1));
  modalRefs.next.addEventListener("click", () => moveModalImage(1));

  modalEl.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveModalImage(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveModalImage(1);
    }
  });

  trackVisit();
  getProducts().then((result) => {
    if (!result.success) {
      setStatus(result.error || "No se pudieron cargar los destacados desde Supabase.", "danger");
    }
  });
}
