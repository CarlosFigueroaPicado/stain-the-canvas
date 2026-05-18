import type { Category, Product, Subcategory } from '../lib/catalog.repository';

export const fallbackCategories: Category[] = [
  { id: 'bisuteria', name: 'Bisutería', order: 1 },
  { id: 'accesorios', name: 'Accesorios', order: 2 },
  { id: 'manualidades', name: 'Manualidades y Arreglos', order: 3 },
  { id: 'decoraciones', name: 'Decoraciones', order: 4 }
];

export const fallbackSubcategories: Subcategory[] = [
  { id: 'collares', name: 'Collares', category: 'Bisutería', categoryId: 'bisuteria', order: 1 },
  { id: 'pulseras', name: 'Pulseras', category: 'Bisutería', categoryId: 'bisuteria', order: 2 },
  { id: 'anillos', name: 'Anillos', category: 'Bisutería', categoryId: 'bisuteria', order: 3 },
  { id: 'aretes', name: 'Aretes', category: 'Bisutería', categoryId: 'bisuteria', order: 4 },
  { id: 'gargantillas', name: 'Gargantillas', category: 'Bisutería', categoryId: 'bisuteria', order: 5 },
  { id: 'sets-bisuteria', name: 'Sets de bisutería', category: 'Bisutería', categoryId: 'bisuteria', order: 6 },
  { id: 'rosarios', name: 'Rosarios', category: 'Bisutería', categoryId: 'bisuteria', order: 7 },
  { id: 'llaveros', name: 'Llaveros', category: 'Accesorios', categoryId: 'accesorios', order: 1 },
  { id: 'porta-lentes', name: 'Porta lentes', category: 'Accesorios', categoryId: 'accesorios', order: 2 },
  { id: 'porta-mascarillas', name: 'Porta mascarillas', category: 'Accesorios', categoryId: 'accesorios', order: 3 },
  { id: 'colgantes-celular', name: 'Colgantes de celular', category: 'Accesorios', categoryId: 'accesorios', order: 4 },
  { id: 'mascotas', name: 'Accesorios para mascotas', category: 'Accesorios', categoryId: 'accesorios', order: 5 },
  { id: 'cajas', name: 'Cajas decoradas', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 1 },
  { id: 'ramos', name: 'Ramos', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 2 },
  { id: 'flores', name: 'Flores', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 3 },
  { id: 'detalles', name: 'Detalles personalizados', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 4 },
  { id: 'tarjetas', name: 'Tarjetas personalizadas', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 5 },
  { id: 'murales', name: 'Murales', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 6 },
  { id: 'pinatas', name: 'Piñatas', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 7 },
  { id: 'religiosos', name: 'Artículos decorativos religiosos', category: 'Manualidades y Arreglos', categoryId: 'manualidades', order: 8 },
  { id: 'cumple-infantil', name: 'Decoraciones para cumpleaños infantiles', category: 'Decoraciones', categoryId: 'decoraciones', order: 1 },
  { id: 'quince', name: 'Decoraciones para 15 años', category: 'Decoraciones', categoryId: 'decoraciones', order: 2 },
  { id: 'cumple', name: 'Decoraciones cumpleaños', category: 'Decoraciones', categoryId: 'decoraciones', order: 3 }
];

export const fallbackProducts: Product[] = [
  {
    id: 'collar-perlas',
    name: 'Collar de Perlas Artesanal',
    category: 'Bisutería',
    subcategory: 'Collares',
    description: 'Hermoso collar artesanal hecho a mano con perlas de alta calidad. Diseño elegante y versátil para cualquier ocasión.',
    price: 350,
    imageUrl: 'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
    galleryUrls: [
      'https://images.unsplash.com/photo-1515562141207-7a88fb7ce338?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1602751584552-8ba73aad10e1?auto=format&fit=crop&w=900&q=80',
      'https://images.unsplash.com/photo-1506630448388-4e683c67ddb0?auto=format&fit=crop&w=900&q=80'
    ],
    featured: true
  },
  {
    id: 'llavero-personalizado',
    name: 'Llavero Personalizado',
    category: 'Accesorios',
    subcategory: 'Llaveros',
    description: 'Accesorio personalizado elaborado con cuidado para regalos y detalles especiales.',
    price: 120,
    imageUrl: 'https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=900&q=80',
    galleryUrls: ['https://images.unsplash.com/photo-1607344645866-009c320c5ab8?auto=format&fit=crop&w=900&q=80'],
    featured: true
  },
  {
    id: 'aretes-cristal',
    name: 'Aretes de Cristal',
    category: 'Bisutería',
    subcategory: 'Aretes',
    description: 'Pieza brillante con acabado delicado para complementar un estilo elegante.',
    price: 280,
    imageUrl: 'https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80',
    galleryUrls: ['https://images.unsplash.com/photo-1535632066927-ab7c9ab60908?auto=format&fit=crop&w=900&q=80'],
    featured: true
  },
  {
    id: 'ramo-flores',
    name: 'Ramo de Flores Artificiales',
    category: 'Manualidades y Arreglos',
    subcategory: 'Ramos',
    description: 'Ramo decorativo artesanal para eventos, regalos y espacios especiales.',
    price: 450,
    imageUrl: 'https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80',
    galleryUrls: ['https://images.unsplash.com/photo-1490750967868-88aa4486c946?auto=format&fit=crop&w=900&q=80'],
    featured: false
  },
  {
    id: 'decoracion-cumpleanos',
    name: 'Decoración Cumpleaños Infantil',
    category: 'Decoraciones',
    subcategory: 'Decoraciones para cumpleaños infantiles',
    description: 'Decoración alegre y personalizada para fiestas infantiles.',
    price: 650,
    imageUrl: 'https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80',
    galleryUrls: ['https://images.unsplash.com/photo-1530103862676-de8c9debad1d?auto=format&fit=crop&w=900&q=80'],
    featured: false
  },
  {
    id: 'pulsera-mostacillas',
    name: 'Pulsera de Mostacillas',
    category: 'Bisutería',
    subcategory: 'Pulseras',
    description: 'Pulsera artesanal de mostacillas con colores vivos y detalles dorados.',
    price: 200,
    imageUrl: 'https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80',
    galleryUrls: ['https://images.unsplash.com/photo-1611652022419-a9419f74343d?auto=format&fit=crop&w=900&q=80'],
    featured: false
  }
];
