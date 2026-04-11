(function productosModule() {
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
    imagePreview: null,
    saveBtn: null,
    resetBtn: null
  };

  const state = {
    initialized: false,
    products: [],
    editingId: null,
    previewObjectUrl: ""
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

  function toSlug(value) {
    return String(value || "")
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 40);
  }

  function extractStoragePathFromPublicUrl(url) {
    const raw = String(url || "").trim();
    if (!raw) {
      return "";
    }

    if (!/^https?:\/\//i.test(raw)) {
      return raw.replace(/^\/+/, "");
    }

    try {
      const parsed = new URL(raw);
      const marker = `/storage/v1/object/public/${window.appConfig.bucket}/`;
      const path = parsed.pathname;
      const markerIndex = path.indexOf(marker);
      if (markerIndex === -1) {
        return "";
      }

      return decodeURIComponent(path.slice(markerIndex + marker.length));
    } catch (_) {
      return "";
    }
  }

  function clearPreviewObjectUrl() {
    if (state.previewObjectUrl) {
      URL.revokeObjectURL(state.previewObjectUrl);
      state.previewObjectUrl = "";
    }
  }

  function setImagePreview(url) {
    if (!url) {
      refs.imagePreview.classList.add("d-none");
      refs.imagePreview.removeAttribute("src");
      return;
    }

    refs.imagePreview.src = url;
    refs.imagePreview.classList.remove("d-none");
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
    clearPreviewObjectUrl();
    setImagePreview("");
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
    setImagePreview(product.imagenUrl || placeholderImage(product.nombre));
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

  function isHttpUrl(value) {
    try {
      const parsed = new URL(value);
      return parsed.protocol === "http:" || parsed.protocol === "https:";
    } catch (_) {
      return false;
    }
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

  function validateProductInput(input, selectedFiles) {
    const nombre = String(input.nombre || "").trim();
    const categoria = String(input.categoria || "").trim();
    const descripcion = String(input.descripcion || "").trim();
    const precio = Number.parseFloat(input.precio);
    const imageUrl = String(input.imagenUrl || "").trim();

    if (nombre.length < 3) {
      return "El nombre debe tener al menos 3 caracteres.";
    }

    if (!categoria) {
      return "Selecciona una categoria valida.";
    }

    if (!Number.isFinite(precio) || precio < 0) {
      return "El precio debe ser un numero mayor o igual a 0.";
    }

    if (descripcion.length < 10) {
      return "La descripcion debe tener al menos 10 caracteres.";
    }

    if (imageUrl && !isHttpUrl(imageUrl)) {
      return "La URL de imagen debe iniciar con http:// o https://";
    }

    const fileError = validateSelectedFiles(selectedFiles);
    if (fileError) {
      return fileError;
    }

    return "";
  }

  async function uploadFile(file, prefix) {
    const fileError = validateSelectedFile(file);
    if (fileError) {
      throw new Error(fileError);
    }

    const client = window.getSupabaseClient();
    if (!client) {
      throw new Error("No se pudo conectar a Supabase para subir la imagen.");
    }

    const extension = (file.name.split(".").pop() || "jpg").toLowerCase();
    const base = toSlug(prefix || file.name.replace(`.${extension}`, "")) || "producto";
    const path = `catalogo/${Date.now()}-${base}.${extension}`;

    const upload = await client.storage.from(window.appConfig.bucket).upload(path, file, {
      cacheControl: "3600",
      upsert: false
    });

    if (upload.error) {
      throw new Error(upload.error.message);
    }

    const publicData = client.storage.from(window.appConfig.bucket).getPublicUrl(path);
    const publicUrl = publicData && publicData.data ? publicData.data.publicUrl : "";

    if (!publicUrl) {
      throw new Error("No se pudo generar URL publica de la imagen.");
    }

    return publicUrl;
  }

  async function uploadFiles(files, prefix) {
    const selected = Array.isArray(files) ? files : [];
    const uploaded = [];

    for (let index = 0; index < selected.length; index += 1) {
      const file = selected[index];
      const url = await uploadFile(file, `${prefix || "producto"}-${index + 1}`);
      uploaded.push(url);
    }

    return uploaded;
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
    const client = window.getSupabaseClient();
    if (!client) {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    try {
      const table = window.appConfig.productsTable;
      let result = await client
        .from(table)
        .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at")
        .order("created_at", { ascending: false });

      if (result.error && String(result.error.message || "").includes("created_at")) {
        result = await client
          .from(table)
          .select("id,nombre,categoria,descripcion,precio,imagen_url,gallery_urls,created_at");
      }

      if (result.error) {
        throw new Error(result.error.message);
      }

      state.products = (result.data || []).map((row) => window.productUtils.normalizeProduct(row));
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

    const client = window.getSupabaseClient();
    if (!client) {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    setLoading(true);

    try {
      const input = getFormInput();
      const selectedFiles = refs.imagen.files ? Array.from(refs.imagen.files) : [];
      const validationError = validateProductInput(input, selectedFiles);

      if (validationError) {
        setStatus(validationError, "danger");
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

      const table = window.appConfig.productsTable;
      let result;

      if (state.editingId) {
        result = await client.from(table).update(payload).eq("id", state.editingId);
      } else {
        result = await client.from(table).insert(payload);
      }

      if (result.error) {
        throw new Error(result.error.message);
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
      setStatus(`No se pudo guardar el producto: ${error.message}`, "danger");
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

    const client = window.getSupabaseClient();
    if (!client) {
      setStatus("No se pudo conectar a Supabase. Revisa la configuracion.", "danger");
      return;
    }

    try {
      setLoading(true);
      const table = window.appConfig.productsTable;
      const currentProduct = state.products.find((item) => item.id === productId);
      const result = await client.from(table).delete().eq("id", productId);

      if (result.error) {
        throw new Error(result.error.message);
      }

      let storageCleanupWarning = "";
      const imageUrls = new Set();
      if (currentProduct && currentProduct.imagenUrl) {
        imageUrls.add(currentProduct.imagenUrl);
      }
      if (currentProduct && Array.isArray(currentProduct.galleryUrls)) {
        currentProduct.galleryUrls.forEach((url) => {
          if (url) {
            imageUrls.add(url);
          }
        });
      }

      const paths = Array.from(imageUrls)
        .map((url) => extractStoragePathFromPublicUrl(url))
        .filter(Boolean);

      if (paths.length > 0) {
        const storageResult = await client.storage.from(window.appConfig.bucket).remove(paths);
        if (storageResult.error) {
          console.warn("No se pudo eliminar imagen del storage:", storageResult.error);
          storageCleanupWarning = " El producto se elimino, pero algunas imagenes no pudieron borrarse del storage.";
        }
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
      clearPreviewObjectUrl();

      if (!refs.imagen.files || refs.imagen.files.length === 0) {
        setImagePreview(refs.imagenUrl.value.trim());
        return;
      }

      const file = refs.imagen.files[0];
      const fileError = validateSelectedFile(file);
      if (fileError) {
        setStatus(fileError, "danger");
        refs.imagen.value = "";
        setImagePreview(refs.imagenUrl.value.trim());
        return;
      }

      state.previewObjectUrl = URL.createObjectURL(file);
      setImagePreview(state.previewObjectUrl);
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
    refs.imagePreview = document.getElementById("imagePreview");
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
        refs.imagePreview &&
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