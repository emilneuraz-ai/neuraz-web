# Neuraz · Cerebro esférico · V2

Versión independiente del logo, disponible en `/recursos/logo/`. No sustituye el logo del inicio ni el render de servicios.

## Interacción

La vista inicial es frontal y ortográfica, con conexiones negras y núcleo gris claro. El campo de contorno se obtiene del SVG original a 512 × 512 píxeles: conserva su silueta dentro de esa resolución, sin introducir perspectiva frontal. Al arrastrar o usar las flechas se revela una envolvente esférica con canales, nodos y conexiones internas. Tras soltarlo, vuelve suavemente al frente. «Ver transformación» ejecuta un recorrido de 12 segundos; «Vista del logo» lo restablece.

La deformación interpola campos de distancia de ocho momentos de la animación fluida original. Su amplitud vuelve a cero al regresar al logo. Cada 45° horizontales o verticales, el patrón se realinea por deformación procedural: no es una rotación rígida de una malla inmutable. Los controles de 45° permiten mantener cada alineación para inspeccionarla. El campo varía con la profundidad para que las conexiones de ambas caras no cambien al mismo tiempo. Con movimiento reducido, el giro por controles conserva la geometría de reposo y omite la animación fluida.

## Archivos

- `src/components/SphericalLogo.astro`: componente independiente.
- `src/scripts/spherical-logo.ts`: visor Three.js con superficie implícita, control de giro y regreso al origen.
- `public/models/neuraz-sphere-field.png`: atlas de distancias, un contorno original y ocho estados de fluido.
- `public/models/neuraz-sphere.glb`: malla estática de la envolvente esférica en reposo, con núcleo gris y bisel redondeado de ocho segmentos; la animación procedural está en el visor web, no en el GLB.
- `public/images/neuraz-sphere-poster.png`: render lateral de Blender con fondo transparente.
- `design/neuraz-sphere/neuraz-sphere.blend`: escena editable del recurso estático.
- `scripts/build-neuraz-sphere.py` y `scripts/build-sphere-distance.mjs`: generación de recursos.

El visor requiere `three` (versión usada: 0.183.2). Copiar `src` y `public` conservando rutas y utilizar `<SphericalLogo />`. El SVG original se mantiene como respaldo si WebGL no está disponible. La malla GLB sirve para otras escenas 3D, mientras el componente reproduce la transformación completa.
