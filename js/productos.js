(function productosModule() {
  const productsService = window.stcServices && window.stcServices.products;
  const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
  const ALLOWED_IMAGE_TYPES = new Set([
    "image/jpeg",
    "image/png",
    "image/webp",
    "image/gif",
    "image/jfif"
  ]);

  const refs = {
    section: null,
    form: null,
    status: null,
    tableBody: null,
    productId: null,
    nombre: null,
    categoria: null,
    precio: null,
    descripcion: null,
    imagen: null,
    imagenUrl: null,
    imagePreviewContainer: null,
    saveBtn: null,
    resetBtn: null
  };

  const state = {
    initialized: false,
    products: [],
    editingId: null,
    previewObjectUrls: []
  };

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
    if (!refs.status) {
      return;
    }

    refs.status.className = getAlertClass(kind);
    refs.status.textContent = message;
  }

  function placeholderImage(label) {
    if (window.productUtils && typeof window.productUtils.buildPlaceholderImage === "function") {
      return window.productUtils.buildPlaceholderImage(label, "320x240");
    }

    const text = encodeURIComponent((label || "Producto") + " artesanal");
    return `https://placehold.co/320x240/F5E8DA/2B2B2B?text=${text}`;
  }


  function clearPreviewObjectUrls() {
    state.previewObjectUrls.forEach((url) => {
      try {
        URL.revokeObjectURL(url);
      } catch (_) {
        // Ignoramos errores al revocar para mantener limpio el flujo de preview.
      }
    });
    state.previewObjectUrls = [];
  }

  function setImagePreview(urls, label) {
    if (!refs.imagePreviewContainer) {
      return;
    }

    const source = Array.isArray(urls) ? urls : [urls];
    const cleaned = Array.from(new Set(source.map((item) => String(item || "").trim()).filter(Boolean)));

    if (cleaned.length === 0) {
      refs.imagePreviewContainer.classList.add("d-none");
      refs.imagePreviewContainer.innerHTML = "";
      return;
    }

    const safeLabel = window.productUtils.escapeHtml(String(label || "Preview"));

    if (cleaned.length === 1) {
      refs.imagePreviewContainer.innerHTML = `
        <img class="admin-image-preview" src="${window.productUtils.escapeHtml(cleaned[0])}" alt="${safeLabel}" />
      `;
      refs.imagePreviewContainer.classList.remove("d-none");
      return;
    }

    const carouselId = "adminPreviewCarousel";
    const indicators = cleaned
      .map((_, index) => {
        const activeClass = index === 0 ? "active" : "";
        const ariaCurrent = index === 0 ? 'aria-current="true"' : "";
        return `
          <button
            type="button"
            data-bs-target="#${carouselId}"
            data-bs-slide-to="${index}"
            class="${activeClass}"
            ${ariaCurrent}
            aria-label="Imagen ${index + 1} de ${cleaned.length}"
          ></button>
        `;
      })
      .join("");

    const items = cleaned
      .map((url, index) => {
        const activeClass = index === 0 ? "active" : "";
        return `
          <div class="carousel-item ${activeClass}">
            <img class="d-block w-100 admin-image-preview" src="${window.productUtils.escapeHtml(url)}" alt="${safeLabel} ${index + 1}" />
          </div>
        `;
      })
      .join("");

    refs.imagePreviewContainer.innerHTML = `
      <div id="${carouselId}" class="carousel slide admin-preview-carousel" data-bs-ride="false">
        <div class="carousel-indicators">
          ${indicators}
        </div>
        <div class="carousel-inner">
          ${items}
        </div>
        <button class="carousel-control-prev" type="button" data-bs-target="#${carouselId}" data-bs-slide="prev" aria-label="Imagen previa">
          <span class="carousel-control-prev-icon" aria-hidden="true"></span>
        </button>
        <button class="carousel-control-next" type="button" data-bs-target="#${carouselId}" data-bs-slide="next" aria-label="Imagen siguiente">
          <span class="carousel-control-next-icon" aria-hidden="true"></span>
        </button>
      </div>
    `;
    refs.imagePreviewContainer.classList.remove("d-none");
  }

  function setLoading(loading) {
    refs.saveBtn.disabled = loading;
    refs.resetBtn.disabled = loading;
    refs.saveBtn.textContent = loading
      ? "Guardando..."
      : state.editingId
        ? "Actualizar producto"
        : "Guardar producto";
  }

  function resetForm() {
    refs.form.reset();
    state.editingId = null;
    refs.productId.value = "";
    refs.saveBtn.textContent = "Guardar producto";
    clearPreviewObjectUrls();
    setImagePreview([]);
  }

  function fillForm(product) {
    state.editingId = product.id;
    refs.productId.value = product.id;
    refs.nombre.value = product.nombre;
    refs.categoria.value = product.categoria;
    refs.precio.value = String(product.precio);
    refs.descripcion.value = product.descripcion;
    refs.imagenUrl.value = product.imagenUrl;
    refs.imagen.value = "";
    refs.saveBtn.textContent = "Actualizar producto";

    const gallery = Array.isArray(product.galleryUrls) ? product.galleryUrls : [];
    const previewImages = Array.from(
      new Set(
        [product.imagenUrl, ...gallery]
          .map((item) => String(item || "").trim())
          .filter(Boolean)
      )
    );

    setImagePreview(
      previewImages.length > 0 ? previewImages : [placeholderImage(product.nombre)],
      product.nombre
    );
  }

  function getFormInput() {
    return {
      nombre: refs.nombre.value,
      categoria: refs.categoria.value,
      precio: refs.precio.value,
      descripcion: refs.descripcion.value,
      imagenUrl: refs.imagenUrl.value
    };
  }

  function validateSelectedFile(file) {
    if (!file) {
      return "";
    }

    if (file.size > MAX_IMAGE_SIZE_BYTES) {
      return "La imagen supera 5MB. Sube un archivo mas liviano.";
    }

    const type = String(file.type || "").toLowerCase();
    if (type && !ALLOWED_IMAGE_TYPES.has(type) && !type.startsWith("image/")) {
      return "Formato de imagen no permitido. Usa JPG, PNG, WEBP o GIF.";
    }

    return "";
  }

  function validateSelectedFiles(files) {
    const selected = Array.isArray(files) ? files : [];
    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      const fileError = validateSelectedFile(file);
      if (fileError) {
        return fileError;
      }
    }

    return "";
  }

  async function uploadFiles(files, prefix) {
    if (!productsService || typeof productsService.uploadFiles !== "function") {
      throw new Error("Servicio de productos no disponible para subir imagenes.");
    }

    const uploadResult = await productsService.uploadFiles(files, prefix);
    if (!uploadResult || !uploadResult.success) {
      throw new Error((uploadResult && uploadResult.error) || "No se pudieron subir las imagenes.");
    }

    return Array.isArray(uploadResult.data) ? uploadResult.data : [];
  }

  function renderTable() {
    if (state.products.length === 0) {
      refs.tableBody.innerHTML = `
        <tr>
          <td colspan="5" class="text-center text-muted-brand py-4">No hay productos registrados.</td>
        </tr>
      `;
      return;
    }

    refs.tableBody.innerHTML = state.products
      .map((product, index) => {
        const imageSrc = product.imagenUrl || placeholderImage(product.nombre);

        return `
          <tr>
            <td>
              <img src="${window.productUtils.escapeHtml(imageSrc)}" alt="${window.productUtils.escapeHtml(product.nombre)}" class="admin-table-image" loading="lazy" />
            </td>
            <td>
              <strong>${window.productUtils.escapeHtml(product.nombre)}</strong>
              <div class="small text-muted-brand">${window.productUtils.escapeHtml(product.descripcion)}</div>
            </td>
            <td>${window.productUtils.escapeHtml(product.categoria)}</td>
            <td>${window.productUtils.formatCurrency(product.precio)}</td>
            <td class="text-end">
              <div class="d-flex justify-content-end gap-2">
                <button type="button" class="btn btn-sm btn-outline-brand rounded-pill" data-action="edit" data-index="${index}">
                  Editar
                </button>
                <button type="button" class="btn btn-sm btn-danger rounded-pill" data-action="delete" data-index="${index}">
                  Eliminar
                </button>
              </div>
            </td>
          </tr>
        `;
      })
      .join("");
  }

  async function cargarProductos() {
    if (!productsService || typeof productsService.getProducts !== "function") {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    try {
      const productsResult = await productsService.getProducts();
      if (!productsResult || !productsResult.success) {
        setStatus(
          (productsResult && productsResult.error) || "No se pudieron cargar productos.",
          "danger"
        );
        return;
      }

      state.products = Array.isArray(productsResult.data) ? productsResult.data : [];
      renderTable();
      setStatus(`Productos cargados: ${state.products.length}.`, "success");
    } catch (error) {
      console.error("Error al cargar productos en admin:", error);
      setStatus(`Error al cargar productos: ${error.message}`, "danger");
    }
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (!refs.form.checkValidity()) {
      refs.form.reportValidity();
      return;
    }

    if (!productsService || typeof productsService.createProduct !== "function" || typeof productsService.updateProduct !== "function") {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    setLoading(true);

    try {
      const input = getFormInput();
      const selectedFiles = refs.imagen.files ? Array.from(refs.imagen.files) : [];
      const fileError = validateSelectedFiles(selectedFiles);
      if (fileError) {
        setStatus(fileError, "danger");
        return;
      }

      let imageUrl = String(input.imagenUrl || "").trim();
      let galleryUrls = [];

      if (selectedFiles.length > 0) {
        const uploadedUrls = await uploadFiles(selectedFiles, input.nombre);
        imageUrl = uploadedUrls[0] || imageUrl;
        galleryUrls = uploadedUrls;
      } else if (imageUrl) {
        galleryUrls = [imageUrl];
      } else if (state.editingId) {
        const current = state.products.find((item) => item.id === state.editingId);
        if (current && Array.isArray(current.galleryUrls) && current.galleryUrls.length) {
          galleryUrls = current.galleryUrls.slice();
        }
      }

      const payload = window.productUtils.buildProductPayload({
        nombre: input.nombre,
        categoria: input.categoria,
        descripcion: input.descripcion,
        precio: input.precio,
        imagenUrl: imageUrl,
        galleryUrls
      });

      const saveResult = state.editingId
        ? await productsService.updateProduct(state.editingId, payload)
        : await productsService.createProduct(payload);
      if (!saveResult || !saveResult.success) {
        const message =
          (saveResult && saveResult.error) || "No se pudo guardar el producto. Intenta nuevamente.";
        setStatus(message, "danger");
        return;
      }

      const successMessage =
        selectedFiles.length > 1
          ? `${state.editingId ? "Producto actualizado" : "Producto creado"} con ${selectedFiles.length} imagenes. Se uso la primera como portada.`
          : state.editingId
            ? "Producto actualizado correctamente."
            : "Producto creado correctamente.";

      setStatus(successMessage, "success");
      resetForm();
      await cargarProductos();
    } catch (error) {
      console.error("No se pudo guardar el producto:", error);
      setStatus(
        `No se pudo guardar el producto: ${(error && error.message) || "Error inesperado."}`,
        "danger"
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(productId) {
    if (!productId) {
      setStatus("No se encontro el identificador del producto.", "danger");
      return;
    }

    const accepted = window.confirm("Se eliminara este producto. Deseas continuar?");
    if (!accepted) {
      return;
    }

    if (!productsService || typeof productsService.deleteProduct !== "function") {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    try {
      setLoading(true);
      const currentProduct = state.products.find((item) => item.id === productId);
      let storageCleanupWarning = "";
      const cleanup = await productsService.deleteProduct(productId, currentProduct);
      if (!cleanup || !cleanup.success) {
        setStatus((cleanup && cleanup.error) || "No se pudo eliminar el producto.", "danger");
        return;
      }

      const cleanupInfo = cleanup.data || { skipped: 0, cleanupError: false };

      if (cleanupInfo.cleanupError) {
        storageCleanupWarning = " El producto se elimino, pero algunas imagenes no pudieron borrarse del storage.";
      }

      if (cleanupInfo.skipped > 0) {
        storageCleanupWarning += ` ${cleanupInfo.skipped} imagen(es) se conservaron por estar asociadas a otros productos.`;
      }

      setStatus(`Producto eliminado correctamente.${storageCleanupWarning}`, "success");

      if (state.editingId === productId) {
        resetForm();
      }

      await cargarProductos();
    } catch (error) {
      console.error("No se pudo eliminar el producto:", error);
      setStatus(`No se pudo eliminar el producto: ${error.message}`, "danger");
    } finally {
      setLoading(false);
    }
  }

  function bindEvents() {
    refs.tableBody.addEventListener("click", (event) => {
      const button = event.target.closest("button[data-action]");
      if (!button) {
        return;
      }

      const action = button.dataset.action;
      const index = Number.parseInt(button.dataset.index || "-1", 10);
      if (!Number.isInteger(index) || index < 0) {
        return;
      }

      const product = state.products[index];
      if (!product) {
        return;
      }

      if (action === "edit") {
        fillForm(product);
        setStatus("Modo edicion activado.", "info");
        return;
      }

      if (action === "delete") {
        handleDelete(product.id);
      }
    });

    refs.resetBtn.addEventListener("click", () => {
      resetForm();
      setStatus("Formulario reiniciado.", "info");
    });

    refs.imagenUrl.addEventListener("input", () => {
      if (refs.imagen.files && refs.imagen.files.length > 0) {
        return;
      }
      setImagePreview(refs.imagenUrl.value.trim());
    });

    refs.imagen.addEventListener("change", () => {
      clearPreviewObjectUrls();

      if (!refs.imagen.files || refs.imagen.files.length === 0) {
        setImagePreview(refs.imagenUrl.value.trim(), refs.nombre.value.trim() || "Preview");
        return;
      }

      const selected = Array.from(refs.imagen.files);
      const fileError = validateSelectedFiles(selected);
      if (fileError) {
        setStatus(fileError, "danger");
        refs.imagen.value = "";
        setImagePreview(refs.imagenUrl.value.trim(), refs.nombre.value.trim() || "Preview");
        return;
      }

      const previewUrls = selected.map((file) => URL.createObjectURL(file));
      state.previewObjectUrls = previewUrls;
      setImagePreview(previewUrls, refs.nombre.value.trim() || "Preview");
    });

    refs.form.addEventListener("submit", handleSubmit);
  }

  function cacheRefs() {
    refs.section = document.getElementById("productosSection");
    refs.form = document.getElementById("productForm");
    refs.status = document.getElementById("productosStatus");
    refs.tableBody = document.getElementById("productsTableBody");
    refs.productId = document.getElementById("productId");
    refs.nombre = document.getElementById("nombre");
    refs.categoria = document.getElementById("categoria");
    refs.precio = document.getElementById("precio");
    refs.descripcion = document.getElementById("descripcion");
    refs.imagen = document.getElementById("imagen");
    refs.imagenUrl = document.getElementById("imagenUrl");
    refs.imagePreviewContainer = document.getElementById("imagePreviewContainer");
    refs.saveBtn = document.getElementById("saveBtn");
    refs.resetBtn = document.getElementById("resetBtn");

    return Boolean(
      refs.section &&
        refs.form &&
        refs.status &&
        refs.tableBody &&
        refs.productId &&
        refs.nombre &&
        refs.categoria &&
        refs.precio &&
        refs.descripcion &&
        refs.imagen &&
        refs.imagenUrl &&
        refs.imagePreviewContainer &&
        refs.saveBtn &&
        refs.resetBtn
    );
  }

  function initProductos() {
    if (state.initialized) {
      return true;
    }

    const ok = cacheRefs();
    if (!ok) {
      console.error("Productos no pudo inicializarse: faltan elementos en admin.html");
      return false;
    }

    bindEvents();
    state.initialized = true;
    return true;
  }

  window.productosModule = Object.freeze({
    initProductos,
    cargarProductos
  });

  window.cargarProductos = cargarProductos;
})();