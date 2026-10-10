# Presentaciones de trabajos

Cada trabajo mantiene su propia identidad y referencia de Behance. Eurotech Ecommerce y Gestor Eurotech son proyectos distintos del mismo cliente: no mezclar sus escenas ni descripciones.

## Componente reutilizable

`src/components/works/ProjectStory.astro` recibe `project` (tipo `WorkStory`) e `index`. El proyecto declara tres o cuatro escenas (el componente valida un mínimo de tres y un máximo de cuatro) con `id`, `label`, `eyebrow`, `title`, `description` y `detail`.

El slot contiene una sección por escena, en el mismo orden que los datos, con el atributo `data-work-scene`. Cada sección ocupa un ancho del escenario. Los componentes de interfaz de cada cliente se mantienen separados del componente de scroll.

`src/scripts/project-story.ts` calcula el avance a partir del scroll nativo. Reserva un tramo para leer cada vista y otro para la transición horizontal. Al terminar la última vista, el escenario deja de estar fijo y el siguiente bloque entra verticalmente. Para agregar un segundo proyecto, renderizar otra instancia de `ProjectStory` inmediatamente después de la primera.

- No interceptar `wheel` ni bloquear el scroll del documento.
- Mantener enlaces de Behance y controles de capítulos accesibles.
- Las escenas fuera de pantalla son `inert` únicamente en el modo animado.
- Sin JS, con movimiento reducido o con una pantalla de menos de 541 px de alto o de hasta 360 px de ancho, las vistas se apilan y se pueden recorrer verticalmente.
- Respetar `prefers-reduced-motion` para cualquier animación interna.
- Limitar cada caso a tres o cuatro vistas; no completar con métricas o funcionalidades sin fuente.
- Las reconstrucciones son demostraciones: sus controles no deben comprar, publicar ni enviar datos.

## Primera presentación: Eurotech Ecommerce

`src/data/works/eurotech.ts` contiene el relato; `EurotechView.astro` reconstruye tres vistas (inicio, catálogo y producto) en HTML/CSS y añade interacciones locales. Solo el logo y las fotografías son imágenes; no se utilizan capturas completas de interfaz.

Fuentes revisadas el 10 de octubre de 2026:

- https://www.behance.net/gallery/255609149/Eurotech-Web-Ecomerce — identidad y recorrido de inicio, navegación, catálogo, ficha y compra.
- https://eurotech-resumen.neuraz.ar/ — alcance del tema WooCommerce a medida y separación de los productos digitales.
- `/Volumes/Emil/neuraz/projects/eurotech-presentacion/` — logo y referencias desktop/mobile.
- `/Volumes/Emil/neuraz/projects/wp-eurotech-theme/DESIGN.md` y `documents/images/` — sistema visual, checkout y cuenta.
- https://eurotech.uy/ — referencia visual principal del diseño final: doble banner, filtros de tienda, galería y ficha de producto. Fotografías, nombres, SKU y precios documentales tomados del sitio en esta fecha. Los precios son parte de la presentación y no una oferta comercial actual.
- https://gestor-eurotech.neuraz.ar/ — consultado como contexto del cliente; reservado para el caso independiente del Gestor.

### Activos locales

En `public/images/works/eurotech/`:

- `logo.svg`: `eurotech-presentacion/imagenes/eurotech-logo-alone.svg`.
- `workshop.webp`: https://eurotech.uy/wp-content/uploads/2026/07/home-banner-01.webp
- `detector.jpg`: https://eurotech.uy/wp-content/uploads/2026/06/5054-1-768x768.jpg
- `extractor.jpg`: https://eurotech.uy/wp-content/uploads/2026/08/D_890354-MLU114593962164_082026-O.jpg
- `crique.jpg`: https://eurotech.uy/wp-content/uploads/2026/08/D_694872-MLU114185699252_082026-O.jpg
- `multimetro.jpg`: https://eurotech.uy/wp-content/uploads/2026/08/D_610377-MLU115527910507_082026-O-1.jpg

Las otras ocho referencias tienen ahora presentaciones propias; ver abajo las fuentes y las simplificaciones de esta primera reconstrucción.

Se retiraron las vistas de checkout y cuenta para respetar el máximo de cuatro pantallas. El primer caso usa tres. Las miniaturas cambian la fotografía local y los filtros actúan sobre la selección de productos de la presentación.

Activos adicionales del sitio publicado: `air-conditioning.webp` desde `/wp-content/uploads/2026/07/AA-banner-3.webp`; `detector-2.jpg` y `detector-3.jpg` desde `/wp-content/uploads/2025/01/5054-{2,3}-1024x1024.jpg`. Tipografía Space Grotesk Bold desde Google Fonts, como el sitio final.

## Aclimatar Tanzania

Añadido como segundo caso independiente en `Works.astro`, después de Eurotech Ecommerce. No reemplaza “Dashboard for World Coffee Research - Aclimatar”. El usuario confirmó que Tanzania todavía no tiene Behance; `WorkStory.url` es opcional y el enlace solo se muestra cuando existe. Para publicarlo más adelante, agregar su URL en `src/data/works/aclimatar-tanzania.ts`.

- Fuente: `/Volumes/Emil/neuraz/projects/aclimatar/aclimatar-tanzania/`, revisado el 10 de octubre de 2026 (README, HANDOFF, `/views`, `/dashboard` y `/pronostico`).
- Tres escenas: inicio, dashboard y pronóstico estacional.
- `AclimatarView.astro` reconstruye el HTML del prototipo con CSS aislado y JS local: ubicaciones desplegables, información ampliable, pestañas de pronóstico y estado de guardado de ejemplo.
- Los datos climáticos son contenido del prototipo, no observaciones ni pronósticos actuales. La presentación lo indica visualmente.
- Logo extraído de `src/components/Logo.tsx`; fondo de `src/assets/hero-bg.png`; fuentes Source Sans Pro 400/700 y Source Serif Pro 600 copiadas de las dependencias @fontsource del proyecto de origen.
- No se modifica el proyecto de origen ni se conecta a APIs climáticas.
- `Works.astro` recorre ahora una colección de `{ project, View }`, con IDs únicos por proyecto y escena. Los tipos compartidos están en `src/data/works/types.ts`.


## Colección ampliada y controles (10 de octubre de 2026)

Orden: Eurotech Ecommerce, Eurotech Gestor, Aclimatar Café, Aclimatar Tanzania, Shell Puntos, West, Kronos OCR, 100% Noticias, Las Mil Novedades y The Legend Bots. Tres escenas por caso (30 vistas), sin duplicar el índice anterior.

- `WorkStory.theme` alinea el entorno con la interfaz: oscuro en Ecommerce, Noticias y Legend; claro en los demás.
- `WorkStory.format` identifica las vistas móviles. `DemoFrame.astro` mantiene un lienzo 960×600 para desktop y 360×680 para teléfono. ResizeObserver escala sin estirar. Las tres escenas de cada caso comparten también el mismo factor de ajuste vertical.
- Header Proyectos, enlace real a Behance cuando existe, cierre hacia Nosotros y diez puntos de posición con nombres accesibles. Los controles inferiores recorren las tres pantallas. El salto actualiza el hash y mueve el foco sin secuestrar el scroll.
- Se preservan scroll nativo, teclado y presentación vertical con movimiento reducido o pantallas muy pequeñas.
- Contacto y footer usan negro y escala de grises.

### Fuentes de los ocho casos añadidos

Los enlaces exactos de Behance se conservan en `src/data/behance-projects.json` y se resuelven por ID desde `additional-projects.ts`.

| Caso | Fuente adicional local | Vistas |
| --- | --- | --- |
| Eurotech Gestor | `eurotech-gestor/public/documentation/`, `docs/showcase/`, `src/app/presentacion/` | Catálogo global, ficha, sincronización |
| Aclimatar Café / WCR | Behance 223769785; referencias en `output/work-references/cafe-*` | Inicio, ubicación, riesgos |
| Shell Puntos | Behance 240133227, montaje final de pantallas | Inicio, premios, cargas |
| West | `west/west-web/app/page.tsx`, recursos originales de `public/` | Inicio, equipo, proceso |
| Kronos OCR | `lexia-abogados/frontend-ocr-prompting-fe/output/playwright/kronos-behance/assets/capturas/` | Flujos, configuración clara, extracción clara |
| 100% Noticias | Behance 226355857, pantallas y paleta | Portada, temáticas, lectura |
| Las Mil Novedades | `lasmilnovedades/lmn-presentacion/assets/screens/` | Inicio cliente, canjes, actividad |
| The Legend Bots | Behance 125290655, onboarding y dashboard | Preparación, configuración, panel |

### Alcance de fidelidad y recursos pendientes

Son reconstrucciones editoriales en HTML/CSS/JS basadas en las referencias, no aplicaciones conectadas ni copias completas. Se mantienen paletas, jerarquías, composición y funciones principales. Se usan fotos y logos originales cuando estuvieron disponibles localmente (Eurotech, Tanzania, West, Kronos, LMN).

- Gestor conserva la estructura administrativa y cifras documentales del catálogo global, con una selección de productos del ecommerce ya documentada. La vista de sincronización reproduce las tarjetas de importación y reparación de la documentación del Gestor.
- Café utiliza una ilustración SVG propia y un mapa esquemático etiquetado, pendientes de sustituir por el recurso botánico original y la cartografía final. Los riesgos son datos del diseño, no datos actuales.
- Shell mantiene el recorrido y los valores de las pantallas; la composición de campaña es una síntesis tipográfica, pendiente del arte original de Navidad sobre ruedas.
- Noticias mantiene la identidad oscura y el patrón de navegación. Titulares, imagen editorial y cuerpo son contenido de presentación expresamente identificado: faltan las fotografías y pantallas originales para una reproducción exacta.
- LMN conserva el premio de prueba del prototipo; no se inventa un catálogo comercial. Actividad y cuenta omiten identidad y datos privados.
- Legend mantiene colores y jerarquía, con parámetros de ejemplo y un interruptor exclusivamente local. No realiza conexiones ni operaciones.

Los controles de prueba filtran listas, seleccionan opciones, muestran estados de guardado o simulan un resultado de OCR. Ninguno envía datos. Las navegaciones dentro de las aplicaciones representadas que son solo contexto visual se dibujan como texto, no como enlaces falsos.


## Revisión de navegación y responsive — 10 de octubre de 2026

Esta revisión reemplaza el recorrido horizontal controlado por scroll descrito anteriormente.

- El scroll vertical recorre los proyectos, con desvanecimiento según la posición en pantalla. No se interceptan wheel ni gestos verticales.
- Cada proyecto tiene tres vistas internas y chevrons junto al título, debajo de la interfaz. También admite swipe horizontal y navegación por puntos.
- Un único indicador de diez posiciones permanece fijo y se oculta fuera de Trabajos. El cierre conduce a Nosotros.
- La UI de presentación es exclusivamente blanca/negra según el tema. Las aplicaciones conservan sus colores originales.
- DemoFrame `responsive` usa un lienzo móvil de 390 × 780 bajo 768 px. En escritorio mantiene la resolución nativa de cada caso. El ajuste al alto escala las tres vistas por igual, sin deformarlas.
- Ecommerce, Gestor, Café, West, Kronos y LMN tienen layouts móviles. Tanzania, Shell, Noticias y Legend conservan formato de teléfono también en escritorio, por las referencias disponibles.
- Ecommerce y West ahora incorporan HTML y CSS originales aislados en iframes locales, con imágenes y tipografías locales, sin scripts comerciales. Sus media queries responden al ancho real del lienzo. Generadores: `scripts/build-eurotech-presentation.mjs` y `scripts/build-west-presentation.mjs`.
- Gestor usa su componente propio, fuentes originales y estructura de las capturas de documentación. Café, Shell, Noticias y Legend conservan las limitaciones de recursos detalladas arriba; no se consideran reproducciones exactas.
- La animación general de secciones excluye Trabajos para no interferir con su desvanecimiento ni con el indicador fijo.

Los cambios de esta revisión se validan localmente. No implican despliegue a producción.

### Autoplay y swipe

Las vistas del proyecto visible avanzan en bucle cada 2000 ms. El temporizador se detiene fuera de pantalla, con la pestaña oculta, durante el gesto, con foco de teclado o al pulsar pausa. Con movimiento reducido, la reproducción comienza pausada. Cada navegación manual reinicia el intervalo. El swipe sigue el dedo mediante Pointer Events y conserva el scroll vertical nativo; también admite arrastre con ratón. Validado localmente: avance automático 01 → 02 sin cambiar scrollY, pausa, arrastre 02 → 03 → 02 sin desplazamiento vertical y build de Astro.

### Scroll horizontal entre proyectos

El recorrido externo ahora usa un contenedor sticky bajo el navbar. El scroll vertical nativo mueve horizontalmente los proyectos, con una breve zona de reposo por proyecto. No se capturan eventos wheel ni se bloquea el scroll del documento. Los puntos saltan a la posición vertical correspondiente, el cierre sale a Nosotros y los enlaces directos restauran el proyecto. Autoplay y swipe siguen controlando exclusivamente las vistas internas. Fuera del proyecto activo, el contenido queda inert. Con movimiento reducido, se conserva el recorrido vertical sin desplazamiento lateral. Validado a 1280 px y 390 px: rail horizontal, top constante de 80 px, puntos correctos y sin overflow horizontal del documento.


### Capturas originales de Aclimatar Café y controles laterales

La nueva indicación del usuario reemplaza la reconstrucción HTML de Café por seis imágenes originales entregadas el 10 de octubre: Home.jpg, Map.jpg, Dashboard.png, Precipitactiones.png, Temperatura.png y Riesgos.png. Se copiaron sin modificación a `public/images/works/aclimatar-cafe/` y se verificó su identidad por SHA-256. Esta galería de seis capturas reemplaza el límite anterior de cuatro para este caso; los otros proyectos conservan su cantidad de vistas.

`WorkScene.image` y `ScreenCapture.astro` permiten incorporar capturas originales a cualquier caso. Se centran y ajustan al espacio disponible respetando su relación de aspecto, sin crop ni reinterpretaciones. En móvil se muestra la captura original disponible; no se inventa una variante responsive del diseño. Los originales de Café son de escritorio. El SVG botánico y el mapa esquemático de la reconstrucción anterior dejaron de renderizarse.

Todos los proyectos tienen ahora los chevrons a ambos lados de la pantalla y centrados verticalmente. Su posición se calcula usando el ancho visible real, incluso para las interfaces de teléfono y las capturas de página completa. Se mantienen autoplay, pausa, swipe y scroll horizontal entre proyectos.

### Composición desktop y marcos de dispositivo

En desktop las escenas ahora disponen pantalla a la izquierda y texto ampliado a la derecha, con sus centros verticales alineados. Se oculta la barra superior de cierre/Behance; el enlace al caso queda bajo el texto. Móvil conserva la composición apilada con texto de mayor tamaño.

`DeviceFrame.astro` agrega chrome de navegador a las vistas desktop y un marco de teléfono con isla, barra de estado, indicador inferior y sombra a las vistas móviles. Los proyectos responsive cambian de marco según el breakpoint; las capturas originales de Café conservan el navegador. Los marcos antiguos internos quedan sin borde/sombra para evitar duplicaciones. Tanzania usa ahora el lienzo escalable compartido para preservar la proporción en móviles estrechos.

El scroll entre proyectos se alinea al proyecto más cercano después de detenerse. No ajusta al salir del recorrido ni durante un toque sostenido, y mantiene las preferencias de movimiento reducido.


### Texto fijo en el carrusel interno

Cada proyecto tiene un único bloque de texto fuera de `story-track`: categoría, título, descripción inicial y enlace a Behance. Las flechas también permanecen fuera del track, junto a la galería. Navegación manual, swipe y autoplay desplazan solamente las pantallas; los textos y controles conservan su posición. El ancho de desplazamiento corresponde a la ventana de imágenes, no al ancho completo del proyecto.

Validado localmente a 1440 × 900 y 390 × 844: texto, coordenadas de texto y flechas y scrollY idénticos antes/después del cambio de pantalla; swipe y autoplay activos, sin overflow horizontal ni errores de consola. Build de Astro correcto.


### Tema del marco de navegador

`DeviceFrame` recibe el tema del proyecto. En dark, el borde, la barra del navegador, los controles y el campo de dirección usan grises oscuros con texto claro; light conserva el marco claro. Las vistas móviles mantienen su marco de teléfono. Build y comprobación local de ambos temas correctos.


### Capturas originales de 100% Noticias — 10 de octubre de 2026

Se reemplazaron las tres reconstrucciones HTML de Noticias por las cinco capturas entregadas por el usuario: Home.png, Category.png, single.png, Settings.png y Alerts.png. Los originales se copiaron sin modificación a `public/images/works/noticias/` y se presentan en ese orden: portada, categoría, lectura, ajustes y alertas. Se retiró la reconstrucción de Noticias de `MobileCases.astro`, con sus estilos y controles de ejemplo.

`ScreenCapture` admite desplazamiento vertical para las capturas de formato móvil dentro de un área de teléfono de proporción 430 × 932. Conserva el ancho y la proporción original de cada imagen, con acceso por teclado al área desplazable. Las capturas largas se recorren completas dentro del marco, sin comprimir toda la página en una miniatura. Las galerías de escritorio y presentación conservan su ajuste anterior. Se mantienen las flechas, los cinco puntos de navegación, la pausa, autoplay y swipe del carrusel.

Este cambio se incorpora al sitio local; no implica despliegue a producción.

Validación local: originales idénticos por SHA-256; build de Astro correcto; cinco imágenes cargadas y cero reconstrucciones HTML de Noticias en el DOM. Revisado a 1440 × 900 y 390 × 844: los cinco marcos comparten el mismo alto de teléfono, sin overflow horizontal. Navegación de las cinco vistas y desplazamiento por teclado comprobados; sin errores de consola en el preview compilado.

### Capturas originales de Eurotech Ecommerce — 10 de octubre de 2026

Se incorporan las seis imágenes únicas entregadas por el usuario, copiadas sin modificación a `public/images/works/eurotech/` y verificadas por SHA-256. Inicio, categoría Manuales, subcategoría Llaves combinadas y búsqueda corresponden a móvil (402 px de ancho); producto y Mi Cuenta/Pedidos corresponden a escritorio (1728 px). Las dos categorías repetidas en el mensaje se incluyen una sola vez. Estas seis escenas reemplazan los tres iframes de Ecommerce; Gestor Eurotech conserva su presentación independiente.

`WorkScene.device` identifica el dispositivo de cada captura, por lo que conserva su marco original al visitar el portfolio desde cualquier tamaño de pantalla. Las vistas largas son desplazables sin deformar la imagen: ventana móvil 430 × 932 y ventana de navegador 16:10. Las capturas móviles ya contienen su barra de estado; `DeviceFrame.capturedStatus` evita agregar otra. Las imágenes son referencias del diseño y no representan precios, stock ni pedidos actuales.

Se mantienen texto fijo, flechas, puntos, pausa y swipe. Los originales quedan disponibles completos dentro del marco mediante scroll o teclado. Este cambio se incorpora al sitio local; no implica publicación en producción.

Validación: build de Astro y `git diff --check` correctos; seis capturas cargadas y navegación comprobada a 1440 × 900, 390 × 844 y 320 × 740, sin overflow horizontal. Scroll por teclado comprobado y marcos correspondientes a cada original. Revisión visual de inicio, producto y pedidos en desktop y móvil; ninguna excepción de JavaScript durante la comprobación móvil. Evidencia en `output/playwright/eurotech-capturas-*`.


### Corrección del alto de las capturas móviles — 10 de octubre de 2026

La captura aportada por el usuario mostró que limitar únicamente la proporción del contenedor podía permitir que el contenido alargara el teléfono al cargar. `ScreenCapture` separa ahora la ventana de proporción fija del área desplazable: el área con la imagen queda posicionada dentro de la ventana, sin contribuir a su alto. Noticias mantiene la proporción 430 × 932 para las cinco vistas; las capturas desktop conservan 16 × 10 y las presentaciones no desplazables mantienen su comportamiento. La barra de scroll fina y el foco de teclado permiten recorrer el contenido dentro del marco.

Verificado en preview con las imágenes decodificadas, a 1440 × 900, 390 × 844 y 320 × 740: las cinco vistas mantienen el mismo alto de teléfono y no hay overflow horizontal. El scroll de lectura se comprobó con la rueda en escritorio y móvil de 390 px, sin cambiar el scroll de la página. Build correcto. Cambio local.


### Servidor activo y detección de cambios — 10 de octubre de 2026

El usuario confirmó que veía el problema en `http://127.0.0.1:4321/#trabajos`. Se reprodujo en ese servidor: el HTML tenía la nueva ventana de captura, pero el módulo CSS servido por Vite todavía contenía la versión anterior. Resultado: el contenedor usaba la proporción de la imagen completa, el marco se estiraba y la región aparecía centrada entre espacios blancos. La verificación anterior del preview compilado no demostraba el estado de este servidor.

Se reinició exclusivamente el servidor dev de este proyecto en 4321. `astro.config.mjs` habilita polling del watcher cada 300 ms para detectar los cambios del workspace en el volumen externo. Se verificó la actualización del CSS con una propiedad temporal sin efecto visual y su posterior retirada, sin reiniciar entre modificaciones. El servidor mantuvo el CSS vigente en ambos pasos.

Validación realizada directamente en 4321, con todas las imágenes cargadas, a 2448 × 1460 y 390 × 844: las cinco vistas de Noticias mantienen el mismo alto; las cuatro capturas móviles de Eurotech también mantienen el mismo alto, y sus dos vistas desktop conservan la ventana 16 × 10. Regiones desplazables dentro de cada marco, sin overflow horizontal ni desplazamiento de la página al usar la rueda dentro del teléfono. Evidencias: `output/playwright/{noticias,eurotech}-active-{2448,390}.png`. No se modificaron las imágenes originales ni se desplegó a producción.
## Distribución de teléfono y texto — 10 de octubre de 2026

Las escenas de teléfono usan una galería de hasta 440 px y una columna de texto de hasta 430 px, centradas como conjunto y separadas por 48–88 px en escritorio. La galería deja de reservar el 60 % del ancho para una interfaz estrecha. Se elimina el padding horizontal adicional de la escena en esta distribución; las flechas conservan su espacio en la galería.

`ProjectStory` declara la distribución inicial y `project-story.ts` la actualiza según el dispositivo de la escena activa. Eurotech conserva la galería amplia para producto y pedidos desktop y vuelve a la composición compacta para sus capturas móviles. Los estilos bajo 768 px conservan el apilado actual.

Verificado en el servidor activo `127.0.0.1:4321`: Tanzania a 2448, 1440, 1024, 768, 390 y 320 px; Eurotech al alternar móvil → desktop → móvil a 1440 px. Sin solapamiento entre columnas ni overflow horizontal. Evidencia en `output/playwright/works-layout-*.png`. Cambio local, sin publicación en producción.



### Controles internos debajo de la galería — 10 de octubre de 2026

Los puntos de navegación, la pausa y el contador se agrupan dentro de `story-gallery`, fuera del track de imágenes y debajo de la pantalla visible. Su posición vertical sigue el borde inferior real de la imagen escalada con 12 px de separación. La galería reserva 56 px para evitar superposición con el texto, incluidas las presentaciones largas en móvil. El footer externo conserva únicamente la indicación de scroll en escritorio. La navegación por teclado se escucha ahora en el grupo de controles.

Validado en el servidor activo 4321 a 1440, 390 y 320 px: controles centrados debajo de la imagen, sin superposición con la descripción ni overflow horizontal; cambio por puntos, contador y teclado operativos. Se revisaron Eurotech, Noticias, Shell y Café; Shell y Noticias también a 320 px. Build correcto.
## Modo claro y selección publicada — 10 de octubre de 2026

La presentación del portfolio usa tema claro en los ocho proyectos restantes, incluidos los marcos de navegador, controles y fondo de Shell. Las capturas originales mantienen sus propios colores. Contacto y el footer también adoptan fondo claro y textos oscuros; el documento declara `color-scheme: light`.

Las Mil Novedades y The Legend Bots se retiran de la selección visible y de su navegación. Se conservan las referencias y componentes fuente para recuperación. La selección vigente es Eurotech Ecommerce, Eurotech Gestor, Aclimatar Café, Aclimatar Tanzania, Shell Puntos, West, Kronos OCR y 100% Noticias.

Build y diff check correctos. Validación local a 1440, 390 y 320 px, incluso con preferencia oscura del sistema: ocho proyectos y marcos claros, Contacto/footer claros, sin overflow horizontal ni excepciones de JavaScript.

Publicado el 10 de octubre de 2026 mediante Vercel en el proyecto `neuraz-web`: `dpl_DzoWga7qtnyBTXt9W1obABxD8Nvm`, estado Ready. `neuraz.ar` y `www.neuraz.ar` apuntan a esta versión. Verificación pública: ocho proyectos, ninguna sección de los dos retirados, todos con tema claro; Tanzania y Contacto comprobados a 1440 y 390 px, sin overflow horizontal. `www.neuraz.ar` redirige al dominio principal. Evidencia en `output/playwright/production-works-light-*.png`.


## Fondos y líneas de proyectos — 10 de octubre de 2026

Los proyectos reutilizan las líneas punteadas de Servicios en dirección horizontal. Sus fondos usan degradados suaves con colores representativos de las pantallas y logos: Eurotech rojo, Gestor rojo oscuro, Café verde, Tanzania terracota, Shell rojo, West amarillo, Kronos violeta y Noticias rojo. La base del portfolio coincide con el navbar (`#fafafa`).

El carrusel horizontal comparte una única capa de fondo. Su color se interpola según la posición real del desplazamiento, sin bordes entre proyectos. Los degradados se desvanecen en los extremos de Hero, Servicios, Trabajos y Nosotros para evitar cortes entre secciones. Se retiró por completo el desenfoque de movimiento solicitado inicialmente; las pantallas y textos permanecen nítidos durante el desplazamiento.

Validación local en el servidor activo 4321: escritorio 1440 × 900, móvil 390 × 844 y ancho estrecho 320 px; sin overflow horizontal ni excepciones de JavaScript. Interpolación de colores, movimiento lateral de las líneas y preferencias de movimiento reducido comprobados. Build de Astro y diff check correctos. Evidencias en `output/playwright/projects-background-blend-*` y `output/playwright/transition-*`.

### Publicación y comprobación pública

Publicado el 10 de octubre de 2026 en el proyecto Vercel `neuraz-web`, deployment `dpl_2BPXoDQ92jJJEqKw4ARh1JEhWu37`, estado Ready. El código publicado corresponde al commit `fe4218e`, subido a `origin/master`. Los dominios `neuraz.ar` y `www.neuraz.ar` apuntan a esta versión; www redirige al dominio principal.

Comprobado directamente en `https://neuraz.ar/`: HTTP 200, ocho proyectos con líneas horizontales, fondo compartido y ausencia del filtro de desenfoque de movimiento. En 1440 × 900 y 390 × 844 se verificaron colores intermedios al deslizar, máscaras suaves en las uniones Servicios/Trabajos y Trabajos/Nosotros, y ausencia de overflow horizontal, excepciones JavaScript y recursos públicos fallidos. Evidencias locales en `output/playwright/production-release-*`, incluido `production-release-validation.json`.
