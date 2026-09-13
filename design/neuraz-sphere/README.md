# Neuraz · Cerebro esférico · V2

Recurso independiente del logo principal del sitio.

Red negra sobre un núcleo blanco sin iluminación (#fafafa en el visor). La silueta original se proyecta sobre dos hemisferios redondeados: se eliminan los mapas laterales que añadían un aro negro alrededor de la vista frontal. La orientación gira físicamente 360°. Al descubrir los laterales, el campo interpola hacia mapas esféricos en tres ejes: los nodos atraviesan la vista en lugar de cancelar el giro frente a la cámara. El giro automático es horizontal por defecto y el arrastre con mouse o touch controla ambos ejes.

El núcleo blanco de radio 1.115 oculta las conexiones posteriores para evitar duplicaciones en el contorno.

Los bordes usan un perfil circular de radio 0.115 alrededor de la superficie de radio 1.12. La proyección frontal en reposo conserva el contorno del SVG dentro de la resolución del campo (512 píxeles); durante las conexiones, la figura se deforma y vuelve al contorno de reposo cada 1.75 segundos. Las conexiones siguen animadas aunque la orientación esté quieta. Con movimiento reducido se conserva la geometría de reposo.

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

El contorno se recompone gradualmente entre radios proyectados 0.62 y 0.88 usando el campo del SVG original. Esto mantiene abiertos los espacios exteriores en todos los ángulos, mientras los nodos interiores siguen girando. La velocidad del campo fluido es 3.3 muestras/s (el doble de la versión anterior).
