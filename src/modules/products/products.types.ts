export interface Product {
  id: string;
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number;
  imagenUrl: string;
  galleryUrls: string[];
  createdAt?: string;
}

export interface ProductInput {
  nombre: string;
  categoria: string;
  descripcion: string;
  precio: number | string;
  imagenUrl?: string;
  galleryUrls?: string[];
}
