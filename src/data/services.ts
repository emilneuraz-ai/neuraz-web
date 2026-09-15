// src/data/services.ts
// Datos extraídos de Notion - Database de Servicios

export interface Service {
  id: string;
  name: string;
  description: string;
  benefit: string;
  category: string;
  featured: boolean;
  industries: string[];
  slug: string;
}

export const services: Service[] = [
  {
    id: "automatizacion-flujos",
    name: "Automatización de Flujos de Negocio",
    description: "Eliminamos tareas repetitivas, errores y cuellos de botella. Flujos automáticos de ventas, atención y fidelización.",
    benefit: "Tu negocio trabaja aunque vos no estés. Operación 24/7.",
    category: "Automatización",
    featured: true,
    industries: ["Gastronomía", "Retail", "Finanzas", "Legal", "Institucional", "Automotriz"],
    slug: "automatizacion-de-flujos-de-negocio"
  },
  {
    id: "crm-automatico",
    name: "CRM con Atención Automática",
    description: "CRM con atención automática, consultas a financieras y respuestas inteligentes vía WhatsApp y redes sociales.",
    benefit: "Gestión de clientes centralizada con respuestas en tiempo real sin intervención manual.",
    category: "Automatización",
    featured: false,
    industries: ["Automotriz", "Finanzas", "Retail"],
    slug: "crm-con-atencion-automatica"
  },
  {
    id: "fidelizacion",
    name: "Sistema de Puntos y Fidelización",
    description: "Sistemas de puntos, premios, cupones, rankings, desafíos y niveles. Convertimos clientes en participantes activos.",
    benefit: "Tus clientes vuelven solos. Aumento del ticket promedio en +35%.",
    category: "Gamificación",
    featured: true,
    industries: ["Gastronomía", "Retail", "Energía", "Eventos"],
    slug: "sistema-de-puntos-y-fidelizacion"
  },
  {
    id: "juegos-marca",
    name: "Juegos y Experiencias de Marca",
    description: "Juegos personalizados con identidad de marca: ruletas, trivias, batallas, memoria y más. Participación vía QR sin apps.",
    benefit: "Viralización orgánica y captación masiva de base de datos.",
    category: "Gamificación",
    featured: true,
    industries: ["Gastronomía", "Retail", "Eventos"],
    slug: "juegos-y-experiencias-de-marca"
  },
  {
    id: "contenido-ia",
    name: "Generación Automática de Contenido con IA",
    description: "Creación automática de contenido periodístico, widgets estadísticos, tarjetas digitales e invitaciones interactivas generadas con IA.",
    benefit: "Contenido fresco y personalizado generado sin intervención humana.",
    category: "Inteligencia Artificial",
    featured: false,
    industries: ["Media", "Eventos", "Institucional"],
    slug: "generacion-automatica-de-contenido-con-ia"
  },
  {
    id: "agentes-ia",
    name: "Agentes de IA",
    description: "Análisis de comportamiento, personalización en tiempo real y toma de decisiones automática. La IA decide qué premio dar y optimiza la experiencia continuamente.",
    benefit: "El sistema aprende y mejora solo. Cuanto más se usa, mejor funciona.",
    category: "Inteligencia Artificial",
    featured: true,
    industries: ["Gastronomía", "Retail", "Salud & Fitness", "Educación"],
    slug: "agentes-de-ia"
  },
  {
    id: "documentacion",
    name: "Documentación Inteligente",
    description: "Extracción automática de datos, clasificación de documentos y organización inteligente de archivos. Lo que antes llevaba horas, ahora se hace solo.",
    benefit: "Digitalización y organización de documentos legales, vehiculares e institucionales en segundos.",
    category: "Documentación",
    featured: true,
    industries: ["Legal", "Automotriz", "Institucional", "Finanzas"],
    slug: "documentacion-inteligente"
  }
];

export const categories = [...new Set(services.map(s => s.category))];

export const featuredServices = services.filter(s => s.featured);

/** Shared by the service markers and the 3D scene. Angles are in radians. */
export function serviceVisual(index: number) {
  const colors = ['#e63946', '#171717', '#ffb703'];
  const angles = [
    [0.16, -0.3, -0.09], [-0.2, 0.32, 0.08], [0.24, -0.18, -0.12],
    [-0.12, -0.36, 0.12], [0.2, 0.28, -0.06], [-0.24, -0.2, 0.1],
    [0.12, 0.36, -0.1], [-0.18, -0.28, 0.06], [0.22, 0.2, 0.12],
  ];
  return { color: colors[index % colors.length], angle: angles[index % angles.length] };
}
