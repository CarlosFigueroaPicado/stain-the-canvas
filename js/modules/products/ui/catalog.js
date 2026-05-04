import { subscribe } from "../../../core/store.js";
import { getProducts } from "../service.js";
import { buildWhatsappLink, escapeHtml, formatCurrency, getProductImageUrls, getProductVideoUrl } from "../../../shared/product-utils.js";
import { trackEvent, trackVisit } from "../../analytics/service.js";
import { shouldUseCarousel } from "./shared.js";
import { getSubcategoriesWithCache } from "../../subcategories/service.js";

const state = {
  products: [],
  activeCategory: "Todos",
  searchTerm: "",
  activeProduct: null,
  modalImages: [],
  modalImageIndex: 0,
  subcategoryNames: {}
};

export function initCatalogProductsUI() {
  const gridEl = document.getElementById("productsGrid");
  const statusEl = document.getElementById("catalogStatus");
  const filtersEl = document.getElementById("categoryFilters");
  const modalEl = document.getElementById("productModal");
  const searchInputEl = document.getElementById("productSearchInput");
  const countBadgeEl = document.getElementById("catalogCountBadge");

  if (!gridEl || !statusEl || !filtersEl || !modalEl) {
    return;
  }

  const modalRefs = {
    title: document.getElementById("productModalLabel"),
    image: document.getElementById("modalProductImage"),
    category: document.getElementById("modalProductCategory"),
    subcategory: document.getElementById("modalProductSubcategory"),
    name: document.getElementById("modalProductName"),
    price: document.getElementById("modalProductPrice"),
    description: document.getElementById("modalProductDescription"),
    whatsapp: document.getElementById("modalWhatsappBtn"),
    prev: document.getElementById("modalPrevBtn"),
    next: document.getElementById("modalNextBtn"),
    video: document.getElementById("modalProductVideo"),
    videoSource: document.getElementById("modalProductVideoSource")
  };

  if (Object.values(modalRefs).some((ref) => !ref)) {
    console.error("Catálogo no pudo inicializarse: faltan elementos del modal de producto.");
    return;
  }

  if (!globalThis.bootstrap || !globalThis.bootstrap.Modal) {
    console.error("Catálogo no pudo inicializarse: Bootstrap Modal no está disponible.");
    return;
  }

  const productModal = new globalThis.bootstrap.Modal(modalEl);
  let searchDebounceTimer = null;

  function setStatus(message, kind) {
    statusEl.className = kind === "danger" ? "alert alert-danger" : "alert alert-brand-subtle";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function hideStatus() {
    statusEl.classList.add("d-none");
  }

  function getSubcategoryName(product) {
    const id = String(product && product.subcategory_id ? product.subcategory_id : "").trim();
    if (!id) {
      return "";
    }

    return String(state.subcategoryNames[id] || "").trim();
  }

  function updateCountBadge(visibleCount) {
    if (!countBadgeEl) {
      return;
    }

    countBadgeEl.textContent = `${visibleCount} de ${state.products.length} productos`;
  }

  function normalizeSearchText(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase()
      .trim();
  }

  function matchesSearch(product, normalizedSearch) {
    if (!normalizedSearch) {
      return true;
    }

    const fields = [product.nombre, product.categoria, product.descripcion]
      .map((item) => normalizeSearchText(item))
      .join(" ");

    return fields.includes(normalizedSearch);
  }

  function getFilteredProducts() {
    const byCategory =
      state.activeCategory === "Todos"
        ? state.products
        : state.products.filter((product) => product.categoria === state.activeCategory);

    const normalizedSearch = normalizeSearchText(state.searchTerm);
    return byCategory.filter((product) => matchesSearch(product, normalizedSearch));
  }

  function renderFilters() {
    const fixedCategories = ["Bisutería", "Accesorios", "Manualidades y Arreglos", "Decoraciones"];
    const dynamicCategories = state.products.map((product) => product.categoria).filter(Boolean);
    const unique = Array.from(new Set(["Todos", ...fixedCategories, ...dynamicCategories]));

    filtersEl.innerHTML = unique
      .map((category) => {
        const activeClass = category === state.activeCategory ? "active" : "";
        return `
          <button
            type="button"
            class="btn btn-outline-brand btn-sm rounded-pill category-filter ${activeClass}"
            data-category="${escapeHtml(category)}"
          >
            ${escapeHtml(category)}
          </button>
        `;
      })
      .join("");
  }

  function renderProducts() {
    const products = getFilteredProducts();
    updateCountBadge(products.length);

    if (!products.length) {
      gridEl.innerHTML = "";
      setStatus("No hay productos para los filtros aplicados.", "danger");
      return;
    }

    hideStatus();
    gridEl.innerHTML = products
      .map((product, index) => {
        const productImages = getProductImageUrls(product, "900x700");
        const productName = escapeHtml(product.nombre);
        const subcategoryName = getSubcategoryName(product);
        const cardMedia = !shouldUseCarousel(productImages)
          ? `<img src="${escapeHtml(productImages[0])}" class="card-img-top product-card-image" alt="${productName}" loading="lazy" />`
          : `
              <div id="productCardCarousel-${index}" class="carousel slide product-card-carousel" data-bs-ride="false" data-skip-modal="true">
                <div class="carousel-indicators">
                  ${productImages
                    .map((_, imageIndex) => {
                      const activeClass = imageIndex === 0 ? "active" : "";
                      const ariaCurrent = imageIndex === 0 ? 'aria-current="true"' : "";
                      return `
                        <button type="button" data-bs-target="#productCardCarousel-${index}" data-bs-slide-to="${imageIndex}" class="${activeClass}" ${ariaCurrent} aria-label="Imagen ${imageIndex + 1} de ${productImages.length}" data-skip-modal="true"></button>
                      `;
                    })
                    .join("")}
                </div>
                <div class="carousel-inner">
                  ${productImages
                    .map((url, imageIndex) => {
                      const activeClass = imageIndex === 0 ? "active" : "";
                      return `
                        <div class="carousel-item ${activeClass}">
                          <img src="${escapeHtml(url)}" class="d-block w-100 product-card-image" alt="${productName} - imagen ${imageIndex + 1}" loading="lazy" />
                        </div>
                      `;
                    })
                    .join("")}
                </div>
                <button class="carousel-control-prev" type="button" data-bs-target="#productCardCarousel-${index}" data-bs-slide="prev" aria-label="Imagen anterior" data-skip-modal="true">
                  <span class="carousel-control-prev-icon" aria-hidden="true"></span>
                </button>
                <button class="carousel-control-next" type="button" data-bs-target="#productCardCarousel-${index}" data-bs-slide="next" aria-label="Imagen siguiente" data-skip-modal="true">
                  <span class="carousel-control-next-icon" aria-hidden="true"></span>
                </button>
              </div>
            `;

        return `
          <div class="col-12 col-md-6 col-xl-4">
            <article class="card product-card h-100 border-0" data-action="open-modal" data-index="${index}" tabindex="0" role="button" aria-label="Abrir detalle de ${productName}">
              ${cardMedia}
              <div class="card-body d-flex flex-column">
                <h3 class="h4 mb-3">${productName}</h3>
                <div class="mb-2">
                  <p class="small text-uppercase letter-space text-brand mb-0">${escapeHtml(product.categoria)}</p>
                  <p class="small text-muted-brand mb-0">${subcategoryName ? escapeHtml(subcategoryName) : ""}</p>
                </div>
                <p class="fw-semibold fs-5 mb-3">${formatCurrency(product.precio)}</p>
                <p class="text-muted-brand flex-grow-1 mb-4">${escapeHtml(product.descripcion)}</p>
                <div class="d-flex flex-wrap gap-2">
                  <button type="button" class="btn btn-brand rounded-pill px-3" data-action="open-modal" data-index="${index}">
                    Ver detalles
                  </button>
                  <a class="btn btn-outline-brand rounded-pill px-3" href="${escapeHtml(buildWhatsappLink(product))}" target="_blank" rel="noopener noreferrer" data-skip-modal="true">
                    WhatsApp
                  </a>
                </div>
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
    modalRefs.title.textContent = product.nombre;
    modalRefs.category.textContent = product.categoria;
    modalRefs.price.textContent = formatCurrency(product.precio);
    modalRefs.description.textContent = product.descripcion;
    modalRefs.whatsapp.href = buildWhatsappLink(product);
    modalRefs.subcategory.textContent = "";
    modalRefs.subcategory.style.display = "none";

    // Show video if available (Estrategia A)
    // TODO: Video playback enhancements
    // - [ ] Add video player controls customization (play, pause, volume, fullscreen)
    // - [ ] Implement video quality selector (adaptive bitrate)
    // - [ ] Add video analytics (impressions, play time, engagement)
    // - [ ] Support HLS/DASH streaming for large videos
    // - [ ] Add subtitles/caption support
    // - [ ] Implement autoplay detection (respect user preferences)
    // - [ ] Add related videos recommendation system
    // - [ ] Cache video frames for faster thumbnail generation
    const videoUrl = getProductVideoUrl(product);
    if (videoUrl) {
      modalRefs.videoSource.src = videoUrl;
      modalRefs.video.classList.remove("d-none");
      const videoElement = modalRefs.video.querySelector("video");
      if (videoElement && videoElement.load) {
        videoElement.load();
      }
    } else {
      modalRefs.video.classList.add("d-none");
      modalRefs.videoSource.src = "";
    }

    const resolveSubcategoryName = (item) => {
      if (!item || typeof item !== "object") {
        return "";
      }

      return String(
        item.subcategory_name ||
        item.subcategoria_nombre ||
        (item.raw && (item.raw.subcategory_name || item.raw.subcategoria_nombre)) ||
        ""
      ).trim();
    };
    
    // Load subcategory if exists
    if (product.subcategory_id) {
      getSubcategoriesWithCache().then((result) => {
        const productSubcategoryId = String(product.subcategory_id || "").trim();
        if (result.success && Array.isArray(result.data) && productSubcategoryId) {
          const subcategoryInfo = result.data.find(
            (sub) => String(sub && sub.id ? sub.id : "").trim() === productSubcategoryId
          );
          if (subcategoryInfo && subcategoryInfo.nombre) {
            modalRefs.subcategory.textContent = subcategoryInfo.nombre;
            modalRefs.subcategory.style.display = "block";
            return;
          }
        }

        const fallbackName = resolveSubcategoryName(product);
        if (fallbackName) {
          modalRefs.subcategory.textContent = fallbackName;
          modalRefs.subcategory.style.display = "block";
        }
      }).catch(() => {
        const fallbackName = resolveSubcategoryName(product);
        if (fallbackName) {
          modalRefs.subcategory.textContent = fallbackName;
          modalRefs.subcategory.style.display = "block";
        }
      });
    }
    
    trackEvent({ tipo: "view_producto", producto_id: product.id, categoria: product.categoria || null });
    productModal.show();
  }

  function loadSubcategoryNames() {
    getSubcategoriesWithCache()
      .then((result) => {
        if (!result.success || !Array.isArray(result.data)) {
          return;
        }

        const namesById = {};
        result.data.forEach((subcategory) => {
          const id = String(subcategory && subcategory.id ? subcategory.id : "").trim();
          const name = String(subcategory && subcategory.nombre ? subcategory.nombre : "").trim();
          if (id && name) {
            namesById[id] = name;
          }
        });

        state.subcategoryNames = namesById;
        if (state.products.length > 0) {
          renderProducts();
        }
      })
      .catch(() => {
        // Sin subcategorias cargadas, la card sigue funcionando.
      });
  }

  function moveModalImage(step) {
    if (state.modalImages.length <= 1) {
      return;
    }

    renderModalImage(state.modalImageIndex + step);
  }

  subscribe((nextState) => {
    state.products = Array.isArray(nextState.products) ? nextState.products : [];
    renderFilters();
    renderProducts();
  });

  loadSubcategoryNames();

  filtersEl.addEventListener("click", (event) => {
    const button = event.target.closest("[data-category]");
    if (!button) {
      return;
    }

    state.activeCategory = button.dataset.category || "Todos";
    renderFilters();
    renderProducts();
  });

  if (searchInputEl) {
    searchInputEl.addEventListener("input", (event) => {
      clearTimeout(searchDebounceTimer);
      const nextTerm = event.target.value || "";
      searchDebounceTimer = setTimeout(() => {
        state.searchTerm = nextTerm;
        renderProducts();
      }, 120);
    });
  }

  gridEl.addEventListener("click", (event) => {
    const whatsappLink = event.target.closest("a[href*='wa.me/']");
    if (whatsappLink) {
      const card = whatsappLink.closest("article[data-action='open-modal']");
      const filtered = getFilteredProducts();
      const index = card ? Number.parseInt(card.dataset.index || "-1", 10) : -1;
      if (Number.isInteger(index) && index >= 0 && filtered[index]) {
        trackEvent({ tipo: "click_whatsapp", producto_id: filtered[index].id, categoria: filtered[index].categoria || null });
      }
      return;
    }

    if (event.target.closest("[data-skip-modal='true']")) {
      return;
    }

    const trigger = event.target.closest("[data-action='open-modal']");
    const index = trigger ? Number.parseInt(trigger.dataset.index || "-1", 10) : -1;
    const filtered = getFilteredProducts();
    if (Number.isInteger(index) && index >= 0) {
      openProductModal(filtered[index]);
    }
  });

  gridEl.addEventListener("keydown", (event) => {
    const trigger = event.target.closest("article[data-action='open-modal']");
    if (!trigger || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    const index = Number.parseInt(trigger.dataset.index || "-1", 10);
    const filtered = getFilteredProducts();
    if (Number.isInteger(index) && index >= 0) {
      openProductModal(filtered[index]);
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
      setStatus(result.error || "No se pudieron cargar productos.", "danger");
    }
  });
}
