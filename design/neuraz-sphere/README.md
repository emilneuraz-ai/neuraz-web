# Neuraz · Cerebro esférico · V2

Recurso independiente del logo principal del sitio.

Red negra sobre un núcleo blanco sin iluminación (#fafafa en el visor). El patrón del SVG se distribuye por tres mapas de superficie esférica mezclados suavemente, por lo que hay conexiones en el frente, dorso, laterales y polos. No se extruye el frente hacia atrás ni se reinicia la orientación cada 45 grados. La vista frontal es una interpretación esférica del logo, no una coincidencia vectorial exacta con el SVG.

Los bordes usan un perfil circular de radio 0.058 alrededor de la superficie de radio 1. Las conexiones interpolan ocho campos de la animación original incluso con la orientación quieta. Con movimiento reducido se conserva la geometría de reposo; el giro solo comienza al activarlo explícitamente.

## Controles

- Reproducir / pausar giro: controla únicamente la orientación.
- Eje: horizontal, vertical o ambos; vueltas completas continuas.
- Arrastrar o flechas: orientación manual sin límite angular.
- Vista del logo / tecla R: detiene el giro y vuelve al frente; la animación neuronal continúa.
- Pantalla completa: presentación para monitor o televisor; Escape sale.

El componente pausa el cálculo al salir de pantalla y libera sus recursos al navegar. Requiere Three.js (versión usada: 0.183.2) y Astro. Copiar `src` y `public` conservando las rutas y utilizar `<SphericalLogo />`.

## Archivos y regeneración

El componente web contiene la animación procedural. El GLB y el archivo Blender son una captura estática de reposo de la misma superficie, sin animación incorporada. El PNG muestra esa malla con iluminación de estudio.

1. `node scripts/build-sphere-distance.mjs`
2. `node scripts/build-sphere-mesh.mjs` (genera `/tmp/neuraz-sphere-mesh.bin`)
3. Blender en segundo plano con `--python scripts/build-neuraz-sphere.py`.

La malla estática usa una cuadrícula de 160 muestras por eje; el visor calcula la superficie directamente y no depende del GLB.
