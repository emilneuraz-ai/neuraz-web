# Neuraz · Dos caras 3D · V2

Dos caras abombadas independientes construidas a partir del campo del SVG original. El dorso refleja la coordenada horizontal para que el logo se lea correctamente al verlo desde atrás durante el giro horizontal. No hay mapas laterales, puentes entre las dos caras ni un contorno fijo superpuesto a una esfera distinta.

Cada cara usa un perfil circular de radio 0.115 sobre radio 1.12. La franja |z| < 0.28 queda libre de geometría negra, con transición redondeada. Un núcleo blanco sin iluminación, de radio 1.10, oculta el dorso al mirar de frente.

En reposo, el contorno frontal coincide con el campo del SVG original (resolución 512 píxeles). Durante el giro se reduce la deformación al acercarse al frente o al dorso para recuperar la figura. La animación retorna a la forma de reposo cada 1.75 segundos, incluso estando quieta. Vista del logo vuelve al frente y reinicia la animación desde la forma original.

Las conexiones usan interpolación con resorte amortiguado entre campos de distancia: sobrepasan el destino hasta un 16% y regresan suavemente. La velocidad se mantiene en 3.3 muestras por segundo. El movimiento ocurre dentro de cada cara; las dos caras nunca se fusionan.

## Controles

- Play / pausa controla el giro; las conexiones continúan animadas.
- Horizontal 360° predeterminado, vertical o ambos.
- Arrastrar con mouse o dedo gira y pausa el giro automático.
- Flechas giran; R o Vista del logo vuelve al frente.
- Pantalla completa; Escape sale.
- Movimiento reducido conserva el modelo en reposo; el giro requiere activación explícita.

Three.js 0.183.2 y Astro. Copiar `src` y `public` conservando rutas y usar `<SphericalLogo />`. Se liberan los recursos al navegar y se pausa el cálculo fuera de pantalla.

## Archivos

El componente web contiene la animación. GLB, Blender y PNG muestran la geometría estática en reposo; el GLB no incorpora la animación procedural.

Regenerar con `node scripts/build-sphere-distance.mjs`, después `node scripts/build-sphere-mesh.mjs` y finalmente Blender `--background --python scripts/build-neuraz-sphere.py`. El segundo paso escribe `/tmp/neuraz-sphere-mesh.bin` (cuadrícula de 160 muestras por eje).
