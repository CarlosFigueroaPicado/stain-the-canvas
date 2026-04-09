(function productPage() {
  const statusEl = document.getElementById("productStatus");
  const detailCardEl = document.getElementById("productDetailCard");

  if (!statusEl || !detailCardEl) {
    return;
  }

  const refs = {
    image: document.getElementById("productImage"),
    category: document.getElementById("productCategory"),
    name: document.getElementById("productName"),
    price: document.getElementById("productPrice"),
    description: document.getElementById("productDescription"),
    whatsapp: document.getElementById("productWhatsapp"),
    share: document.getElementById("productShare")
  };

  function placeholderImage(label) {
    if (window.productUtils && typeof window.productUtils.buildPlaceholderImage === "function") {
      return window.productUtils.buildPlaceholderImage(label, "900x700");
    }

    const text = encodeURIComponent((label || "Producto") + " artesanal");
    return `https://placehold.co/900x700/F5E8DA/2B2B2B?text=${text}`;
  }

  function getAlertClass(kind) {
    switch (kind) {
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

  function copyCurrentLink() {
    const textToCopy = window.location.href;

    if (navigator.clipboard && typeof navigator.clipboard.writeText === "function") {
      return navigator.clipboard.writeText(textToCopy);
    }

    return Promise.reject(new Error("Clipboard API no disponible"));
  }

  function setProduct(product) {
    refs.image.src = product.imagenUrl || placeholderImage(product.nombre);
    refs.image.alt = product.nombre;
    refs.category.textContent = product.categoria;
    refs.name.textContent = product.nombre;
    refs.price.textContent = window.productUtils.formatCurrency(product.precio);
    refs.description.textContent = product.descripcion;
    refs.whatsapp.href = window.productUtils.buildWhatsappLink(product);

    refs.share.addEventListener("click", (event) => {
      event.preventDefault();
      copyCurrentLink()
        .then(() => {
          refs.share.textContent = "Enlace copiado";
          setTimeout(() => {
            refs.share.textContent = "Copiar enlace";
          }, 1600);
        })
        .catch((error) => {
          console.error("No se pudo copiar el enlace del producto:", error);
          refs.share.textContent = "No se pudo copiar";
          setTimeout(() => {
            refs.share.textContent = "Copiar enlace";
          }, 1600);
        });
    });
  }

  async function loadProduct() {
    const client = window.getSupabaseClient();
    if (!client) {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");

    if (!id) {
      setStatus("No se encontro un id de producto en la URL.", "danger");
      return;
    }

    setStatus("Cargando producto...", "info");

    try {
      const table = window.appConfig.productsTable;
      const result = await client.from(table).select("*").eq("id", id).maybeSingle();

      if (result.error) {
        throw new Error(result.error.message);
      }

      if (!result.data) {
        setStatus("Producto no encontrado.", "danger");
        return;
      }

      const product = window.productUtils.normalizeProduct(result.data);
      setProduct(product);
      hideStatus();
      detailCardEl.classList.remove("d-none");
    } catch (error) {
      console.error("Error al cargar detalle de producto:", error);
      setStatus(`Error al obtener el producto: ${error.message}`, "danger");
    }
  }

  loadProduct();
})();
