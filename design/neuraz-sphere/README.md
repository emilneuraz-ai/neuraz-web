# Neuraz · Cerebro esférico · V2

Recurso independiente del logo principal del sitio.

Red negra sobre un núcleo blanco sin iluminación (#fafafa en el visor). La silueta original se proyecta sobre dos hemisferios redondeados: se eliminan los mapas laterales que añadían un aro negro alrededor de la vista frontal. El marco gira continuamente sin reinicios angulares. El líquido se redistribuye en un sistema orientado hacia la vista: compensa el giro completo y conserva una inclinación residual máxima de 0.025 radianes por eje, sin distorsión lateral del patrón. Así los laterales y polos mantienen un equilibrio de forma y contraforma similar al frente; no es la rotación rígida de una malla inmutable.

El núcleo blanco de radio 1.115 oculta las conexiones posteriores para evitar duplicaciones en el contorno.

Los bordes usan un perfil circular de radio 0.115 alrededor de la superficie de radio 1.12. La proyección frontal en reposo conserva el contorno del SVG dentro de la resolución del campo (512 píxeles); durante las conexiones, la figura se deforma y vuelve al contorno de reposo cada 3.5 segundos. Las conexiones siguen animadas aunque la orientación esté quieta. Con movimiento reducido se conserva la geometría de reposo.

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

El giro automático utiliza 1.08 rad/s horizontal y 0.84 rad/s vertical (tres veces la velocidad anterior). La deformación fluida se concentra en el interior y se atenúa hacia el contorno para mantener estable la silueta.
