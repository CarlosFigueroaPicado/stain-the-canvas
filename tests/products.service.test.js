import { beforeEach, describe, expect, it, vi } from "vitest";

const productsApiMock = vi.hoisted(() => ({
  fetchProducts: vi.fn(),
  insertProduct: vi.fn(),
  updateProduct: vi.fn(),
  deleteProduct: vi.fn(),
  uploadImage: vi.fn(),
  getPublicUrl: vi.fn(),
  removeStorage: vi.fn(),
  countImageRefByMain: vi.fn(),
  countImageRefByGallery: vi.fn()
}));

vi.mock("../js/modules/products/api.js", () => productsApiMock);
vi.mock("../js/core/config.js", async () => {
  const actual = await vi.importActual("../js/core/config.js");
  return {
    ...actual,
    getAppConfigSync() {
      return {
        url: "https://example.supabase.co",
        anonKey: "public-anon-key",
        bucket: "productos",
        productsTable: "productos",
        whatsappNumber: "50589187562"
      };
    }
  };
});

import { getState, resetProductsState } from "../js/core/store.js";
import { createProduct, getFeaturedProducts, getProducts } from "../js/modules/products/service.js";

describe("products.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProductsState();
  });

  it("rechaza producto inválido sin llamar al API", async () => {
    const result = await createProduct({
      nombre: "ab",
      categoria: "Bisutería",
      descripcion: "Descripción válida del producto",
      precio: 100
    });

    expect(result.success).toBe(false);
    expect(productsApiMock.insertProduct).not.toHaveBeenCalled();
  });

  it("permite reintentar carga después de un fallo inicial", async () => {
    productsApiMock.fetchProducts
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
      .mockResolvedValueOnce({
        data: [
          {
            id: "prod-1",
            nombre: "Pulsera artesanal",
            categoria: "Bisutería",
            descripcion: "Pulsera artesanal hecha a mano para eventos.",
            precio: 120,
            imagen_url: "https://example.com/pulsera.jpg",
            gallery_urls: ["https://example.com/pulsera.jpg"],
            featured: false
          }
        ],
        error: null
      });

    const first = await getProducts();
    const second = await getProducts();

    expect(first.success).toBe(false);
    expect(second.success).toBe(true);
    expect(second.data).toHaveLength(1);
    expect(productsApiMock.fetchProducts).toHaveBeenCalledTimes(2);
    expect(getState().productsLoaded).toBe(true);
  });

  it("devuelve productos destacados desde base de datos", async () => {
    productsApiMock.fetchProducts.mockResolvedValue({
      data: [
        {
          id: "prod-1",
          nombre: "Collar floral",
          categoria: "Bisutería",
          descripcion: "Collar floral artesanal con acabado fino.",
          precio: 200,
          imagen_url: "https://example.com/collar.jpg",
          gallery_urls: ["https://example.com/collar.jpg"],
          featured: true
        },
        {
          id: "prod-2",
          nombre: "Caja decorativa",
          categoria: "Decoraciones",
          descripcion: "Caja decorativa hecha a mano para regalo.",
          precio: 300,
          imagen_url: "https://example.com/caja.jpg",
          gallery_urls: ["https://example.com/caja.jpg"],
          featured: false
        }
      ],
      error: null
    });

    const result = await getFeaturedProducts({ force: true, limit: 3 });

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(1);
    expect(result.data[0]).toEqual(expect.objectContaining({ id: "prod-1", featured: true }));
  });

  it("crea producto válido y normaliza featured antes de guardar", async () => {
    productsApiMock.insertProduct.mockResolvedValue({ data: null, error: null });
    productsApiMock.fetchProducts.mockResolvedValue({
      data: [
        {
          id: "prod-3",
          nombre: "Producto Mock",
          categoria: "Pinatas",
          descripcion: "Producto de prueba con datos completos y válidos.",
          precio: 200,
          imagen_url: "https://example.com/mock.jpg",
          gallery_urls: ["https://example.com/mock.jpg"],
          featured: true
        }
      ],
      error: null
    });

    const result = await createProduct({
      nombre: "Producto Mock",
      categoria: "Piñatas",
      descripcion: "Producto de prueba con datos completos y válidos.",
      precio: 200,
      imagenUrl: "https://example.com/mock.jpg",
      featured: "true"
    });

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(productsApiMock.insertProduct).toHaveBeenCalledWith({
      nombre: "Producto Mock",
      categoria: "Manualidades y Arreglos",
      subcategory_id: null,
      descripcion: "Producto de prueba con datos completos y válidos.",
      precio: 200,
      imagen_url: "https://example.com/mock.jpg",
      gallery_urls: ["https://example.com/mock.jpg"],
      featured: true
    });
  });
});
