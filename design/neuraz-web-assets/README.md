# Logo animado de Neuraz

Componentes Astro reutilizables y los recursos originales para su integración en la web. La página `/recursos/logo/` permite compararlos, explorar la perspectiva y descargar los archivos. Tiene `noindex, nofollow`. El SVG animado está integrado en el navbar y en la pantalla de carga del sitio. Los logos se presentan sin botones de pausa.

## Qué contiene cada versión

| Recurso | Uso | Movimiento |
| --- | --- | --- |
| `src/components/AnimatedLogo.astro` | Logo vectorial en negro plano, con fondo transparente | Las piezas se unen y separan, con contornos animados |
| `src/components/NavbarBrand.astro` | Marca del navbar con enlace al inicio, sin botones adicionales | El mismo SVG a 28 px, con NEURAZ opcional |
| `src/components/PageLoader.astro` | Pantalla de carga inicial y navegación entre páginas internas | El mismo SVG a 104 px, con fondo claro |
| `src/components/MercuryLogo.astro` | Logo negro en Three.js, con perspectiva y fondo transparente; acabado metalizado opcional | Fusiones, separaciones e interacción con la vista |
| `public/images/neuraz-logo-animated.svg` | Archivo vectorial independiente | Contornos animados mediante SVG/SMIL |
| `public/models/neuraz-logo-motion.json` | Datos compartidos por `AnimatedLogo` | Secuencia vectorial de los contornos |
| `public/models/neuraz-mercury.glb` | Modelo 3D para Three.js u otro visor compatible | Geometría estática en su forma de reposo |
| `public/models/neuraz-mercury-fluid.json` y `.bin.gz` | Deformación capturada de la geometría de Blender | 192 fotogramas a 24 fps, interpolados en la GPU |
| `public/images/neuraz-mercury-poster.png` | Imagen con transparencia, respaldo y composición | Imagen fija |
| `public/media/neuraz-mercury.mp4` | Render para video dentro de la web | Fusiones y separaciones orgánicas completas |

El recurso Three.js combina el GLB de reposo con la secuencia de deformación `.json` y `.bin.gz`. El componente reconstruye las superficies frontal y posterior y las interpola en la GPU: las piezas se unen y se separan con una cámara en perspectiva que responde al cursor y al arrastre. El acabado predeterminado es negro, con reflejos suaves; `finish="mercury"` recupera el acabado metalizado. Mantiene sólo el par de fotogramas actual en la GPU, junto con las máscaras de contorno que suavizan los bordes. El archivo comprimido de movimiento pesa aproximadamente 1,3 MB. El GLB por separado muestra la forma de reposo y sirve como respaldo durante la carga.

El SVG utiliza los mismos 192 fotogramas del render, en negro plano y sin imágenes rasterizadas. Ambos ciclos duran 8 segundos. El MP4 y el PNG conservan el acabado de mercurio metalizado del render original. El MP4 usa H.264 y no tiene canal alfa; para composiciones transparentes están disponibles el SVG, el PNG y el visor Three.js. El ZIP `public/models/neuraz-logo-web.zip` reúne componentes, scripts, datos de movimiento y recursos públicos con sus rutas de integración.

## Usar los componentes en Astro

Copiá las carpetas `src` y `public` del ZIP al proyecto Astro, conservando sus rutas. El componente SVG no añade dependencias. El componente 3D usa `three` (probado con la versión 0.183.2); este proyecto ya lo tiene instalado. Para otro proyecto Astro:

```sh
npm install three@^0.183.2
npm install -D @types/three@^0.183.1
```

Ejemplo desde `src/pages/ejemplo.astro`:

```astro
---
import AnimatedLogo from '../components/AnimatedLogo.astro';
import MercuryLogo from '../components/MercuryLogo.astro';
---

<AnimatedLogo size={240} label="Neuraz, logo animado" />

<div class="logo-3d">
  <MercuryLogo label="Neuraz negro en 3D con conexiones fluidas" />
</div>

<style>
  .logo-3d {
    width: min(100%, 560px);
  }
</style>
```

Los componentes no requieren `client:load`: sus scripts de Astro se encargan de inicializar cada instancia. Es posible usar varias instancias en una misma página.

### Navbar y pantalla de carga

```astro
---
import NavbarBrand from '../components/NavbarBrand.astro';
import PageLoader from '../components/PageLoader.astro';
---

<body>
  <PageLoader />
  <header><NavbarBrand /></header>
  <main><!-- Contenido del sitio --></main>
</body>
```

Incluí `PageLoader` una sola vez, al comienzo del `body`. Se muestra durante la carga inicial y al seguir enlaces internos a otra página. Se retira en `window.load`, no añade una espera mínima y tiene una salida de seguridad a los 7 segundos. Ignora anclas dentro de la página, descargas, enlaces externos y aperturas en otra pestaña. Escape permite retirarlo; sin JavaScript permanece oculto. Conserva los estados `inert` previos y restablece el contenido al terminar o volver desde el historial.

Para una operación asíncrona de la aplicación, emití `document.dispatchEvent(new Event('neuraz:loading-start'))` al comenzar y el evento `neuraz:loading-end` al finalizar, también cuando falle la operación.

`NavbarBrand` acepta `href` (por defecto `/`), `showWordmark` (`true`), `size` (`28`), `class` y `variant` (`"light"` o `"dark"`). La variante oscura mantiene el isotipo negro sobre un soporte claro. La marca contiene únicamente el enlace al inicio y el logo, sin botones ni espacio reservado para controles. Los componentes respetan `prefers-reduced-motion` y comparten la carga de los datos del SVG.

### `AnimatedLogo`

| Prop | Valor predeterminado | Uso |
| --- | --- | --- |
| `size` | `240` | Número en píxeles o medida CSS como `"100%"` |
| `label` | `"Neuraz"` | Nombre accesible; `""` lo marca como decorativo |
| `class` | Sin clase adicional | Clase de la instancia |
| `autoplay` | `true` | Inicia la animación cuando corresponde |
| `paused` | `false` | Empieza en pausa |
| `controls` | `false` | `true` añade el botón opcional de pausar/reanudar |

La forma original se muestra inmediatamente. Los datos de movimiento se cargan de forma diferida y se comparten entre las instancias. La animación se detiene cuando queda fuera de pantalla o la pestaña está oculta. Sin JavaScript, ante un error de carga o con `prefers-reduced-motion`, permanece el logo original.

Para un logo puramente decorativo:

```astro
<AnimatedLogo size={64} label="" controls={false} autoplay={false} />
```

Los controles son opcionales y permanecen ocultos por defecto. Para controlar la reproducción desde la aplicación, el nodo `[data-animated-logo]` acepta los eventos `animated-logo:play` y `animated-logo:pause`, además del atributo `data-paused`.

```js
const logo = document.querySelector('[data-animated-logo]');
logo?.dispatchEvent(new CustomEvent('animated-logo:pause'));
logo?.dispatchEvent(new CustomEvent('animated-logo:play'));
```

El archivo SVG independiente puede colocarse con `<img src="/images/neuraz-logo-animated.svg" alt="Neuraz" />`. Para disponer de carga diferida, control de reproducción desde la aplicación y las medidas de accesibilidad integradas, usá `AnimatedLogo`.

### `MercuryLogo`

| Prop | Valor predeterminado | Uso |
| --- | --- | --- |
| `label` | `"Isotipo Neuraz tridimensional"` | Nombre accesible del visor |
| `class`, `id` | Sin valor | Identificación y estilos de la instancia |
| `finish` | `"black"` | `"black"` para negro con reflejos suaves; `"mercury"` para metalizado |
| `modelSrc` | `"/models/neuraz-mercury.glb"` | Ruta del modelo |
| `posterSrc` | `"/images/neuraz-mercury-poster.png"` | Imagen de respaldo |
| `fluid` | `true` | Activa las fusiones y separaciones de la geometría |
| `fluidSrc` | `"/models/neuraz-mercury-fluid.bin.gz"` | Datos comprimidos de la deformación |
| `fluidMetadataSrc` | `"/models/neuraz-mercury-fluid.json"` | Dimensiones, escala y tiempos de la secuencia |
| `interactive` | `true` | Habilita la interacción con la vista |
| `autoplay` | `true` | Activa el fluido y el movimiento automático de presentación |
| `controls` | `false` | `true` añade los botones opcionales de pausa y restablecimiento |
| `loading` | `"lazy"` | `"eager"` para un recurso visible al cargar la página |
| `reducedMotion` | `"poster"` | `"poster"` muestra una imagen; `"static"` permite el visor sin movimiento automático |
| `aspectRatio` | `1` | Relación de aspecto del visor |
| `framing` | `1.05` | Margen de encuadre entre `1` y `2`; valores mayores alejan el logo |
| `exposure` | `1.1` | Exposición del render en tiempo real |
| `environmentIntensity` | `1.3` | Intensidad de los reflejos |
| `maxDpr` | `1.75` | Límite de densidad de píxeles para controlar el coste de render |

El cursor modifica sutilmente la perspectiva y se puede arrastrar para girar el logo. El visor admite las flechas del teclado, Espacio para pausar o reanudar y R para restablecer la vista, sin mostrar botones por defecto. La pausa detiene también las fusiones. Three.js se carga de forma diferida; el PNG permanece como respaldo mientras carga y si el visor no puede iniciarse. Con `finish="black"`, la imagen de respaldo se oscurece y desatura para mantener el aspecto negro.

Los eventos `mercury:ready`, `mercury:fluid-ready`, `mercury:fluid-error` y `mercury:error` se emiten en el elemento `neuraz-mercury`. Ese elemento también acepta `mercury:pause`, `mercury:play` y `mercury:reset` para controlar la reproducción y la vista desde la aplicación. La reproducción se detiene fuera de pantalla y con la pestaña oculta.

La caché contiene alturas exteriores de la malla original sobre una cuadrícula de 192 × 192, con precisión de 16 bits. Este logo tiene superficies adecuadas para esa representación; el formato no está pensado para modelos con cavidades internas o varias capas superpuestas. Si no se dispone de WebGL2 o de descompresión gzip en el navegador, permanecen los respaldos estáticos.

Ejemplo de un recurso estático con perspectiva:

```astro
<MercuryLogo
  fluid={false}
  autoplay={false}
  interactive={false}
  controls={false}
  label="Neuraz negro en 3D"
/>
```

Para el acabado metalizado original, usá `<MercuryLogo finish="mercury" />`.

## Usar el render en la web

```html
<video
  controls
  loop
  muted
  playsinline
  preload="metadata"
  poster="/images/neuraz-mercury-poster.png"
  aria-label="Animación del logo de Neuraz en mercurio metalizado, sin audio"
>
  <source src="/media/neuraz-mercury.mp4" type="video/mp4" />
</video>
```

La página de comparación deja la reproducción del video a elección del visitante. Si añadís reproducción automática a otra página, respetá `prefers-reduced-motion` y conservá un control de pausa.

## Integración y comprobación

La ruta de comparación está en `src/pages/recursos/logo.astro`. Las rutas públicas de esta documentación parten de `/`, como la configuración actual del sitio; si el proyecto se publica en un subdirectorio, ajustá las URLs de los recursos y los enlaces de descarga.

Comandos del proyecto:

```sh
npm run dev
npm run build
```

Para regenerar el ZIP después de editar los componentes o recursos: `python3 scripts/package-neuraz-logo-web.py`.

Al revisar la integración, verificá `/recursos/logo/` en escritorio y móvil, la perspectiva y el arrastre, la ausencia de botones en los logos, la navegación con teclado y la preferencia de movimiento reducido. Los controles de pausa y restablecimiento sólo aparecen si se solicita `controls={true}`. Esta documentación describe el contrato de los componentes; los resultados de las verificaciones deben informarse por separado.
