import { getState, subscribe } from "../../../core/store.js";
import { createProduct, deleteProduct, getProducts, updateProduct, uploadFiles } from "../service.js";
import { buildPlaceholderImage, escapeHtml, formatCurrency, isHttpUrl } from "../../../shared/product-utils.js";
import { shouldUseCarousel } from "./shared.js";

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;
const MAX_IMAGE_COUNT = 5;
const MAX_PRICE = 999999.99;
const NAME_MIN = 3;
const NAME_MAX = 120;
const DESCRIPTION_MIN = 10;
const DESCRIPTION_MAX = 1000;
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
  featured: null,
  imagen: null,
  imagenUrl: null,
  imagePreviewContainer: null,
  saveBtn: null,
  resetBtn: null
};

const state = {
  initialized: false,
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

function clearPreviewObjectUrls() {
  state.previewObjectUrls.forEach((url) => {
    try {
      URL.revokeObjectURL(url);
    } catch {
      // No rompemos el flujo si el browser ya limpio la URL.
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

  const safeLabel = escapeHtml(String(label || "Preview"));

  if (!shouldUseCarousel(cleaned)) {
    refs.imagePreviewContainer.innerHTML = `
      <img class="admin-image-preview" src="${escapeHtml(cleaned[0])}" alt="${safeLabel}" />
    `;
    refs.imagePreviewContainer.classList.remove("d-none");
    return;
  }

  const carouselId = "adminPreviewCarousel";
  refs.imagePreviewContainer.innerHTML = `
    <div id="${carouselId}" class="carousel slide admin-preview-carousel" data-bs-ride="false">
      <div class="carousel-indicators">
        ${cleaned
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
          .join("")}
      </div>
      <div class="carousel-inner">
        ${cleaned
          .map((url, index) => {
            const activeClass = index === 0 ? "active" : "";
            return `
              <div class="carousel-item ${activeClass}">
                <img class="d-block w-100 admin-image-preview" src="${escapeHtml(url)}" alt="${safeLabel} ${index + 1}" />
              </div>
            `;
          })
          .join("")}
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
  refs.featured.checked = false;
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
  refs.featured.checked = product.featured === true;
  refs.imagenUrl.value = product.imagenUrl;
  refs.imagen.value = "";
  refs.saveBtn.textContent = "Actualizar producto";
  setImagePreview(product.galleryUrls.length ? product.galleryUrls : [product.imagenUrl], product.nombre);
}

function getFormInput() {
  return {
    nombre: refs.nombre.value,
    categoria: refs.categoria.value,
    precio: refs.precio.value,
    descripcion: refs.descripcion.value,
    imagenUrl: refs.imagenUrl.value,
    featured: refs.featured.checked
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
  if (selected.length > MAX_IMAGE_COUNT) {
    return `Solo puedes subir hasta ${MAX_IMAGE_COUNT} imagenes por producto.`;
  }

  for (let index = 0; index < selected.length; index += 1) {
    const fileError = validateSelectedFile(selected[index]);
    if (fileError) {
      return fileError;
    }
  }

  return "";
}

function validateFormInput(input) {
  const nombre = String(input && input.nombre ? input.nombre : "").trim();
  const descripcion = String(input && input.descripcion ? input.descripcion : "").trim();
  const precio = Number.parseFloat(String(input && input.precio ? input.precio : ""));
  const imagenUrl = String(input && input.imagenUrl ? input.imagenUrl : "").trim();

  if (nombre.length < NAME_MIN || nombre.length > NAME_MAX) {
    return `El nombre debe tener entre ${NAME_MIN} y ${NAME_MAX} caracteres.`;
  }

  if (descripcion.length < DESCRIPTION_MIN || descripcion.length > DESCRIPTION_MAX) {
    return `La descripcion debe tener entre ${DESCRIPTION_MIN} y ${DESCRIPTION_MAX} caracteres.`;
  }

  if (!Number.isFinite(precio) || precio < 0 || precio > MAX_PRICE) {
    return `El precio debe estar entre 0 y ${MAX_PRICE.toFixed(2)} NIO.`;
  }

  if (imagenUrl && !isHttpUrl(imagenUrl)) {
    return "La URL de imagen debe iniciar con http:// o https://";
  }

  return "";
}

function renderTable() {
  const products = getState().products;

  if (!products.length) {
    refs.tableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted-brand py-4">No hay productos registrados.</td>
      </tr>
    `;
    return;
  }

  refs.tableBody.innerHTML = products
    .map((product, index) => {
      const imageSrc = product.imagenUrl || buildPlaceholderImage(product.nombre, "320x240");
      const featuredBadge = product.featured
        ? '<span class="badge rounded-pill text-bg-warning ms-2">Destacado</span>'
        : "";

      return `
        <tr>
          <td>
            <img src="${escapeHtml(imageSrc)}" alt="${escapeHtml(product.nombre)}" class="admin-table-image" loading="lazy" />
          </td>
          <td>
            <strong>${escapeHtml(product.nombre)}</strong>${featuredBadge}
            <div class="small text-muted-brand">${escapeHtml(product.descripcion)}</div>
          </td>
          <td>${escapeHtml(product.categoria)}</td>
          <td>${formatCurrency(product.precio)}</td>
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

async function refreshProducts() {
  const result = await getProducts();
  if (!result.success) {
    setStatus(result.error || "No se pudieron cargar productos.", "danger");
    return;
  }

  renderTable();
  setStatus(`Productos cargados: ${result.data.length}.`, "success");
}

async function handleSubmit(event) {
  event.preventDefault();

  if (!refs.form.checkValidity()) {
    refs.form.reportValidity();
    return;
  }

  setLoading(true);

  try {
    const input = getFormInput();
    const inputError = validateFormInput(input);
    if (inputError) {
      setStatus(inputError, "danger");
      return;
    }

    const selectedFiles = refs.imagen.files ? Array.from(refs.imagen.files) : [];
    const fileError = validateSelectedFiles(selectedFiles);

    if (fileError) {
      setStatus(fileError, "danger");
      return;
    }

    let imageUrl = String(input.imagenUrl || "").trim();
    let galleryUrls = [];

    if (selectedFiles.length > 0) {
      const uploadResult = await uploadFiles(selectedFiles, input.nombre);
      if (!uploadResult.success) {
        setStatus(uploadResult.error || "No se pudieron subir las imagenes.", "danger");
        return;
      }

      galleryUrls = uploadResult.data || [];
      imageUrl = galleryUrls[0] || imageUrl;
    } else if (imageUrl) {
      galleryUrls = [imageUrl];
    } else if (state.editingId) {
      const current = getState().products.find((item) => item.id === state.editingId);
      galleryUrls = current && Array.isArray(current.galleryUrls) ? current.galleryUrls.slice() : [];
      imageUrl = current ? current.imagenUrl : "";
    }

    const payload = {
      ...input,
      imagenUrl: imageUrl,
      galleryUrls
    };

    const saveResult = state.editingId
      ? await updateProduct(state.editingId, payload)
      : await createProduct(payload);

    if (!saveResult.success) {
      setStatus(saveResult.error || "No se pudo guardar el producto.", "danger");
      return;
    }

    setStatus(state.editingId ? "Producto actualizado correctamente." : "Producto creado correctamente.", "success");
    resetForm();
    renderTable();
  } catch (error) {
    console.error("No se pudo guardar el producto:", error);
    setStatus(`No se pudo guardar el producto: ${error.message || "Error inesperado."}`, "danger");
  } finally {
    setLoading(false);
  }
}

async function handleDelete(productId) {
  if (!productId) {
    setStatus("No se encontro el identificador del producto.", "danger");
    return;
  }

  if (!globalThis.confirm("Se eliminara este producto. Deseas continuar?")) {
    return;
  }

  try {
    setLoading(true);
    const currentProduct = getState().products.find((item) => item.id === productId);
    const cleanupResult = await deleteProduct(productId, currentProduct);

    if (!cleanupResult.success) {
      setStatus(cleanupResult.error || "No se pudo eliminar el producto.", "danger");
      return;
    }

    const cleanupInfo = cleanupResult.data || { skipped: 0, cleanupError: false };
    let warningMessage = "";

    if (cleanupInfo.cleanupError) {
      warningMessage = " El producto se elimino, pero algunas imagenes no pudieron borrarse del storage.";
    }

    if (cleanupInfo.skipped > 0) {
      warningMessage += ` ${cleanupInfo.skipped} imagen(es) se conservaron por estar asociadas a otros productos.`;
    }

    if (state.editingId === productId) {
      resetForm();
    }

    setStatus(`Producto eliminado correctamente.${warningMessage}`, "success");
    renderTable();
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

    const index = Number.parseInt(button.dataset.index || "-1", 10);
    const product = getState().products[index];
    if (!product) {
      return;
    }

    if (button.dataset.action === "edit") {
      fillForm(product);
      setStatus("Modo edicion activado.", "info");
      return;
    }

    if (button.dataset.action === "delete") {
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

    const imageUrl = refs.imagenUrl.value.trim();
    setImagePreview(imageUrl ? [imageUrl] : [], refs.nombre.value.trim() || "Preview");
  });

  refs.imagen.addEventListener("change", () => {
    clearPreviewObjectUrls();

    if (!refs.imagen.files || refs.imagen.files.length === 0) {
      const imageUrl = refs.imagenUrl.value.trim();
      setImagePreview(imageUrl ? [imageUrl] : [], refs.nombre.value.trim() || "Preview");
      return;
    }

    const selected = Array.from(refs.imagen.files);
    const fileError = validateSelectedFiles(selected);

    if (fileError) {
      setStatus(fileError, "danger");
      refs.imagen.value = "";
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
  refs.featured = document.getElementById("featured");
  refs.imagen = document.getElementById("imagen");
  refs.imagenUrl = document.getElementById("imagenUrl");
  refs.imagePreviewContainer = document.getElementById("imagePreviewContainer");
  refs.saveBtn = document.getElementById("saveBtn");
  refs.resetBtn = document.getElementById("resetBtn");

  return Object.values(refs).every(Boolean);
}

export function initProductsAdminUI() {
  if (state.initialized) {
    return true;
  }

  if (!cacheRefs()) {
    console.error("Productos no pudo inicializarse: faltan elementos en admin.html");
    return false;
  }

  bindEvents();
  subscribe(() => {
    renderTable();
  });
  state.initialized = true;
  return true;
}

export async function openProductsAdmin() {
  if (!initProductsAdminUI()) {
    return;
  }

  await refreshProducts();
}
