# Neuraz · Cerebro esférico · V2

Recurso independiente del logo principal. Red negra con perfil circular de radio 0.09 sobre una superficie esférica de radio 1.12, con núcleo blanco sin iluminación de radio 1.115.

La geometría se define exclusivamente en coordenadas del objeto. Tres mapas del patrón neural se mezclan según la normal de la esfera para cubrir frente, dorso, laterales y polos. La cámara no modifica el campo ni fija partes del contorno: toda la red gira como un solo volumen. Se eliminaron las compensaciones de orientación y las máscaras circulares que producían un efecto de lupa.

La silueta cambia naturalmente al girar. Esta versión es una interpretación volumétrica de la marca: no conserva una copia exacta del SVG en todas las orientaciones. No tiene un aro independiente; las partes visibles en el contorno pertenecen a la misma red.

Las conexiones interpolan ocho campos de la animación original a 3.3 muestras por segundo; la mezcla vuelve al reposo cada 1.75 segundos. El giro automático mantiene 1.08 rad/s horizontal y 0.84 rad/s vertical.

## Uso

- Reproducir / pausar giro controla solo la orientación.
- Horizontal 360° es el eje predeterminado; también están disponibles vertical y ambos.
- Arrastrar con mouse o dedo controla ambos ejes y pausa el giro automático.
- Flechas giran; R o Vista del logo vuelve al frente.
- Pantalla completa sirve para presentaciones; Escape sale.
- Con movimiento reducido no se deforman las conexiones. El giro requiere activación explícita.

El componente pausa el cálculo fuera de pantalla y libera los recursos al navegar. Requiere Three.js (versión usada: 0.183.2) y Astro; copiar `src` y `public` conservando rutas y utilizar `<SphericalLogo />`.

## Descargas y regeneración

El componente web incluye la animación procedural. GLB, Blender y PNG son capturas estáticas de reposo de la misma red; el GLB no incorpora la animación.

1. `node scripts/build-sphere-distance.mjs`
2. `node scripts/build-sphere-mesh.mjs` genera `/tmp/neuraz-sphere-mesh.bin`.
3. Blender en segundo plano con `--python scripts/build-neuraz-sphere.py`.

La malla estática usa 160 muestras por eje. El visor calcula la superficie directamente y no depende del GLB.
