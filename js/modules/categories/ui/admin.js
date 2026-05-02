import {
  createCategory,
  createSubcategory,
  deleteCategory,
  deleteSubcategory,
  getCategoriesForAdmin,
  getSubcategoriesForAdmin,
  updateCategory,
  updateSubcategory
} from "../../subcategories/service.js";
import { escapeHtml } from "../../../shared/product-utils.js";

const refs = {
  status: null,
  categoryForm: null,
  categoryId: null,
  categoryName: null,
  categoryOrder: null,
  categoryActive: null,
  categorySaveBtn: null,
  categoryResetBtn: null,
  categoriesTableBody: null,
  subcategoryForm: null,
  subcategoryId: null,
  subcategoryName: null,
  subcategoryCategory: null,
  subcategoryOrder: null,
  subcategoryDescription: null,
  subcategoryActive: null,
  subcategorySaveBtn: null,
  subcategoryResetBtn: null,
  subcategoriesTableBody: null
};

const state = {
  initialized: false,
  categories: [],
  subcategories: [],
  editingCategoryId: null,
  editingSubcategoryId: null
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
  refs.status.className = getAlertClass(kind);
  refs.status.textContent = message;
}

function getCategoryById(id) {
  return state.categories.find((category) => category.id === id) || null;
}

function getCategoryName(categoryId, fallback) {
  const category = getCategoryById(String(categoryId || ""));
  return category ? category.nombre : String(fallback || "Sin categoria");
}

function setCategoryLoading(loading) {
  refs.categorySaveBtn.disabled = loading;
  refs.categoryResetBtn.disabled = loading;
  refs.categorySaveBtn.textContent = loading
    ? "Guardando..."
    : state.editingCategoryId
      ? "Actualizar categoria"
      : "Guardar categoria";
}

function setSubcategoryLoading(loading) {
  refs.subcategorySaveBtn.disabled = loading;
  refs.subcategoryResetBtn.disabled = loading;
  refs.subcategorySaveBtn.textContent = loading
    ? "Guardando..."
    : state.editingSubcategoryId
      ? "Actualizar subcategoria"
      : "Guardar subcategoria";
}

function resetCategoryForm() {
  state.editingCategoryId = null;
  refs.categoryForm.reset();
  refs.categoryId.value = "";
  refs.categoryOrder.value = "0";
  refs.categoryActive.checked = true;
  setCategoryLoading(false);
}

function resetSubcategoryForm() {
  state.editingSubcategoryId = null;
  refs.subcategoryForm.reset();
  refs.subcategoryId.value = "";
  refs.subcategoryOrder.value = "0";
  refs.subcategoryActive.checked = true;
  setSubcategoryLoading(false);
}

function renderCategoryOptions() {
  if (!state.categories.length) {
    refs.subcategoryCategory.innerHTML = '<option value="">Crea una categoria primero</option>';
    return;
  }

  refs.subcategoryCategory.innerHTML = state.categories
    .map((category) => {
      const label = category.is_active ? category.nombre : `${category.nombre} (inactiva)`;
      return `<option value="${escapeHtml(category.id)}">${escapeHtml(label)}</option>`;
    })
    .join("");
}

function renderCategoriesTable() {
  if (!state.categories.length) {
    refs.categoriesTableBody.innerHTML = `
      <tr>
        <td colspan="4" class="text-center text-muted-brand py-4">No hay categorias registradas.</td>
      </tr>
    `;
    return;
  }

  refs.categoriesTableBody.innerHTML = state.categories
    .map((category, index) => {
      const badge = category.is_active
        ? '<span class="badge rounded-pill text-bg-success">Activa</span>'
        : '<span class="badge rounded-pill text-bg-secondary">Inactiva</span>';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(category.nombre)}</strong>
          </td>
          <td>${category.orden}</td>
          <td>${badge}</td>
          <td class="text-end">
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-sm btn-outline-brand rounded-pill" data-category-action="edit" data-index="${index}">
                Editar
              </button>
              <button type="button" class="btn btn-sm btn-danger rounded-pill" data-category-action="delete" data-index="${index}">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderSubcategoriesTable() {
  if (!state.subcategories.length) {
    refs.subcategoriesTableBody.innerHTML = `
      <tr>
        <td colspan="5" class="text-center text-muted-brand py-4">No hay subcategorias registradas.</td>
      </tr>
    `;
    return;
  }

  refs.subcategoriesTableBody.innerHTML = state.subcategories
    .map((subcategory, index) => {
      const badge = subcategory.is_active
        ? '<span class="badge rounded-pill text-bg-success">Activa</span>'
        : '<span class="badge rounded-pill text-bg-secondary">Inactiva</span>';

      return `
        <tr>
          <td>
            <strong>${escapeHtml(subcategory.nombre)}</strong>
            <div class="small text-muted-brand">${escapeHtml(subcategory.descripcion || "")}</div>
          </td>
          <td>${escapeHtml(getCategoryName(subcategory.categoria_id, subcategory.categoria))}</td>
          <td>${subcategory.orden}</td>
          <td>${badge}</td>
          <td class="text-end">
            <div class="d-flex justify-content-end gap-2">
              <button type="button" class="btn btn-sm btn-outline-brand rounded-pill" data-subcategory-action="edit" data-index="${index}">
                Editar
              </button>
              <button type="button" class="btn btn-sm btn-danger rounded-pill" data-subcategory-action="delete" data-index="${index}">
                Eliminar
              </button>
            </div>
          </td>
        </tr>
      `;
    })
    .join("");
}

function renderAll() {
  renderCategoryOptions();
  renderCategoriesTable();
  renderSubcategoriesTable();
}

async function refreshCategoriesAdmin() {
  const [categoriesResult, subcategoriesResult] = await Promise.all([
    getCategoriesForAdmin(),
    getSubcategoriesForAdmin()
  ]);

  if (!categoriesResult.success) {
    setStatus(categoriesResult.error || "No se pudieron cargar categorias.", "danger");
    return;
  }

  if (!subcategoriesResult.success) {
    setStatus(subcategoriesResult.error || "No se pudieron cargar subcategorias.", "danger");
    return;
  }

  state.categories = categoriesResult.data;
  state.subcategories = subcategoriesResult.data;
  renderAll();
  setStatus(`Categorias: ${state.categories.length}. Subcategorias: ${state.subcategories.length}.`, "success");
}

function fillCategoryForm(category) {
  state.editingCategoryId = category.id;
  refs.categoryId.value = category.id;
  refs.categoryName.value = category.nombre;
  refs.categoryOrder.value = String(category.orden);
  refs.categoryActive.checked = category.is_active;
  setCategoryLoading(false);
  refs.categoryName.focus();
}

function fillSubcategoryForm(subcategory) {
  state.editingSubcategoryId = subcategory.id;
  refs.subcategoryId.value = subcategory.id;
  refs.subcategoryName.value = subcategory.nombre;
  refs.subcategoryCategory.value = subcategory.categoria_id || "";
  refs.subcategoryOrder.value = String(subcategory.orden);
  refs.subcategoryDescription.value = subcategory.descripcion || "";
  refs.subcategoryActive.checked = subcategory.is_active;
  setSubcategoryLoading(false);
  refs.subcategoryName.focus();
}

function getCategoryInput() {
  return {
    nombre: refs.categoryName.value,
    orden: refs.categoryOrder.value,
    is_active: refs.categoryActive.checked
  };
}

function getSubcategoryInput() {
  const category = getCategoryById(refs.subcategoryCategory.value);
  return {
    nombre: refs.subcategoryName.value,
    categoria_id: category ? category.id : null,
    categoria: category ? category.nombre : "",
    orden: refs.subcategoryOrder.value,
    descripcion: refs.subcategoryDescription.value,
    is_active: refs.subcategoryActive.checked
  };
}

async function handleCategorySubmit(event) {
  event.preventDefault();

  if (!refs.categoryForm.checkValidity()) {
    refs.categoryForm.reportValidity();
    return;
  }

  setCategoryLoading(true);
  try {
    const input = getCategoryInput();
    const wasEditing = Boolean(state.editingCategoryId);
    const result = state.editingCategoryId
      ? await updateCategory(state.editingCategoryId, input)
      : await createCategory(input);

    if (!result.success) {
      setStatus(result.error || "No se pudo guardar categoria.", "danger");
      return;
    }

    resetCategoryForm();
    await refreshCategoriesAdmin();
    setStatus(wasEditing ? "Categoria actualizada." : "Categoria creada.", "success");
  } finally {
    setCategoryLoading(false);
  }
}

async function handleSubcategorySubmit(event) {
  event.preventDefault();

  if (!refs.subcategoryForm.checkValidity()) {
    refs.subcategoryForm.reportValidity();
    return;
  }

  setSubcategoryLoading(true);
  try {
    const input = getSubcategoryInput();
    const wasEditing = Boolean(state.editingSubcategoryId);
    const result = state.editingSubcategoryId
      ? await updateSubcategory(state.editingSubcategoryId, input)
      : await createSubcategory(input);

    if (!result.success) {
      setStatus(result.error || "No se pudo guardar subcategoria.", "danger");
      return;
    }

    resetSubcategoryForm();
    await refreshCategoriesAdmin();
    setStatus(wasEditing ? "Subcategoria actualizada." : "Subcategoria creada.", "success");
  } finally {
    setSubcategoryLoading(false);
  }
}

async function handleCategoryDelete(category) {
  if (!category) {
    return;
  }

  if (!globalThis.confirm("Se eliminara esta categoria. Si tiene productos o subcategorias asociadas, la base de datos puede impedirlo. Deseas continuar?")) {
    return;
  }

  const result = await deleteCategory(category.id);
  if (!result.success) {
    setStatus(result.error || "No se pudo eliminar categoria.", "danger");
    return;
  }

  if (state.editingCategoryId === category.id) {
    resetCategoryForm();
  }

  await refreshCategoriesAdmin();
  setStatus("Categoria eliminada.", "success");
}

async function handleSubcategoryDelete(subcategory) {
  if (!subcategory) {
    return;
  }

  if (!globalThis.confirm("Se eliminara esta subcategoria. Los productos asociados quedaran sin subcategoria. Deseas continuar?")) {
    return;
  }

  const result = await deleteSubcategory(subcategory.id);
  if (!result.success) {
    setStatus(result.error || "No se pudo eliminar subcategoria.", "danger");
    return;
  }

  if (state.editingSubcategoryId === subcategory.id) {
    resetSubcategoryForm();
  }

  await refreshCategoriesAdmin();
  setStatus("Subcategoria eliminada.", "success");
}

function bindEvents() {
  refs.categoryForm.addEventListener("submit", handleCategorySubmit);
  refs.categoryResetBtn.addEventListener("click", () => {
    resetCategoryForm();
    setStatus("Formulario de categoria reiniciado.", "info");
  });

  refs.subcategoryForm.addEventListener("submit", handleSubcategorySubmit);
  refs.subcategoryResetBtn.addEventListener("click", () => {
    resetSubcategoryForm();
    setStatus("Formulario de subcategoria reiniciado.", "info");
  });

  refs.categoriesTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-category-action]");
    if (!button) {
      return;
    }

    const category = state.categories[Number.parseInt(button.dataset.index || "-1", 10)];
    if (!category) {
      return;
    }

    if (button.dataset.categoryAction === "edit") {
      fillCategoryForm(category);
      setStatus("Modo edicion de categoria activado.", "info");
      return;
    }

    handleCategoryDelete(category);
  });

  refs.subcategoriesTableBody.addEventListener("click", (event) => {
    const button = event.target.closest("button[data-subcategory-action]");
    if (!button) {
      return;
    }

    const subcategory = state.subcategories[Number.parseInt(button.dataset.index || "-1", 10)];
    if (!subcategory) {
      return;
    }

    if (button.dataset.subcategoryAction === "edit") {
      fillSubcategoryForm(subcategory);
      setStatus("Modo edicion de subcategoria activado.", "info");
      return;
    }

    handleSubcategoryDelete(subcategory);
  });
}

function cacheRefs() {
  refs.status = document.getElementById("categoriasStatus");
  refs.categoryForm = document.getElementById("categoryForm");
  refs.categoryId = document.getElementById("categoryId");
  refs.categoryName = document.getElementById("categoryName");
  refs.categoryOrder = document.getElementById("categoryOrder");
  refs.categoryActive = document.getElementById("categoryActive");
  refs.categorySaveBtn = document.getElementById("categorySaveBtn");
  refs.categoryResetBtn = document.getElementById("categoryResetBtn");
  refs.categoriesTableBody = document.getElementById("categoriesTableBody");
  refs.subcategoryForm = document.getElementById("subcategoryForm");
  refs.subcategoryId = document.getElementById("subcategoryId");
  refs.subcategoryName = document.getElementById("subcategoryName");
  refs.subcategoryCategory = document.getElementById("subcategoryCategory");
  refs.subcategoryOrder = document.getElementById("subcategoryOrder");
  refs.subcategoryDescription = document.getElementById("subcategoryDescription");
  refs.subcategoryActive = document.getElementById("subcategoryActive");
  refs.subcategorySaveBtn = document.getElementById("subcategorySaveBtn");
  refs.subcategoryResetBtn = document.getElementById("subcategoryResetBtn");
  refs.subcategoriesTableBody = document.getElementById("subcategoriesTableBody");

  return Object.values(refs).every(Boolean);
}

export function initCategoriesAdminUI() {
  if (state.initialized) {
    return true;
  }

  if (!cacheRefs()) {
    console.error("Categorias no pudo inicializarse: faltan elementos en admin.html");
    return false;
  }

  bindEvents();
  state.initialized = true;
  return true;
}

export async function openCategoriesAdmin() {
  if (!initCategoriesAdminUI()) {
    return;
  }

  await refreshCategoriesAdmin();
}
