(function homeFeaturedProducts() {
  const gridEl = document.getElementById("homeFeaturedGrid");
  const statusEl = document.getElementById("homeFeaturedStatus");

  if (!gridEl || !statusEl) {
    return;
  }

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
      nombre: "Piñata Unicornio",
      categoria: "Piñatas",
      descripcion: "Piñata para fiestas.",
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

  function setStatus(message, kind) {
    statusEl.className =
      kind === "danger" ? "alert alert-danger mb-4" : "alert alert-brand-subtle mb-4";
    statusEl.textContent = message;
    statusEl.classList.remove("d-none");
  }

  function hideStatus() {
    statusEl.classList.add("d-none");
  }

  function renderCards(products) {
    gridEl.innerHTML = products
      .map((product) => {
        const detailHref = product.id
          ? `producto.html?id=${encodeURIComponent(product.id)}`
          : "catalogo.html";
        const priceText = formatCurrency(product.precio);

        return `
          <div class="col-12 col-md-6 col-xl-4">
            <article class="card product-card h-100 border-0">
              <img
                src="${escapeHtml(product.imagenUrl)}"
                class="card-img-top product-card-image"
                alt="${escapeHtml(product.nombre)}"
                loading="lazy"
              />
              <div class="card-body d-flex flex-column">
                <p class="small text-uppercase letter-space text-brand mb-2">${escapeHtml(product.categoria)}</p>
                <h3 class="h4 mb-2">${escapeHtml(product.nombre)}</h3>
                ${priceText ? `<p class="fw-semibold mb-2">${escapeHtml(priceText)}</p>` : ""}
                <p class="text-muted-brand flex-grow-1 mb-3">${escapeHtml(product.descripcion)}</p>
                <a class="btn btn-brand rounded-pill px-3 mt-auto" href="${detailHref}">Ver producto</a>
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
        imagenUrl: normalized.imagenUrl || fallback.imagenUrl
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
    if (!window.getSupabaseClient || !window.appConfig) {
      return;
    }

    const client = window.getSupabaseClient();
    if (!client) {
      return;
    }

    const ids = featuredDefaults.map((item) => item.id);
    const table = window.appConfig.productsTable;
    const result = await client.from(table).select("*").in("id", ids);

    if (result.error) {
      console.error("No se pudieron cargar destacados desde Supabase:", result.error);
      setStatus(
        "No se pudieron cargar los destacados desde Supabase. Se muestran los destacados principales.",
        "danger"
      );
      return;
    }

    const merged = mergeFeaturedRows(result.data);
    renderCards(merged);
    hideStatus();
  }

  renderCards(featuredDefaults);
  loadFromSupabase().catch((error) => {
    console.error("Error inesperado al cargar destacados:", error);
    setStatus(
      "No se pudieron cargar los destacados desde Supabase. Se muestran los destacados principales.",
      "danger"
    );
  });
})();

