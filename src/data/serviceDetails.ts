export interface ServiceDetail {
  intro: string;
  flow: [string, string, string];
  features: { title: string; text: string }[];
  audience: string;
}

// Short versions of the service-page content, shared by the visual modal.
export const serviceDetails: Record<string, ServiceDetail> = {
  'automatizacion-de-flujos-de-negocio': {
    intro: 'Conectamos tus herramientas para que las tareas de todos los días se hagan solas.',
    flow: ['Una consulta', 'El flujo se activa', 'La tarea se resuelve'],
    features: [
      { title: 'Seguimientos', text: 'Mensajes y presupuestos en el momento indicado.' },
      { title: 'Recordatorios', text: 'Turnos, vencimientos y renovaciones al día.' },
      { title: 'Datos conectados', text: 'Tus sistemas y reportes, sin carga manual.' },
    ],
    audience: 'Comercios, clínicas y equipos con tareas repetitivas.',
  },
  'crm-con-atencion-automatica': {
    intro: 'Todas tus conversaciones en un solo lugar. Respuestas con la información de tu negocio.',
    flow: ['Llega un mensaje', 'Tu asistente responde', 'Tu equipo continúa'],
    features: [
      { title: 'Un solo lugar', text: 'WhatsApp, redes, email y web conectados.' },
      { title: 'Respuestas útiles', text: 'Productos, horarios y condiciones de tu negocio.' },
      { title: 'Cada cliente, al día', text: 'Historial, seguimiento y consultas organizadas.' },
    ],
    audience: 'Negocios que reciben muchas consultas cada día.',
  },
  'sistema-de-puntos-y-fidelizacion': {
    intro: 'Convertí cada compra en un motivo para volver. Tu marca, tus premios, tus reglas.',
    flow: ['Tu cliente compra', 'Suma puntos', 'Canjea un premio'],
    features: [
      { title: 'Puntos y premios', text: 'Compras que se convierten en recompensas.' },
      { title: 'Niveles', text: 'Beneficios para quienes más participan.' },
      { title: 'Desafíos', text: 'Misiones y rankings que invitan a volver.' },
    ],
    audience: 'Gastronomía, comercios y marcas con compras recurrentes.',
  },
  'juegos-y-experiencias-de-marca': {
    intro: 'Una experiencia con tu marca que empieza con un QR. Se juega desde el celular, sin apps.',
    flow: ['Escanea el QR', 'Juega con tu marca', 'Descubre su premio'],
    features: [
      { title: 'Juegos a medida', text: 'Ruletas, trivias, memoria y desafíos.' },
      { title: 'Tu identidad', text: 'Tus colores y productos, dentro del juego.' },
      { title: 'Nuevos contactos', text: 'Participación en eventos, locales y lanzamientos.' },
    ],
    audience: 'Marcas que quieren activar eventos y puntos de venta.',
  },
  'generacion-automatica-de-contenido-con-ia': {
    intro: 'Transformamos información real en contenido con tu identidad, listo para publicar.',
    flow: ['Tu información', 'La IA crea', 'Contenido listo'],
    features: [
      { title: 'Notas y novedades', text: 'Información de tu rubro con tu estilo.' },
      { title: 'Piezas visuales', text: 'Gráficas, tarjetas e invitaciones con tu marca.' },
      { title: 'Datos vivos', text: 'Widgets y estadísticas que se actualizan.' },
    ],
    audience: 'Medios, instituciones y marcas que publican seguido.',
  },
  'agentes-de-ia': {
    intro: 'Un asistente que entiende tu negocio y actúa con tus reglas, más allá de un menú de respuestas.',
    flow: ['Recibe una consulta', 'Entiende el contexto', 'Responde o actúa'],
    features: [
      { title: 'Atiende y acompaña', text: 'Resuelve consultas y guía a tus clientes.' },
      { title: 'Personaliza', text: 'Usa el contexto para elegir la próxima acción.' },
      { title: 'Procesa información', text: 'Lee documentos o deriva a tu equipo.' },
    ],
    audience: 'Equipos que buscan una atención más ágil y personalizada.',
  },
  'documentacion-inteligente': {
    intro: 'De archivos sueltos a información organizada. Menos carga manual, todo más fácil de encontrar.',
    flow: ['Subís un documento', 'Extrae los datos', 'Queda organizado'],
    features: [
      { title: 'Lectura automática', text: 'Datos clave de fotos, facturas y contratos.' },
      { title: 'Orden y alertas', text: 'Clasificación, faltantes y vencimientos.' },
      { title: 'Plantillas', text: 'Contratos e informes sin copiar y pegar.' },
    ],
    audience: 'Estudios, concesionarias y equipos que gestionan documentos.',
  },
  'capacitaciones-en-ia-y-automatizacion': {
    intro: 'Tu equipo aprende haciendo, con herramientas y casos reales de su trabajo.',
    flow: ['Un desafío real', 'Aprendemos haciendo', 'Tu equipo lo aplica'],
    features: [
      { title: 'IA en el día a día', text: 'Redacción, análisis e ideas con casos prácticos.' },
      { title: 'Menos tareas manuales', text: 'Automatización y organización del trabajo.' },
      { title: 'A tu medida', text: 'Talleres, jornadas o acompañamiento mensual.' },
    ],
    audience: 'Empresas, instituciones y equipos que quieren incorporar IA.',
  },
};
