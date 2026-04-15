(function homeFeaturedProducts() {
  const productsService = window.stcServices && window.stcServices.products;
  const gridEl = document.getElementById("homeFeaturedGrid");
  const statusEl = document.getElementById("homeFeaturedStatus");
  const modalEl = document.getElementById("homeProductModal");

  if (!gridEl || !statusEl || !modalEl) {
    return;
  }

  const state = {
    activeProduct: null,
    cards: [],
    allProducts: [],
    modalImages: [],
    modalImageIndex: 0
  };

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

  const productModal = new bootstrap.Modal(modalEl);

  const featuredDefaults = [
    {
      id: "b964ac4a-1e04-4b91-87da-e3393ec9bfbe",
      nombre: "Aretes Florales",
      categoria: "Bisuteria",
      descripcion: "Aretes hechos a mano.",
      precio: 15,
      imagenUrl:
        "https://mmfpivsfjolohoowhgit.supabase.co/storage/v1/object/public/productos/assets/Bisuteria_1.webp"
    },
    {
      id: "e4511d40-1aca-47a3-9348-14fcdd005104",
      nombre: "Pulsera Artesanal",
      categoria: "Bisuteria",
      descripcion: "Pulsera personalizada.",
      precio: 20,
      imagenUrl:
        "https://mmfpivsfjolohoowhgit.supabase.co/storage/v1/object/public/productos/assets/Bisuteria_3.jpg"
    },
    {
      id: "3d103fdd-3c13-4ebf-9086-6b20716ae5c8",
      nombre: "Pi\u00f1ata Unicornio",
      categoria: "Pi\u00f1atas",
      descripcion: "Pi\u00f1ata para fiestas.",
      precio: 25,
      imagenUrl:
        "https://mmfpivsfjolohoowhgit.supabase.co/storage/v1/object/public/productos/assets/pinata_1.jfif"
    }
  ];

  function escapeHtml(value) {
    if (window.productUtils && typeof window.productUtils.escapeHtml === "function") {
      return window.productUtils.escapeHtml(value);
    }

    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/\"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    if (window.productUtils && typeof window.productUtils.formatCurrency === "function") {
      return window.productUtils.formatCurrency(value);
    }

    const amount = Number.parseFloat(value);
    return Number.isFinite(amount)
      ? new Intl.NumberFormat("es-NI", {
          style: "currency",
          currency: "NIO",
          minimumFractionDigits: 2
        }).format(amount)
      : "";
  }

  function placeholderImage(label) {
    if (window.productUtils && typeof window.productUtils.buildPlaceholderImage === "function") {
      return window.productUtils.buildPlaceholderImage(label, "900x700");
    }

    const text = encodeURIComponent((label || "Producto") + " artesanal");
    return `https://placehold.co/900x700/F5E8DA/2B2B2B?text=${text}`;
  }

  function getProductImages(product) {
    const gallery = Array.isArray(product && product.galleryUrls) ? product.galleryUrls : [];
    const base = [product && product.imagenUrl ? product.imagenUrl : "", ...gallery]
      .map((item) => String(item || "").trim())
      .filter(Boolean);

    const unique = Array.from(new Set(base));
    if (unique.length > 0) {
      return unique;
    }

    return [placeholderImage(product && product.nombre ? product.nombre : "Producto")];
  }

  async function trackVisitSafe() {
    if (!window.analyticsModule || typeof window.analyticsModule.trackVisit !== "function") {
      return;
    }

    try {
      await window.analyticsModule.trackVisit();
    } catch (error) {
      console.error("No se pudo registrar la visita de inicio:", error);
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

  function bindGlobalWhatsappTracking() {
    const topWhatsappBtn = document.getElementById("homeTopWhatsappBtn");
    if (!topWhatsappBtn) {
      return;
    }

    topWhatsappBtn.addEventListener("click", () => {
      trackEventSafe({ tipo: "click_whatsapp" });
    });
  }

  function setStatus(message, kind) {
    statusEl.className =
      kind === "danger" ? "alert alert-danger mb-4" : "alert alert-brand-subtle mb-4";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function hideStatus() {
    statusEl.classList.add("d-none");
  }

  function refreshModalArrows() {
    const many = state.modalImages.length > 1;
    if (modalRefs.prev) {
      modalRefs.prev.disabled = !many;
    }
    if (modalRefs.next) {
      modalRefs.next.disabled = !many;
    }
  }

  function renderModalImage(index) {
    const total = state.modalImages.length;
    if (total === 0 || !state.activeProduct) {
      return;
    }

    const nextIndex = ((index % total) + total) % total;
    state.modalImageIndex = nextIndex;

    const nextImage = state.modalImages[nextIndex];
    modalRefs.image.src = nextImage;
    modalRefs.image.alt = `${state.activeProduct.nombre} - imagen ${nextIndex + 1}`;
    refreshModalArrows();
  }

  function openProductModal(product) {
    if (!product) {
      return;
    }

    state.activeProduct = product;
    trackProductView(product);
    state.modalImages = getProductImages(product);
    renderModalImage(0);

    modalRefs.category.textContent = product.categoria;
    modalRefs.name.textContent = product.nombre;
    modalRefs.price.textContent = formatCurrency(product.precio);
    modalRefs.description.textContent = product.descripcion;
    modalRefs.whatsapp.href = window.productUtils.buildWhatsappLink(product);

    productModal.show();
  }

  function moveModalImage(step) {
    if (state.modalImages.length <= 1) {
      return;
    }

    renderModalImage(state.modalImageIndex + step);
  }

  function openModal(index) {
    const product = state.cards[index];
    openProductModal(product);
  }

  function renderCards(products) {
    state.cards = Array.isArray(products) ? products : [];

    gridEl.innerHTML = products
      .map((product, index) => {
        const priceText = formatCurrency(product.precio);

        return `
          <div class="col-12 col-md-6 col-xl-4">
            <article class="card product-card h-100 border-0" data-action="open-modal" data-index="${index}" tabindex="0" role="button" aria-label="Abrir detalle de ${escapeHtml(product.nombre)}">
              <img
                src="${escapeHtml(product.imagenUrl)}"
                class="card-img-top product-card-image"
                alt="${escapeHtml(product.nombre)}"
                loading="lazy"
                data-action="open-modal"
                data-index="${index}"
              />
              <div class="card-body d-flex flex-column">
                <p class="small text-uppercase letter-space text-brand mb-2">${escapeHtml(product.categoria)}</p>
                <h3 class="h4 mb-2">${escapeHtml(product.nombre)}</h3>
                ${priceText ? `<p class="fw-semibold mb-2">${escapeHtml(priceText)}</p>` : ""}
                <p class="text-muted-brand flex-grow-1 mb-3">${escapeHtml(product.descripcion)}</p>
                <small class="text-muted-brand mt-auto">Haz clic en la imagen para ver detalles.</small>
              </div>
            </article>
          </div>
        `;
      })
      .join("");
  }

  function normalizeIncoming(row, fallback) {
    if (window.productUtils && typeof window.productUtils.normalizeProduct === "function") {
      const normalized = window.productUtils.normalizeProduct(row);
      return {
        id: normalized.id || fallback.id,
        nombre: normalized.nombre || fallback.nombre,
        categoria: normalized.categoria || fallback.categoria,
        descripcion: normalized.descripcion || fallback.descripcion,
        precio: Number.isFinite(normalized.precio) ? normalized.precio : fallback.precio,
        imagenUrl: normalized.imagenUrl || fallback.imagenUrl,
        galleryUrls: Array.isArray(normalized.galleryUrls)
          ? normalized.galleryUrls.slice()
          : Array.isArray(fallback.galleryUrls)
            ? fallback.galleryUrls.slice()
            : []
      };
    }

    return fallback;
  }

  function mergeFeaturedRows(rows) {
    const rowById = new Map((rows || []).map((row) => [String(row.id || ""), row]));

    return featuredDefaults.map((fallback) => {
      const row = rowById.get(fallback.id);
      return row ? normalizeIncoming(row, fallback) : fallback;
    });
  }

  async function loadFromSupabase() {
    if (!productsService || typeof productsService.fetchFeaturedProducts !== "function") {
      return;
    }

    const result = await productsService.fetchFeaturedProducts(featuredDefaults);
    if (!result || !result.success) {
      setStatus(
        (result && result.error) || "No se pudieron cargar los destacados desde Supabase.",
        "danger"
      );
      return;
    }

    const merged = Array.isArray(result.data) ? result.data : [];
    state.allProducts = merged;
    renderCards(merged);
    hideStatus();
  }

  trackVisitSafe();
  bindGlobalWhatsappTracking();

  gridEl.addEventListener("click", (event) => {
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

  modalRefs.whatsapp.addEventListener("click", () => {
    trackWhatsappClick(state.activeProduct);
  });

  if (modalRefs.prev) {
    modalRefs.prev.addEventListener("click", () => moveModalImage(-1));
  }

  if (modalRefs.next) {
    modalRefs.next.addEventListener("click", () => moveModalImage(1));
  }

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

  renderCards(featuredDefaults);
  loadFromSupabase().catch((error) => {
    console.error("Error inesperado al cargar destacados:", error);
    setStatus(
      "No se pudieron cargar los destacados desde Supabase. Se muestran los destacados principales.",
      "danger"
    );
  });
})();
