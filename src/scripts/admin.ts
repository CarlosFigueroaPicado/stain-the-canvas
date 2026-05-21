import {
  createCategory,
  createProduct,
  createSubcategory,
  deleteCategory,
  deleteProduct,
  deleteSubcategory,
  getProducts,
  updateCategory,
  updateProduct,
  updateSubcategory,
  type ProductInput
} from '../lib/catalog.admin';
import { supabase, supabaseConfig } from '../lib/supabase';

type FormMode = 'create' | 'edit';

let currentVideoPreviewObjectUrl: string | null = null;

function openModal(id: string) {
  const modal = document.getElementById(id);
  if (!modal) return;

  modal.setAttribute('aria-hidden', 'false');
  document.body.classList.add('has-modal');
}

function closeModals() {
  document.querySelectorAll('[data-admin-overlay]').forEach((modal) => {
    modal.setAttribute('aria-hidden', 'true');
  });
  document.body.classList.remove('has-modal');
}

function getProductForm() {
  return document.querySelector<HTMLFormElement>('[data-product-form]');
}

function getCategoryForm() {
  return document.querySelector<HTMLFormElement>('[data-category-form]');
}

function getSubcategoryForm() {
  return document.querySelector<HTMLFormElement>('[data-subcategory-form]');
}

function getProductGalleryInput() {
  return document.querySelector<HTMLInputElement>('[data-product-gallery-urls]');
}

function parseGalleryUrls(value: string) {
  if (!value.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.map((item) => String(item).trim()).filter(Boolean)
      : [];
  } catch {
    return [];
  }
}

function normalizeGalleryUrls(value: string[]) {
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function renderProductMediaPreviews(urls: string[]) {
  const form = getProductForm();
  if (!form) return;

  const previewList = form.querySelector<HTMLElement>('[data-product-media-preview-list]');
  const primaryImageInput = form.querySelector<HTMLInputElement>('[data-product-existing-image-url]');
  const existingVideoUrl = form.querySelector<HTMLInputElement>('[data-product-existing-video-url]')?.value.trim() || '';
  const galleryInput = getProductGalleryInput();
  const uniqueUrls = normalizeGalleryUrls(urls);

  if (galleryInput) {
    galleryInput.value = JSON.stringify(uniqueUrls);
  }

  if (primaryImageInput) {
    primaryImageInput.value = uniqueUrls[0] || '';
  }

  if (existingVideoUrl || currentVideoPreviewObjectUrl) {
    renderProductVideoPreview(currentVideoPreviewObjectUrl || existingVideoUrl, uniqueUrls[0] || '', Boolean(currentVideoPreviewObjectUrl));
  }

  const help = form.querySelector<HTMLElement>('[data-product-media-help]');
  if (help) {
    help.textContent = uniqueUrls.length > 0
      ? 'Puedes eliminar imágenes desde la vista previa antes de guardar.'
      : 'Sube una imagen, un video o ambos en un solo paso.';
  }

  if (!previewList) return;

  previewList.innerHTML = uniqueUrls.length > 0
    ? uniqueUrls
        .map(
          (url) => `
            <div class="admin-media-preview__item" data-product-media-item data-media-url="${escapeHtml(url)}">
              <button class="admin-media-preview__remove" type="button" data-product-media-remove aria-label="Eliminar imagen">×</button>
              <img class="admin-media-preview__image" src="${escapeHtml(url)}" alt="Vista previa de imagen" loading="lazy">
            </div>`
        )
        .join('')
    : '<p class="admin-media-preview__empty">No hay imágenes cargadas.</p>';
}

function renderProductVideoPreview(url: string, posterUrl = '', isObjectUrl = false) {
  const form = getProductForm();
  if (!form) return;

  const wrap = form.querySelector<HTMLElement>('[data-product-video-preview-wrap]');
  const player = form.querySelector<HTMLVideoElement>('[data-product-video-preview]');

  if (!wrap || !player) return;

  if (currentVideoPreviewObjectUrl && !isObjectUrl) {
    URL.revokeObjectURL(currentVideoPreviewObjectUrl);
    currentVideoPreviewObjectUrl = null;
  }

  if (!url) {
    player.pause();
    player.removeAttribute('src');
    player.removeAttribute('poster');
    player.load();
    wrap.hidden = true;
    return;
  }

  player.src = url;
  if (posterUrl) {
    player.poster = posterUrl;
  } else {
    player.removeAttribute('poster');
  }

  wrap.hidden = false;
}

function setProductVideoPreviewFromFile(file: File | null, posterUrl = '') {
  if (!file) {
    const form = getProductForm();
    const existingVideoUrl = form?.querySelector<HTMLInputElement>('[data-product-existing-video-url]')?.value.trim() || '';
    renderProductVideoPreview(existingVideoUrl, posterUrl);
    return;
  }

  if (currentVideoPreviewObjectUrl) {
    URL.revokeObjectURL(currentVideoPreviewObjectUrl);
  }

  currentVideoPreviewObjectUrl = URL.createObjectURL(file);
  renderProductVideoPreview(currentVideoPreviewObjectUrl, posterUrl, true);
}

function fileExtension(file: File) {
  const parts = file.name.split('.');
  return parts.length > 1 ? `.${parts.pop()?.toLowerCase() || ''}` : '';
}

function safeFileName(name: string) {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

async function uploadProductFile(file: File, kind: 'image' | 'video') {
  const path = `catalogo/${kind}s/${Date.now()}-${crypto.randomUUID()}-${safeFileName(file.name)}${fileExtension(file)}`;

  const { error } = await supabase.storage.from(supabaseConfig.bucket).upload(path, file, {
    upsert: true,
    contentType: file.type || undefined
  });

  if (error) {
    throw new Error(error.message);
  }

  const { data } = supabase.storage.from(supabaseConfig.bucket).getPublicUrl(path);
  return data.publicUrl;
}

function setProductStatus(message: string, type: 'error' | 'success' | '' = '') {
  const status = document.querySelector<HTMLElement>('[data-product-status]');
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
}

function setCategoryStatus(message: string, type: 'error' | 'success' | '' = '') {
  const status = document.querySelector<HTMLElement>('[data-category-status]');
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
}

function setSubcategoryStatus(message: string, type: 'error' | 'success' | '' = '') {
  const status = document.querySelector<HTMLElement>('[data-subcategory-status]');
  if (!status) return;

  status.textContent = message;
  status.dataset.state = type;
}

function setProductFormMode(mode: FormMode) {
  const form = getProductForm();
  if (!form) return;

  const modeInput = form.querySelector<HTMLInputElement>('[data-product-mode]');
  const title = form.querySelector<HTMLElement>('[data-product-form-title]');
  const submit = form.querySelector<HTMLButtonElement>('[data-product-submit]');

  if (modeInput) modeInput.value = mode;
  if (title) title.textContent = mode === 'create' ? 'Formulario de producto' : 'Editar producto';
  if (submit) submit.textContent = mode === 'create' ? 'Guardar producto' : 'Actualizar producto';
}

function syncProductSubcategoryOptions() {
  const form = getProductForm();
  if (!form) return;

  const categorySelect = form.querySelector<HTMLSelectElement>('[data-product-category]');
  const subcategorySelect = form.querySelector<HTMLSelectElement>('[data-product-subcategory]');

  if (!subcategorySelect) return;

  const selectedCategory = categorySelect?.value || '';
  const currentSubcategory = subcategorySelect.value;

  Array.from(subcategorySelect.options).forEach((option) => {
    if (option.value === '') {
      option.hidden = false;
      option.disabled = false;
      return;
    }

    const matchesCategory = Boolean(selectedCategory) && option.dataset.categoryName === selectedCategory;
    option.hidden = !matchesCategory;
    option.disabled = !matchesCategory;
  });

  if (!selectedCategory) {
    subcategorySelect.value = '';
    return;
  }

  const selectedOption = Array.from(subcategorySelect.options).find((option) => option.value === currentSubcategory);
  if (!selectedOption || selectedOption.hidden) {
    subcategorySelect.value = '';
  }
}

function setCategoryFormMode(mode: FormMode) {
  const form = getCategoryForm();
  if (!form) return;

  const modeInput = form.querySelector<HTMLInputElement>('[data-category-mode]');
  const title = form.querySelector<HTMLElement>('[data-category-form-title]');
  const submit = form.querySelector<HTMLButtonElement>('[data-category-submit]');

  if (modeInput) modeInput.value = mode;
  if (title) title.textContent = mode === 'create' ? 'Añadir Categoría' : 'Editar Categoría';
  if (submit) submit.textContent = mode === 'create' ? 'Guardar Categoría' : 'Actualizar Categoría';
}

function setSubcategoryFormMode(mode: FormMode) {
  const form = getSubcategoryForm();
  if (!form) return;

  const modeInput = form.querySelector<HTMLInputElement>('[data-subcategory-mode]');
  const title = form.querySelector<HTMLElement>('[data-subcategory-form-title]');
  const submit = form.querySelector<HTMLButtonElement>('[data-subcategory-submit]');

  if (modeInput) modeInput.value = mode;
  if (title) title.textContent = mode === 'create' ? 'Añadir Subcategoría' : 'Editar Subcategoría';
  if (submit) submit.textContent = mode === 'create' ? 'Guardar Subcategoría' : 'Actualizar Subcategoría';
}

function clearProductForm() {
  const form = getProductForm();
  if (!form) return;

  form.reset();

  const idInput = form.querySelector<HTMLInputElement>('[data-product-id-input]');
  const subcategorySelect = form.querySelector<HTMLSelectElement>('[data-product-subcategory]');
  const existingImageUrl = form.querySelector<HTMLInputElement>('[data-product-existing-image-url]');
  const existingVideoUrl = form.querySelector<HTMLInputElement>('[data-product-existing-video-url]');
  const galleryUrls = getProductGalleryInput();
  const featuredValue = form.querySelector<HTMLInputElement>('[data-product-featured-value]');
  const mediaInput = form.querySelector<HTMLInputElement>('[data-product-media-files]');

  if (idInput) idInput.value = '';
  if (subcategorySelect) subcategorySelect.value = '';
  if (existingImageUrl) existingImageUrl.value = '';
  if (existingVideoUrl) existingVideoUrl.value = '';
  if (galleryUrls) galleryUrls.value = '[]';
  if (featuredValue) featuredValue.value = 'false';
  if (mediaInput) mediaInput.value = '';
  renderProductMediaPreviews([]);
  renderProductVideoPreview('');
  syncProductSubcategoryOptions();

  setProductFormMode('create');
  setProductStatus('', '');
}

function populateProductForm(trigger: HTMLElement) {
  const form = getProductForm();
  if (!form) return;

  const idInput = form.querySelector<HTMLInputElement>('[data-product-id-input]');
  const nameInput = form.querySelector<HTMLInputElement>('[data-product-name]');
  const priceInput = form.querySelector<HTMLInputElement>('[data-product-price]');
  const categorySelect = form.querySelector<HTMLSelectElement>('[data-product-category]');
  const subcategorySelect = form.querySelector<HTMLSelectElement>('[data-product-subcategory]');
  const descriptionInput = form.querySelector<HTMLTextAreaElement>('[data-product-description]');
  const featuredInput = form.querySelector<HTMLInputElement>('[data-product-featured]');
  const existingImageUrl = form.querySelector<HTMLInputElement>('[data-product-existing-image-url]');
  const existingVideoUrl = form.querySelector<HTMLInputElement>('[data-product-existing-video-url]');
  const galleryUrlsInput = getProductGalleryInput();
  const featuredValue = form.querySelector<HTMLInputElement>('[data-product-featured-value]');
  const mediaInput = form.querySelector<HTMLInputElement>('[data-product-media-files]');
  const existingGalleryUrls = parseGalleryUrls(trigger.dataset.productGalleryUrls || '');
  const galleryUrls = existingGalleryUrls.length > 0
    ? existingGalleryUrls
    : trigger.dataset.productImageUrl
      ? [trigger.dataset.productImageUrl]
      : [];

  if (idInput) idInput.value = trigger.dataset.productId || '';
  if (nameInput) nameInput.value = trigger.dataset.productName || '';
  if (priceInput) priceInput.value = trigger.dataset.productPrice || '';
  if (categorySelect) categorySelect.value = trigger.dataset.productCategory || '';
  if (descriptionInput) descriptionInput.value = trigger.dataset.productDescription || '';
  if (featuredInput) featuredInput.checked = trigger.dataset.productFeatured === 'true';
  if (existingImageUrl) existingImageUrl.value = galleryUrls[0] || trigger.dataset.productImageUrl || '';
  if (existingVideoUrl) existingVideoUrl.value = trigger.dataset.productVideoUrl || '';
  if (galleryUrlsInput) galleryUrlsInput.value = JSON.stringify(galleryUrls);
  if (featuredValue) featuredValue.value = trigger.dataset.productFeatured || 'false';
  if (mediaInput) mediaInput.value = '';
  renderProductMediaPreviews(galleryUrls);
  renderProductVideoPreview(trigger.dataset.productVideoUrl || '', galleryUrls[0] || trigger.dataset.productImageUrl || '');

  syncProductSubcategoryOptions();
  if (subcategorySelect) subcategorySelect.value = trigger.dataset.productSubcategoryId || '';

  setProductFormMode('edit');
  setProductStatus('', '');
}

function clearCategoryForm() {
  const form = getCategoryForm();
  if (!form) return;

  form.reset();

  const idInput = form.querySelector<HTMLInputElement>('[data-category-id-input]');
  const nameInput = form.querySelector<HTMLInputElement>('[data-category-name]');
  const orderInput = form.querySelector<HTMLInputElement>('[data-category-order]');
  const activeInput = form.querySelector<HTMLInputElement>('[data-category-is-active]');

  if (idInput) idInput.value = '';
  if (nameInput) nameInput.value = '';
  if (orderInput) orderInput.value = '0';
  if (activeInput) activeInput.checked = true;

  setCategoryFormMode('create');
  setCategoryStatus('', '');
}

function populateCategoryForm(trigger: HTMLElement) {
  const form = getCategoryForm();
  if (!form) return;

  const idInput = form.querySelector<HTMLInputElement>('[data-category-id-input]');
  const nameInput = form.querySelector<HTMLInputElement>('[data-category-name]');
  const orderInput = form.querySelector<HTMLInputElement>('[data-category-order]');
  const activeInput = form.querySelector<HTMLInputElement>('[data-category-is-active]');

  if (idInput) idInput.value = trigger.dataset.categoryId || '';
  if (nameInput) nameInput.value = trigger.dataset.categoryName || '';
  if (orderInput) orderInput.value = trigger.dataset.categoryOrder || '0';
  if (activeInput) activeInput.checked = trigger.dataset.categoryIsActive !== 'false';

  setCategoryFormMode('edit');
  setCategoryStatus('', '');
}

function clearSubcategoryForm() {
  const form = getSubcategoryForm();
  if (!form) return;

  form.reset();

  const idInput = form.querySelector<HTMLInputElement>('[data-subcategory-id-input]');
  const nameInput = form.querySelector<HTMLInputElement>('[data-subcategory-name]');
  const categoryInput = form.querySelector<HTMLSelectElement>('[data-subcategory-category-id]');
  const orderInput = form.querySelector<HTMLInputElement>('[data-subcategory-order]');
  const activeInput = form.querySelector<HTMLInputElement>('[data-subcategory-is-active]');

  if (idInput) idInput.value = '';
  if (nameInput) nameInput.value = '';
  if (categoryInput) categoryInput.value = '';
  if (orderInput) orderInput.value = '0';
  if (activeInput) activeInput.checked = true;

  setSubcategoryFormMode('create');
  setSubcategoryStatus('', '');
}

function populateSubcategoryForm(trigger: HTMLElement) {
  const form = getSubcategoryForm();
  if (!form) return;

  const idInput = form.querySelector<HTMLInputElement>('[data-subcategory-id-input]');
  const nameInput = form.querySelector<HTMLInputElement>('[data-subcategory-name]');
  const categoryInput = form.querySelector<HTMLSelectElement>('[data-subcategory-category-id]');
  const orderInput = form.querySelector<HTMLInputElement>('[data-subcategory-order]');
  const activeInput = form.querySelector<HTMLInputElement>('[data-subcategory-is-active]');

  if (idInput) idInput.value = trigger.dataset.subcategoryId || '';
  if (nameInput) nameInput.value = trigger.dataset.subcategoryName || '';
  if (categoryInput) categoryInput.value = trigger.dataset.subcategoryCategoryId || '';
  if (orderInput) orderInput.value = trigger.dataset.subcategoryOrder || '0';
  if (activeInput) activeInput.checked = trigger.dataset.subcategoryIsActive !== 'false';

  setSubcategoryFormMode('edit');
  setSubcategoryStatus('', '');
}

function readCategoryForm() {
  const form = getCategoryForm();
  if (!form) throw new Error('No se encontró el formulario de categorías.');

  const id = form.querySelector<HTMLInputElement>('[data-category-id-input]')?.value.trim() || '';
  const name = form.querySelector<HTMLInputElement>('[data-category-name]')?.value.trim() || '';
  const order = Number(form.querySelector<HTMLInputElement>('[data-category-order]')?.value || 0);
  const isActive = Boolean(form.querySelector<HTMLInputElement>('[data-category-is-active]')?.checked);

  if (!name) throw new Error('Escribe un nombre para la categoría.');

  return { id, input: { name, order, isActive } };
}

function readSubcategoryForm() {
  const form = getSubcategoryForm();
  if (!form) throw new Error('No se encontró el formulario de subcategorías.');

  const id = form.querySelector<HTMLInputElement>('[data-subcategory-id-input]')?.value.trim() || '';
  const name = form.querySelector<HTMLInputElement>('[data-subcategory-name]')?.value.trim() || '';
  const categoryId = form.querySelector<HTMLSelectElement>('[data-subcategory-category-id]')?.value || '';
  const categorySelect = form.querySelector<HTMLSelectElement>('[data-subcategory-category-id]');
  const category = categorySelect?.selectedOptions[0]?.textContent?.trim() || '';
  const order = Number(form.querySelector<HTMLInputElement>('[data-subcategory-order]')?.value || 0);
  const isActive = Boolean(form.querySelector<HTMLInputElement>('[data-subcategory-is-active]')?.checked);

  if (!name || !categoryId || !category) {
    throw new Error('Completa nombre y categoría para continuar.');
  }

  return { id, input: { name, categoryId, category, order, isActive } };
}

function setProductFormBusy(isBusy: boolean) {
  const form = getProductForm();
  if (!form) return;

  const submit = form.querySelector<HTMLButtonElement>('[data-product-submit]');
  if (!submit) return;

  submit.disabled = isBusy;
  submit.textContent = isBusy
    ? 'Guardando...'
    : form.querySelector<HTMLInputElement>('[data-product-mode]')?.value === 'edit'
      ? 'Actualizar producto'
      : 'Guardar producto';
}

function setCategoryFormBusy(isBusy: boolean) {
  const form = getCategoryForm();
  if (!form) return;

  const submit = form.querySelector<HTMLButtonElement>('[data-category-submit]');
  if (!submit) return;

  submit.disabled = isBusy;
  submit.textContent = isBusy
    ? 'Guardando...'
    : form.querySelector<HTMLInputElement>('[data-category-mode]')?.value === 'edit'
      ? 'Actualizar Categoría'
      : 'Guardar Categoría';
}

function setSubcategoryFormBusy(isBusy: boolean) {
  const form = getSubcategoryForm();
  if (!form) return;

  const submit = form.querySelector<HTMLButtonElement>('[data-subcategory-submit]');
  if (!submit) return;

  submit.disabled = isBusy;
  submit.textContent = isBusy
    ? 'Guardando...'
    : form.querySelector<HTMLInputElement>('[data-subcategory-mode]')?.value === 'edit'
      ? 'Actualizar Subcategoría'
      : 'Guardar Subcategoría';
}

function bindModalTriggers() {
  document.querySelectorAll<HTMLElement>('[data-admin-modal]').forEach((trigger) => {
    if (trigger.dataset.adminBound === 'true') return;
    trigger.dataset.adminBound = 'true';

    trigger.addEventListener('click', (event) => {
      const target = trigger.dataset.adminModal;
      if (!target) return;

      event.preventDefault();

      if (target === 'productModal') {
        if (trigger.dataset.adminProductMode === 'edit') {
          populateProductForm(trigger);
        } else {
          clearProductForm();
        }
      } else if (target === 'categoryModal') {
        if (trigger.dataset.adminCategoryMode === 'edit') {
          populateCategoryForm(trigger);
        } else {
          clearCategoryForm();
        }
      } else if (target === 'subcategoryModal') {
        if (trigger.dataset.adminSubcategoryMode === 'edit') {
          populateSubcategoryForm(trigger);
        } else {
          clearSubcategoryForm();
        }
      }

      openModal(target);
    });
  });

  document.querySelectorAll('[data-admin-modal-close]').forEach((trigger) => {
    trigger.addEventListener('click', (event) => {
      event.preventDefault();
      closeModals();
    });
  });

  document.querySelectorAll('[data-admin-overlay]').forEach((overlay) => {
    overlay.addEventListener('click', (event) => {
      if (event.target === event.currentTarget) closeModals();
    });
  });

  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closeModals();
  });
}

function bindProductSearch() {
  const search = document.getElementById('adminProductSearch') as HTMLInputElement | null;
  if (!search) return;

  search.addEventListener('input', () => {
    const query = search.value.trim().toLowerCase();
    const rows = Array.from(document.querySelectorAll<HTMLElement>('[data-admin-product-row]'));
    const total = rows.length;
    let visible = 0;

    rows.forEach((row) => {
      const matches = row.dataset.search?.toLowerCase().includes(query) ?? false;
      row.hidden = Boolean(query) && !matches;
      if (!row.hidden) visible += 1;
    });

    const count = document.getElementById('adminCount');
    if (count) count.textContent = `${visible} de ${total} productos`;
  });
}

function readProductForm(): {
  id: string;
  input: ProductInput;
  mediaFiles: File[];
  existingImageUrl: string;
  existingVideoUrl: string;
  galleryUrls: string[];
} {
  const form = getProductForm();
  if (!form) {
    throw new Error('No se encontró el formulario de producto.');
  }

  const idInput = form.querySelector<HTMLInputElement>('[data-product-id-input]');
  const nameInput = form.querySelector<HTMLInputElement>('[data-product-name]');
  const priceInput = form.querySelector<HTMLInputElement>('[data-product-price]');
  const categorySelect = form.querySelector<HTMLSelectElement>('[data-product-category]');
  const subcategorySelect = form.querySelector<HTMLSelectElement>('[data-product-subcategory]');
  const descriptionInput = form.querySelector<HTMLTextAreaElement>('[data-product-description]');
  const featuredValue = form.querySelector<HTMLInputElement>('[data-product-featured-value]');
  const mediaInput = form.querySelector<HTMLInputElement>('[data-product-media-files]');
  const existingImageUrlInput = form.querySelector<HTMLInputElement>('[data-product-existing-image-url]');
  const existingVideoUrlInput = form.querySelector<HTMLInputElement>('[data-product-existing-video-url]');
  const galleryUrlsInput = getProductGalleryInput();

  const name = nameInput?.value.trim() || '';
  const price = Number(priceInput?.value || 0);
  const category = categorySelect?.value || '';
  const subcategoryId = subcategorySelect?.value || null;
  const description = descriptionInput?.value.trim() || '';
  const featured = featuredValue?.value === 'true';
  const mediaFiles = Array.from(mediaInput?.files || []);
  const existingImageUrl = existingImageUrlInput?.value.trim() || '';
  const existingVideoUrl = existingVideoUrlInput?.value.trim() || '';
  const galleryUrls = parseGalleryUrls(galleryUrlsInput?.value || '');

  if (!name || !category || !description || Number.isNaN(price)) {
    throw new Error('Completa nombre, categoría, precio y descripción antes de guardar.');
  }

  const hasImage = mediaFiles.some((file) => file.type.startsWith('image/'));
  if (!hasImage && galleryUrls.length === 0 && !existingImageUrl) {
    throw new Error('Selecciona una imagen para el producto.');
  }

  return {
    id: idInput?.value.trim() || '',
    input: {
      name,
      category,
      subcategoryId,
      description,
      price,
      imageUrl: existingImageUrl,
      galleryUrls,
      featured,
      videoUrl: existingVideoUrl || null
    },
    mediaFiles,
    existingImageUrl,
    existingVideoUrl,
    galleryUrls
  };
}

function bindForms() {
  const productForm = getProductForm();
  const categoryForm = getCategoryForm();
  const subcategoryForm = getSubcategoryForm();

  productForm?.querySelector<HTMLSelectElement>('[data-product-category]')?.addEventListener('change', () => {
    syncProductSubcategoryOptions();
  });

  productForm?.querySelector<HTMLInputElement>('[data-product-media-files]')?.addEventListener('change', () => {
    const mediaInput = getProductForm()?.querySelector<HTMLInputElement>('[data-product-media-files]');
    const files = Array.from(mediaInput?.files || []);
    const videoFile = files.find((file) => file.type.startsWith('video/')) || null;
    const existingImageUrl = getProductForm()?.querySelector<HTMLInputElement>('[data-product-existing-image-url]')?.value.trim() || '';
    const galleryInput = getProductGalleryInput();
    const galleryUrls = parseGalleryUrls(galleryInput?.value || '');
    setProductVideoPreviewFromFile(videoFile, galleryUrls[0] || existingImageUrl);
  });

  productForm?.querySelector<HTMLElement>('[data-product-media-preview-list]')?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement | null;
    const removeButton = target?.closest('[data-product-media-remove]') as HTMLButtonElement | null;
    if (!removeButton) return;

    const item = removeButton.closest<HTMLElement>('[data-product-media-item]');
    const mediaUrl = item?.dataset.mediaUrl || '';
    if (!mediaUrl) return;

    const galleryInput = getProductGalleryInput();
    const currentUrls = parseGalleryUrls(galleryInput?.value || '');
    renderProductMediaPreviews(currentUrls.filter((url) => url !== mediaUrl));
  });

  productForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const { id, input, mediaFiles, existingImageUrl, existingVideoUrl, galleryUrls } = readProductForm();
      const mode = productForm.querySelector<HTMLInputElement>('[data-product-mode]')?.value || 'create';
      const imageFiles = mediaFiles.filter((file) => file.type.startsWith('image/'));
      const videoFile = mediaFiles.find((file) => file.type.startsWith('video/')) || null;
      const uploadedImageUrls = imageFiles.length > 0
        ? await Promise.all(imageFiles.map((file) => uploadProductFile(file, 'image')))
        : [];
      const imageUrls = normalizeGalleryUrls([
        ...galleryUrls,
        ...uploadedImageUrls,
        ...(!galleryUrls.length && existingImageUrl ? [existingImageUrl] : [])
      ]);
      const imageUrl = imageUrls[0] || existingImageUrl || '';
      const videoUrl = videoFile ? await uploadProductFile(videoFile, 'video') : existingVideoUrl || null;

      const payload: ProductInput = {
        ...input,
        imageUrl,
        videoUrl,
        galleryUrls: imageUrls
      };

      setProductFormBusy(true);
      setProductStatus('Guardando producto...', '');

      if (mode === 'edit') {
        if (!id) {
          throw new Error('No se encontró el producto a editar.');
        }

        await updateProduct(id, payload);
      } else {
        await createProduct(payload);
      }

      setProductStatus('Producto guardado correctamente.', 'success');
      window.setTimeout(async () => {
        try {
          await refreshProductTable();
          closeModals();
        } catch {
          window.location.reload();
        }
      }, 350);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar el producto.';
      setProductStatus(message, 'error');
      setProductFormBusy(false);
    }
  });

  document.querySelectorAll<HTMLFormElement>('.admin-modal form, form.admin-modal__dialog').forEach((form) => {
    if (form.hasAttribute('data-product-form')) return;
    if (form.hasAttribute('data-category-form')) return;
    if (form.hasAttribute('data-subcategory-form')) return;

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      closeModals();
    });
  });

  categoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const { id, input } = readCategoryForm();

      setCategoryFormBusy(true);
      setCategoryStatus('Guardando categoría...', '');

      if (id) {
        await updateCategory(id, input);
      } else {
        await createCategory(input);
      }

      setCategoryStatus('Categoría guardada correctamente.', 'success');
      window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la categoría.';
      setCategoryStatus(message, 'error');
      setCategoryFormBusy(false);
    }
  });

  subcategoryForm?.addEventListener('submit', async (event) => {
    event.preventDefault();

    try {
      const { id, input } = readSubcategoryForm();

      setSubcategoryFormBusy(true);
      setSubcategoryStatus('Guardando subcategoría...', '');

      if (id) {
        await updateSubcategory(id, input);
      } else {
        await createSubcategory(input);
      }

      setSubcategoryStatus('Subcategoría guardada correctamente.', 'success');
      window.setTimeout(() => window.location.reload(), 300);
    } catch (error) {
      const message = error instanceof Error ? error.message : 'No se pudo guardar la subcategoría.';
      setSubcategoryStatus(message, 'error');
      setSubcategoryFormBusy(false);
    }
  });
}

function bindProductDelete() {
  document.querySelectorAll<HTMLButtonElement>('[data-admin-product-delete]').forEach((button) => {
    if (button.dataset.adminDeleteBound === 'true') return;
    button.dataset.adminDeleteBound = 'true';

    button.addEventListener('click', async () => {
      const id = button.dataset.productId;
      const name = button.dataset.productName || 'este producto';

      if (!id) return;

      if (!window.confirm(`¿Eliminar ${name}?`)) return;

      button.disabled = true;

      try {
        await deleteProduct(id);
        await refreshProductTable();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo eliminar el producto.';
        button.disabled = false;
        window.alert(message);
      }
    });
  });
}

function escapeHtml(value: string) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function renderProductRows(products: Awaited<ReturnType<typeof getProducts>>) {
  return products
    .map(
      (product) => `
      <tr data-admin-product-row data-search="${escapeHtml(`${product.name} ${product.category} ${product.subcategory} ${product.description}`)}">
        <td><img class="admin-thumb" src="${escapeHtml(product.imageUrl)}" alt="${escapeHtml(product.name)}" loading="lazy"></td>
        <td>
          <strong>${escapeHtml(product.name)}</strong>
          <span>${escapeHtml(product.description.split('.')[0])}</span>
        </td>
        <td>${escapeHtml(product.category)}</td>
        <td>${escapeHtml(product.subcategory)}</td>
        <td>C$${Number(product.price || 0).toFixed(2)}</td>
        <td>
          <span class="admin-actions">
            <button
              class="admin-small-button"
              type="button"
              data-admin-modal="productModal"
              data-admin-product-mode="edit"
              data-product-id="${escapeHtml(product.id)}"
              data-product-name="${escapeHtml(product.name)}"
              data-product-category="${escapeHtml(product.category)}"
              data-product-subcategory-id="${escapeHtml(product.subcategoryId || '')}"
              data-product-description="${escapeHtml(product.description)}"
              data-product-price="${String(product.price)}"
              data-product-image-url="${escapeHtml(product.imageUrl)}"
              data-product-gallery-urls='${escapeHtml(JSON.stringify(product.galleryUrls))}'
              data-product-featured="${String(product.featured)}"
              data-product-video-url="${escapeHtml(product.videoUrl || '')}"
            >
              Editar
            </button>
            <button
              class="admin-small-button admin-small-button--danger"
              type="button"
              data-admin-product-delete
              data-product-id="${escapeHtml(product.id)}"
              data-product-name="${escapeHtml(product.name)}"
            >
              Eliminar
            </button>
          </span>
        </td>
      </tr>`
    )
    .join('');
}

async function refreshProductTable() {
  const tableBody = document.querySelector<HTMLTableSectionElement>('section[aria-labelledby="products-title"] .admin-table tbody');
  if (!tableBody) return;

  const products = await getProducts();
  tableBody.innerHTML = renderProductRows(products);

  const count = document.getElementById('adminCount');
  if (count) count.textContent = `${products.length} productos`;

  bindModalTriggers();
  bindProductDelete();
}

function bindCategoryDelete() {
  document.querySelectorAll<HTMLButtonElement>('[data-admin-category-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.categoryId;
      const name = button.dataset.categoryName || 'esta categoría';

      if (!id) return;

      if (!window.confirm(`¿Eliminar ${name}?`)) return;

      button.disabled = true;

      try {
        await deleteCategory(id);
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo eliminar la categoría.';
        button.disabled = false;
        window.alert(message);
      }
    });
  });
}

function bindSubcategoryDelete() {
  document.querySelectorAll<HTMLButtonElement>('[data-admin-subcategory-delete]').forEach((button) => {
    button.addEventListener('click', async () => {
      const id = button.dataset.subcategoryId;
      const name = button.dataset.subcategoryName || 'esta subcategoría';

      if (!id) return;

      if (!window.confirm(`¿Eliminar ${name}?`)) return;

      button.disabled = true;

      try {
        await deleteSubcategory(id);
        window.location.reload();
      } catch (error) {
        const message = error instanceof Error ? error.message : 'No se pudo eliminar la subcategoría.';
        button.disabled = false;
        window.alert(message);
      }
    });
  });
}

function bindLogout() {
  const logoutButton = document.querySelector<HTMLButtonElement>('[data-admin-logout]');

  logoutButton?.addEventListener('click', async () => {
    logoutButton.disabled = true;

    const { error } = await supabase.auth.signOut();

    if (error) {
      logoutButton.disabled = false;
      console.error('No se pudo cerrar la sesión:', error.message);
      return;
    }

    window.location.replace('/');
  });
}

async function ensureAdminSession() {
  const { data } = await supabase.auth.getSession();

  if (!data.session) {
    window.location.replace('/login');
    return false;
  }

  return true;
}

export async function initAdmin() {
  const hasSession = await ensureAdminSession();
  if (!hasSession) return;

  bindModalTriggers();
  bindProductSearch();
  bindForms();
  bindProductDelete();
  bindCategoryDelete();
  bindSubcategoryDelete();
  bindLogout();

  await refreshProductTable();
}