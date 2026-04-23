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
import {
  createProduct,
  deleteProduct,
  getFeaturedProducts,
  getProducts,
  updateProduct,
  uploadFiles
} from "../js/modules/products/service.js";

describe("products.service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resetProductsState();
  });

  it("rechaza producto invalido sin llamar al API", async () => {
    const result = await createProduct({
      nombre: "ab",
      categoria: "Bisuteria",
      descripcion: "Descripcion valida del producto",
      precio: 100
    });

    expect(result.success).toBe(false);
    expect(productsApiMock.insertProduct).not.toHaveBeenCalled();
  });

  it("permite reintentar carga despues de un fallo inicial", async () => {
    productsApiMock.fetchProducts
      .mockResolvedValueOnce({ data: null, error: { message: "boom" } })
      .mockResolvedValueOnce({
        data: [
          {
            id: "prod-1",
            nombre: "Pulsera artesanal",
            categoria: "Bisuteria",
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
          categoria: "Bisuteria",
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

  it("crea producto valido y normaliza featured antes de guardar", async () => {
    productsApiMock.insertProduct.mockResolvedValue({ data: null, error: null });
    productsApiMock.fetchProducts.mockResolvedValue({
      data: [
        {
          id: "prod-3",
          nombre: "Producto Mock",
          categoria: "Pinatas",
          descripcion: "Producto de prueba con datos completos y validos.",
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
      descripcion: "Producto de prueba con datos completos y validos.",
      precio: 200,
      imagenUrl: "https://example.com/mock.jpg",
      featured: "true"
    });

    expect(result).toEqual(expect.objectContaining({ success: true }));
    expect(productsApiMock.insertProduct).toHaveBeenCalledWith({
      nombre: "Producto Mock",
      categoria: "Pinatas",
      descripcion: "Producto de prueba con datos completos y validos.",
      precio: 200,
      imagen_url: "https://example.com/mock.jpg",
      gallery_urls: ["https://example.com/mock.jpg"],
      featured: true
    });
  });

  it("sube imagenes y devuelve URLs publicas", async () => {
    productsApiMock.uploadImage.mockResolvedValue({ error: null });
    productsApiMock.getPublicUrl
      .mockResolvedValueOnce("https://example.com/catalogo/a.jpg")
      .mockResolvedValueOnce("https://example.com/catalogo/b.png");

    const result = await uploadFiles(
      [
        { name: "a.jpg" },
        { name: "b.png" }
      ],
      "Producto Test"
    );

    expect(result.success).toBe(true);
    expect(result.data).toHaveLength(2);
    expect(productsApiMock.uploadImage).toHaveBeenCalledTimes(2);
    expect(productsApiMock.getPublicUrl).toHaveBeenCalledTimes(2);
  });

  it("falla al subir imagen si API responde con error", async () => {
    productsApiMock.uploadImage.mockResolvedValue({
      error: { message: "upload_error" }
    });

    const result = await uploadFiles([{ name: "a.jpg" }], "Producto Test");

    expect(result.success).toBe(false);
    expect(result.error).toContain("upload_error");
  });

  it("falla al actualizar producto cuando API devuelve error", async () => {
    productsApiMock.updateProduct.mockResolvedValue({ error: { message: "update_error" } });

    const result = await updateProduct("prod-1", {
      nombre: "Producto Mock",
      categoria: "Bisuteria",
      descripcion: "Producto de prueba con datos completos y validos.",
      precio: 200,
      imagenUrl: "https://example.com/mock.jpg",
      featured: true
    });

    expect(result.success).toBe(false);
    expect(result.error).toContain("update_error");
  });

  it("elimina producto y limpia solo imagenes no referenciadas", async () => {
    productsApiMock.deleteProduct.mockResolvedValue({ error: null });
    productsApiMock.countImageRefByMain
      .mockResolvedValueOnce({ count: 1, error: null })
      .mockResolvedValueOnce({ count: 0, error: null });
    productsApiMock.countImageRefByGallery
      .mockResolvedValueOnce({ count: 0, error: null })
      .mockResolvedValueOnce({ count: 0, error: null });
    productsApiMock.removeStorage.mockResolvedValue({ error: null });
    productsApiMock.fetchProducts.mockResolvedValue({ data: [], error: null });

    const result = await deleteProduct("prod-1", {
      id: "prod-1",
      imagenUrl: "https://example.supabase.co/storage/v1/object/public/productos/catalogo/main.jpg",
      galleryUrls: ["https://example.supabase.co/storage/v1/object/public/productos/catalogo/extra.jpg"]
    });

    expect(result.success).toBe(true);
    expect(result.data).toEqual({ skipped: 1, cleanupError: false });
    expect(productsApiMock.removeStorage).toHaveBeenCalledWith(["catalogo/extra.jpg"]);
  });

  it("falla al eliminar producto si API retorna error", async () => {
    productsApiMock.deleteProduct.mockResolvedValue({ error: { message: "delete_error" } });

    const result = await deleteProduct("prod-1", { id: "prod-1" });

    expect(result.success).toBe(false);
    expect(result.error).toContain("delete_error");
  });
});
