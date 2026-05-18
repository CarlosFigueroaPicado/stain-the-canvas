import { supabase, supabaseConfig } from './supabase';

export type Product = {
  id: string;
  name: string;
  category: string;
  subcategory: string;
  subcategoryId?: string | null;
  description: string;
  price: number;
  imageUrl: string;
  galleryUrls: string[];
  featured: boolean;
  videoUrl?: string | null;
};

export type Category = {
  id: string;
  name: string;
  order: number;
};

export type CategoryInput = {
  name: string;
  order: number;
  isActive: boolean;
};

export type Subcategory = {
  id: string;
  name: string;
  category: string;
  categoryId: string | null;
  order: number;
};

export type SubcategoryInput = {
  name: string;
  categoryId: string;
  category: string;
  order: number;
  isActive: boolean;
};

type ProductRow = {
  id: string;
  nombre?: string | null;
  categoria?: string | null;
  subcategory_id?: string | null;
  descripcion?: string | null;
  precio?: number | string | null;
  imagen_url?: string | null;
  gallery_urls?: string[] | string | null;
  featured?: boolean | null;
  video_url?: string | null;
  subcategorias?: { nombre?: string | null } | null;
};

function parseGalleryUrls(value: ProductRow['gallery_urls']): string[] {
  if (Array.isArray(value)) {
    return value.filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter(Boolean) : [];
    } catch {
      return [];
    }
  }

  return [];
}

function normalizeProduct(row: ProductRow): Product {
  const galleryUrls = parseGalleryUrls(row.gallery_urls);
  const imageUrl = row.imagen_url || galleryUrls[0] || '';

  return {
    id: row.id,
    name: row.nombre || 'Producto sin nombre',
    category: row.categoria || 'Sin categoría',
    subcategory: row.subcategorias?.nombre || '',
    subcategoryId: row.subcategory_id || null,
    description: row.descripcion || '',
    price: Number(row.precio || 0),
    imageUrl,
    galleryUrls: galleryUrls.length > 0 ? galleryUrls : imageUrl ? [imageUrl] : [],
    featured: Boolean(row.featured),
    videoUrl: row.video_url || null
  };
}

export async function getProducts(): Promise<Product[]> {
  const { data, error } = await supabase
    .from(supabaseConfig.productsTable)
    .select('id,nombre,categoria,subcategory_id,descripcion,precio,imagen_url,gallery_urls,featured,video_url,subcategorias(nombre)')
    .order('featured', { ascending: false })
    .order('created_at', { ascending: false });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => normalizeProduct(row as ProductRow));
}

export type ProductInput = {
  name: string;
  category: string;
  subcategoryId: string | null;
  description: string;
  price: number;
  imageUrl: string;
  galleryUrls: string[];
  featured: boolean;
  videoUrl: string | null;
};

function normalizeGalleryUrls(value: string[]): string[] {
  return Array.from(new Set(value.map((item) => String(item).trim()).filter(Boolean)));
}

function normalizeProductPayload(input: ProductInput) {
  const imageUrl = input.imageUrl.trim();
  const galleryUrls = normalizeGalleryUrls(input.galleryUrls.length > 0 ? input.galleryUrls : imageUrl ? [imageUrl] : []);

  return {
    nombre: input.name.trim(),
    categoria: input.category.trim(),
    subcategory_id: input.subcategoryId || null,
    descripcion: input.description.trim(),
    precio: Number(input.price || 0),
    imagen_url: imageUrl || null,
    gallery_urls: galleryUrls,
    featured: Boolean(input.featured),
    video_url: input.videoUrl?.trim() || null
  };
}

export async function createProduct(input: ProductInput) {
  const { data, error } = await supabase
    .from(supabaseConfig.productsTable)
    .insert(normalizeProductPayload(input))
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function updateProduct(id: string, input: ProductInput) {
  const { data, error } = await supabase
    .from(supabaseConfig.productsTable)
    .update(normalizeProductPayload(input))
    .eq('id', id)
    .select('id')
    .single();

  if (error) {
    throw new Error(error.message);
  }

  return data;
}

export async function deleteProduct(id: string) {
  const { error } = await supabase
    .from(supabaseConfig.productsTable)
    .delete()
    .eq('id', id);

  if (error) {
    throw new Error(error.message);
  }
}

export async function getCategories(): Promise<Category[]> {
  const { data, error } = await supabase
    .from('categorias')
    .select('id,nombre,orden')
    .eq('is_active', true)
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.nombre,
    order: row.orden || 0
  }));
}

function normalizeCategoryPayload(input: CategoryInput) {
  return {
    nombre: input.name.trim(),
    orden: Number(input.order || 0),
    is_active: Boolean(input.isActive)
  };
}

export async function createCategory(input: CategoryInput) {
  const { data, error } = await supabase
    .from('categorias')
    .insert(normalizeCategoryPayload(input))
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function updateCategory(id: string, input: CategoryInput) {
  const { data, error } = await supabase
    .from('categorias')
    .update(normalizeCategoryPayload(input))
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function deleteCategory(id: string) {
  const { error } = await supabase.from('categorias').delete().eq('id', id);
  if (error) throw new Error(error.message);
}

export async function getSubcategories(): Promise<Subcategory[]> {
  const { data, error } = await supabase
    .from('subcategorias')
    .select('id,nombre,categoria,categoria_id,orden')
    .eq('is_active', true)
    .order('categoria', { ascending: true })
    .order('orden', { ascending: true })
    .order('nombre', { ascending: true });

  if (error) {
    throw new Error(error.message);
  }

  return (data || []).map((row) => ({
    id: row.id,
    name: row.nombre,
    category: row.categoria,
    categoryId: row.categoria_id,
    order: row.orden || 0
  }));
}

function normalizeSubcategoryPayload(input: SubcategoryInput) {
  return {
    nombre: input.name.trim(),
    categoria: input.category.trim(),
    categoria_id: input.categoryId,
    orden: Number(input.order || 0),
    is_active: Boolean(input.isActive)
  };
}

export async function createSubcategory(input: SubcategoryInput) {
  const { data, error } = await supabase
    .from('subcategorias')
    .insert(normalizeSubcategoryPayload(input))
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function updateSubcategory(id: string, input: SubcategoryInput) {
  const { data, error } = await supabase
    .from('subcategorias')
    .update(normalizeSubcategoryPayload(input))
    .eq('id', id)
    .select('id')
    .single();

  if (error) throw new Error(error.message);

  return data;
}

export async function deleteSubcategory(id: string) {
  const { error } = await supabase.from('subcategorias').delete().eq('id', id);
  if (error) throw new Error(error.message);
}
