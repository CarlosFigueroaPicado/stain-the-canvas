(function catalogPage() {
  const state = {
    products: [],
    activeCategory: "Todos",
    searchTerm: "",
    activeProduct: null,
    modalCategoryItems: [],
    modalCategoryIndex: 0
  };

  let searchDebounceTimer = null;

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
    image: document.getElementById("modalProductImage"),
    category: document.getElementById("modalProductCategory"),
    name: document.getElementById("modalProductName"),
    price: document.getElementById("modalProductPrice"),
    description: document.getElementById("modalProductDescription"),
    whatsapp: document.getElementById("modalWhatsappBtn"),
    prev: document.getElementById("modalPrevBtn"),
    next: document.getElementById("modalNextBtn")
  };

  const productModal = new bootstrap.Modal(modalEl);

  function placeholderImage(label) {
    if (window.productUtils && typeof window.productUtils.buildPlaceholderImage === "function") {
      return window.productUtils.buildPlaceholderImage(label, "900x700");
    }

    const text = encodeURIComponent((label || "Producto") + " artesanal");
    return `https://placehold.co/900x700/F5E8DA/2B2B2B?text=${text}`;
  }

  function getAlertClass(kind) {
    switch (kind) {
      case "success":
        return "alert alert-success";
      case "danger":
        return "alert alert-danger";
      default:
        return "alert alert-brand-subtle";
    }
  }

  function setStatus(message, kind) {
    statusEl.className = getAlertClass(kind);
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function hideStatus() {
    statusEl.classList.add("d-none");
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

  async function trackVisitSafe() {
    if (!window.analyticsModule || typeof window.analyticsModule.trackVisit !== "function") {
      return;
    }

    try {
      await window.analyticsModule.trackVisit();
    } catch (error) {
      console.error("No se pudo registrar la visita del catalogo:", error);
    }
  }

  async function trackEventSafe(payload) {
    if (!window.analyticsModule || typeof window.analyticsModule.trackEvent !== "function") {
      return;
    }

    try {
      await window.analyticsModule.trackEvent(payload);
    } catch (error) {
      console.error("No se pudo registrar el evento de analitica:", error);
    }
  }

  function trackProductView(product) {
    if (!product || !product.id) {
      return;
    }

    trackEventSafe({
      tipo: "view_producto",
      producto_id: product.id,
      categoria: product.categoria || null
    });
  }

  function trackWhatsappClick(product) {
    trackEventSafe({
      tipo: "click_whatsapp",
      producto_id: product && product.id ? product.id : null,
      categoria: product && product.categoria ? product.categoria : null
    });
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
    const fixedCategories = ["Bisuteria", "Pi\u00f1atas", "Arreglos", "Decoraciones"];
    const dynamicCategories = state.products.map((product) => product.categoria).filter(Boolean);
    const unique = Array.from(new Set(["Todos", ...fixedCategories, ...dynamicCategories]));

    filtersEl.innerHTML = unique
      .map((category) => {
        const activeClass = category === state.activeCategory ? "active" : "";
        return `
          <button
            type="button"
            class="btn btn-outline-brand btn-sm rounded-pill category-filter ${activeClass}"
            data-category="${window.productUtils.escapeHtml(category)}"
          >
            ${window.productUtils.escapeHtml(category)}
          </button>
        `;
      })
      .join("");
  }

  function renderProducts() {
    const products = getFilteredProducts();
    updateCountBadge(products.length);

    if (products.length === 0) {
      gridEl.innerHTML = "";
      setStatus("No hay productos para los filtros aplicados.", "danger");
      return;
    }

    hideStatus();

    gridEl.innerHTML = products
      .map((product, index) => {
        const imageUrl = product.imagenUrl || placeholderImage(product.nombre);

        return `
          <div class="col-12 col-md-6 col-xl-4">
            <article class="card product-card h-100 border-0" data-action="open-modal" data-index="${index}" tabindex="0" role="button" aria-label="Abrir detalle de ${window.productUtils.escapeHtml(product.nombre)}">
              <img src="${window.productUtils.escapeHtml(imageUrl)}" class="card-img-top product-card-image" alt="${window.productUtils.escapeHtml(product.nombre)}" loading="lazy" />
              <div class="card-body d-flex flex-column">
                <div class="d-flex justify-content-between align-items-center mb-2">
                  <p class="small text-uppercase letter-space text-brand mb-0">${window.productUtils.escapeHtml(product.categoria)}</p>
                  <span class="badge rounded-pill text-bg-light border border-brand-subtle">Artesanal</span>
                </div>
                <h3 class="h4 mb-2">${window.productUtils.escapeHtml(product.nombre)}</h3>
                <p class="fw-semibold fs-5 mb-3">${window.productUtils.formatCurrency(product.precio)}</p>
                <p class="text-muted-brand flex-grow-1 mb-4">${window.productUtils.escapeHtml(product.descripcion)}</p>
                <div class="d-flex flex-wrap gap-2">
                  <button type="button" class="btn btn-brand rounded-pill px-3" data-action="open-modal" data-index="${index}">
                    Ver detalles
                  </button>
                  <a
                    class="btn btn-outline-brand rounded-pill px-3"
                    href="${window.productUtils.escapeHtml(window.productUtils.buildWhatsappLink(product))}"
                    target="_blank"
                    rel="noopener noreferrer"
                    data-skip-modal="true"
                  >
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

  function refreshModalArrows() {
    const many = state.modalCategoryItems.length > 1;
    if (modalRefs.prev) {
      modalRefs.prev.disabled = !many;
    }
    if (modalRefs.next) {
      modalRefs.next.disabled = !many;
    }
  }

  function openProductModal(product) {
    if (!product) {
      return;
    }

    state.activeProduct = product;
    trackProductView(product);

    const imageUrl = product.imagenUrl || placeholderImage(product.nombre);
    modalRefs.image.src = imageUrl;
    modalRefs.image.alt = product.nombre;
    modalRefs.category.textContent = product.categoria;
    modalRefs.name.textContent = product.nombre;
    modalRefs.price.textContent = window.productUtils.formatCurrency(product.precio);
    modalRefs.description.textContent = product.descripcion;
    modalRefs.whatsapp.href = window.productUtils.buildWhatsappLink(product);

    const sameCategory = state.products.filter(
      (item) => item.id && item.categoria === product.categoria
    );
    state.modalCategoryItems = sameCategory.length ? sameCategory : [product];
    const foundIndex = state.modalCategoryItems.findIndex((item) => item.id === product.id);
    state.modalCategoryIndex = foundIndex >= 0 ? foundIndex : 0;
    refreshModalArrows();

    productModal.show();
  }

  function moveModalCategory(step) {
    if (state.modalCategoryItems.length <= 1) {
      return;
    }

    const total = state.modalCategoryItems.length;
    state.modalCategoryIndex = (state.modalCategoryIndex + step + total) % total;
    const nextProduct = state.modalCategoryItems[state.modalCategoryIndex];
    if (!nextProduct) {
      return;
    }

    state.activeProduct = nextProduct;
    trackProductView(nextProduct);

    const imageUrl = nextProduct.imagenUrl || placeholderImage(nextProduct.nombre);
    modalRefs.image.src = imageUrl;
    modalRefs.image.alt = nextProduct.nombre;
    modalRefs.category.textContent = nextProduct.categoria;
    modalRefs.name.textContent = nextProduct.nombre;
    modalRefs.price.textContent = window.productUtils.formatCurrency(nextProduct.precio);
    modalRefs.description.textContent = nextProduct.descripcion;
    modalRefs.whatsapp.href = window.productUtils.buildWhatsappLink(nextProduct);

    refreshModalArrows();
  }

  function openModal(index) {
    const filtered = getFilteredProducts();
    const product = filtered[index];
    openProductModal(product);
  }

  async function fetchProducts() {
    const client = window.getSupabaseClient();
    if (!client) {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    setStatus("Cargando productos...", "info");

    try {
      const table = window.appConfig.productsTable;
      let result = await client
        .from(table)
        .select("id,nombre,categoria,descripcion,precio,imagen_url,created_at")
        .order("created_at", { ascending: false });

      if (result.error && String(result.error.message || "").includes("created_at")) {
        result = await client
          .from(table)
          .select("id,nombre,categoria,descripcion,precio,imagen_url,created_at");
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      state.products = (result.data || []).map((row) => window.productUtils.normalizeProduct(row));

      if (state.products.length === 0) {
        gridEl.innerHTML = "";
        updateCountBadge(0);
        setStatus("No hay productos registrados aun. Agrega productos desde administracion.", "danger");
        renderFilters();
        return;
      }

      renderFilters();
      renderProducts();
    } catch (error) {
      console.error("Error al cargar productos en catalogo:", error);
      setStatus(`Error al obtener productos: ${error.message}`, "danger");
    }
  }

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
      // Debounce para evitar rerender por cada tecla y reducir trabajo de DOM.
      if (searchDebounceTimer) {
        clearTimeout(searchDebounceTimer);
      }

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
      if (card) {
        const index = Number.parseInt(card.dataset.index || "-1", 10);
        const filtered = getFilteredProducts();
        const product = Number.isInteger(index) && index >= 0 ? filtered[index] : null;
        if (product) {
          trackWhatsappClick(product);
        }
      }
      return;
    }

    if (event.target.closest("[data-skip-modal='true']")) {
      return;
    }

    const trigger = event.target.closest("[data-action='open-modal']");
    if (!trigger) {
      return;
    }

    const index = Number.parseInt(trigger.dataset.index || "-1", 10);
    if (!Number.isInteger(index) || index < 0) {
      return;
    }

    openModal(index);
  });

  modalRefs.whatsapp.addEventListener("click", () => {
    trackWhatsappClick(state.activeProduct);
  });

  if (modalRefs.prev) {
    modalRefs.prev.addEventListener("click", () => moveModalCategory(-1));
  }

  if (modalRefs.next) {
    modalRefs.next.addEventListener("click", () => moveModalCategory(1));
  }

  modalEl.addEventListener("keydown", (event) => {
    if (event.key === "ArrowLeft") {
      event.preventDefault();
      moveModalCategory(-1);
      return;
    }

    if (event.key === "ArrowRight") {
      event.preventDefault();
      moveModalCategory(1);
    }
  });

  gridEl.addEventListener("keydown", (event) => {
    const trigger = event.target.closest("article[data-action='open-modal']");
    if (!trigger) {
      return;
    }

    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    const index = Number.parseInt(trigger.dataset.index || "-1", 10);
    if (!Number.isInteger(index) || index < 0) {
      return;
    }

    openModal(index);
  });

  trackVisitSafe();
  fetchProducts();
})();
