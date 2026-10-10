import type { WorkStory } from './types';

/** Based on the local ACLIMATAR+ Tanzania prototype, not the WCR dashboard case. */
export const aclimatarTanzania: WorkStory = {
  id: 'aclimatar-tanzania',
  title: 'Aclimatar Tanzania',
  category: 'UX/UI · Prototipo móvil',
  accent: '#b96743', theme: 'light', format: 'mobile',
  scenes: [
    { id: 'inicio', label: 'Inicio', eyebrow: 'Información climática para el café', title: 'El clima,\nmás cerca.', description: 'Una experiencia móvil que reúne información climática para el cultivo de café. El recorrido empieza por elegir una ubicación de interés.', detail: 'Tanzania / Diseño de interfaces / Mobile first' },
    { id: 'dashboard', label: 'Dashboard', eyebrow: 'Un lugar, todo su contexto', title: 'De los datos\na una mirada.', description: 'Clima, ubicación y accesos a pronósticos y recomendaciones en un mismo panel. La información organizada para explorar desde el teléfono.', detail: 'Panel de consulta / Valores del prototipo' },
    { id: 'pronostico', label: 'Pronóstico', eyebrow: 'Comprender para planificar', title: 'Una temporada.\nMás perspectiva.', description: 'Probabilidades de lluvia, indicadores y consejos en una lectura visual. Las pestañas conectan el pronóstico con su significado.', detail: 'Visualización de datos / Contenido del prototipo' },
  ],
};
