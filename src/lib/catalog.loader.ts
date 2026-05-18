import { getCategories, getProducts, getSubcategories } from './catalog.repository';
import { fallbackCategories, fallbackProducts, fallbackSubcategories } from '../data/fallbackCatalog';

async function loadWithFallback<T>(loader: () => Promise<T[]>, fallback: T[]): Promise<T[]> {
  try {
    const items = await loader();
    return items.length > 0 ? items : fallback;
  } catch {
    return fallback;
  }
}

export async function loadCatalogData() {
  const [products, categories, subcategories] = await Promise.all([
    loadWithFallback(getProducts, fallbackProducts),
    loadWithFallback(getCategories, fallbackCategories),
    loadWithFallback(getSubcategories, fallbackSubcategories)
  ]);

  return {
    products,
    categories,
    subcategories
  };
}