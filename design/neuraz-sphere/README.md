# Neuraz · Logo hueco 3D · V2

Frente y dorso comparten el contorno original del SVG y están alineados en las mismas coordenadas XY. Se conectan únicamente por las ramas exteriores; no hay relleno ni esfera blanca en el centro. Visto desde atrás el dibujo aparece reflejado, como el reverso de una pieza real.

Geometría: envolvente de radio 1.12, capa hueca centrada en radio 1.02 con semiespesor 0.10. Los puentes aparecen únicamente a partir del radio XY 0.88, con unión suave de 0.06 y biseles de transición redondeada de 0.10. El núcleo queda vacío. No hay máscaras ni contornos fijados a la cámara.

Las conexiones utilizan los campos de movimiento del SVG a 1.65 muestras por segundo. Cada transición combina suavizado con un 35% de respuesta elástica amortiguada, evitando tirones. La animación recupera el reposo cada 3.5 segundos y reduce su amplitud al acercarse al frente o dorso. Vista del logo vuelve al frente y reinicia la animación desde el dibujo original.

Play / pausa controla únicamente el giro. Horizontal 360° es el eje predeterminado; también están disponibles vertical y ambos. Arrastrar con mouse o dedo controla los dos ejes y pausa el giro automático. Las flechas giran y R vuelve al frente. Pantalla completa sirve para presentaciones; Escape sale. Movimiento reducido mantiene las conexiones en reposo.

El componente requiere Three.js 0.183.2 y Astro. Copiar `src` y `public` conservando rutas y usar `<SphericalLogo />`. Se liberan recursos al navegar y se pausa el cálculo fuera de pantalla.

El componente web incluye la animación procedural. Los archivos GLB, Blender y PNG representan la geometría estática en reposo.

Regenerar con `node scripts/build-sphere-distance.mjs`, `node scripts/build-sphere-mesh.mjs` y Blender `--background --python scripts/build-neuraz-sphere.py`. El segundo paso produce `/tmp/neuraz-sphere-mesh.bin`, con 160 muestras por eje.

Los laterales incorporan recortes neuronales pasantes con unión redondeada de 0.045: se forman ramas que se unen y separan, no un relieve superficial. Los recortes se atenúan entre |z|=0.15 y 0.40 para proteger ambas caras y solo sustraen material dentro del campo XY del logo. Las superficies orientadas hacia la cavidad son blancas y sin iluminación; el centro permanece vacío.
