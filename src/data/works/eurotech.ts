import type { WorkStory } from './types';

/** Original desktop and mobile captures supplied by the user, 10 October 2026. */
export const eurotech: WorkStory = {
  id: 'eurotech', theme:'dark', title: 'Eurotech Ecommerce', category: 'UX/UI · Desarrollo web',
  url: 'https://www.behance.net/gallery/255609149/Eurotech-Web-Ecomerce', accent: '#d62b22',
  scenes: [
    { id: 'inicio', label: 'Inicio móvil', eyebrow: 'Una tienda, de principio a fin', title: 'Herramientas.\nUna experiencia.', description: 'Diseño y desarrollo de una tienda de herramientas para Argentina y Uruguay. Del catálogo a la cuenta del cliente, una identidad industrial que acompaña todo el recorrido de compra en desktop y mobile.', detail: 'Identidad industrial / Desktop & mobile', device: 'mobile', image: { src: '/images/works/eurotech/inicio-mobile.png', width: 402, height: 5206, alt: 'Eurotech: inicio móvil con novedades, ofertas, combos e información de la empresa' } },
    { id: 'catalogo', label: 'Categorías móvil', eyebrow: 'Catálogo', title: 'Menos vueltas.\nMás precisión.', description: 'Categorías a mano y productos comparables. Un catálogo pensado para encontrar la herramienta indicada.', detail: 'Categorías / Filtros / Catálogo', device: 'mobile', image: { src: '/images/works/eurotech/categoria-mobile.png', width: 402, height: 4566, alt: 'Eurotech: categoría Manuales en móvil, subcategorías y catálogo en dos columnas' } },
    { id: 'subcategoria', label: 'Subcategorías móvil', eyebrow: 'Navegación por categorías', title: 'Encontrar\nla indicada.', description: 'Un segundo nivel de categorías acerca los productos al recorrido de búsqueda.', detail: 'Manuales / Llaves combinadas', device: 'mobile', image: { src: '/images/works/eurotech/subcategoria-mobile.png', width: 402, height: 4340, alt: 'Eurotech: subcategoría Llaves combinadas en móvil, filtros y productos' } },
    { id: 'busqueda', label: 'Búsqueda móvil', eyebrow: 'Búsqueda de productos', title: 'Buscar.\nEncontrar.', description: 'Los resultados muestran imagen, nombre y precio en el mismo recorrido de búsqueda.', detail: 'Búsqueda / Resultados', device: 'mobile', image: { src: '/images/works/eurotech/busqueda-mobile.png', width: 402, height: 1359, alt: 'Eurotech: buscador móvil desplegado con resultados de productos' } },
    { id: 'producto', label: 'Producto desktop', eyebrow: 'Detalle de producto', title: 'Cada detalle\ncuenta.', description: 'Imágenes protagonistas, identificación por SKU y acceso directo a la compra. Una ficha que acompaña la decisión.', detail: 'Galería / Precios / Carrito', device: 'desktop', image: { src: '/images/works/eurotech/producto-desktop.png', width: 1728, height: 2545, alt: 'Eurotech: ficha de producto en escritorio con galería, precios, descripción y productos relacionados' } },
    { id: 'pedidos', label: 'Pedidos desktop', eyebrow: 'Mi cuenta', title: 'Después\nde la compra.', description: 'La cuenta reúne pedidos, fechas, estados y acceso al detalle de cada compra.', detail: 'Mi cuenta / Pedidos', device: 'desktop', image: { src: '/images/works/eurotech/pedidos-desktop.png', width: 1728, height: 1033, alt: 'Eurotech: pantalla Mi Cuenta y listado de pedidos en escritorio' } },
  ],
};

export const eurotechProducts = [
  { image: 'detector.jpg', name: 'Detector de fugas y presión de radiador', category: 'Medición y prueba', sku: '5054', price: '4.665', cash: '4.385', tag: 'Ofertas' },
  { image: 'extractor.jpg', name: 'Extractor de rodamientos internos', category: 'Extractores', sku: '6534', price: '3.441', cash: '3.235', tag: 'Novedades' },
  { image: 'crique.jpg', name: 'Llave crique extensible · 1/2', category: 'Herramientas manuales', sku: '5538', price: '945', cash: '889', tag: 'Novedades' },
  { image: 'multimetro.jpg', name: 'Multímetro digital inteligente', category: 'Medición y prueba', sku: '6544', price: '2.759', cash: '2.593', tag: 'Novedades' },
];
