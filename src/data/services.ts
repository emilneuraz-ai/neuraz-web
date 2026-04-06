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
  },
  {
    id: "capacitaciones",
    name: "Capacitaciones en IA y Automatización",
    description: "Formación en IA, automatización y herramientas de productividad para equipos y organizaciones.",
    benefit: "Equipos capacitados para implementar y aprovechar la tecnología en su día a día.",
    category: "Inteligencia Artificial",
    featured: false,
    industries: ["Educación", "Institucional", "Finanzas", "Salud & Fitness"],
    slug: "capacitaciones-en-ia-y-automatizacion"
  },
  {
    id: "dashboards",
    name: "Dashboards & Estadísticas en Tiempo Real",
    description: "Dashboards interactivos con actualización automática vía scraping y gestión visual. Tablas exportables, widgets personalizables, gráficas configurables y reportes programados.",
    benefit: "Tus métricas siempre activas, sin depender de un desarrollador para actualizar un solo número.",
    category: "Análisis de datos",
    featured: true,
    industries: ["Retail", "Energía", "Finanzas", "Legal", "Institucional", "Media"],
    slug: "dashboards"
  }
];

export const categories = [...new Set(services.map(s => s.category))];

export const featuredServices = services.filter(s => s.featured);
