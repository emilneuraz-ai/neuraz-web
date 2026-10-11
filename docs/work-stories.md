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

## Correcciones de revisión móvil y botones — 11 de octubre de 2026

Se retiró la barra superior de cada proyecto (Proyectos / Behance / cerrar). El enlace a Behance pasa al pie, únicamente para proyectos con URL existente; el nombre visible mantiene la referencia accesible del proyecto. Arriba y abajo del carrusel hay zonas externas a las capturas para deslizar hacia Servicios o Nosotros, además de poder tocar sus enlaces.

En móvil la galería reserva el alto de la pantalla realmente renderizada y su margen de sombra, con un límite calculado después de reservar el texto, los controles y el pie. La tipografía de proyectos baja a 24 px para títulos y 13 px para descripciones. Las capturas largas de Café usan una ventana de escritorio 16:10 desplazable, conservando los archivos originales, y llegan a 301 px de ancho en un viewport de 393 px. Las sombras móviles se ajustan al espacio disponible dentro de cada escena.

Hero incorpora un degradado naranja y al final una fila de Servicios, Proyectos y El equipo. Se retira el enlace anterior sobre el logo. Según la referencia del usuario, los botones tienen forma de cápsula: Servicios negro pleno, Proyectos y Behance con contorno; El equipo permanece como enlace. Nosotros reduce su título móvil y “Algo nuevo.” en Contacto usa naranja.

Se redibujaron los ocho SVG de servicios: flujo de tareas, conversaciones, fidelización, juegos, contenido, agentes, documentos y capacitación, con interfaces, conexiones, detalles y animaciones propias. Las ilustraciones compactas usan 120 px de alto y las animaciones de servicios inactivos se pausan; se respeta movimiento reducido.

El inicio de Tanzania recupera el bloque informativo y el desplegable “Show more” de `src/views/Home.tsx` en el proyecto original `/Volumes/Emil/neuraz/projects/aclimatar/aclimatar-tanzania`. Esa versión no contiene preguntas de FAQ. Se compacta la pantalla inicial y el contenido ampliado puede desplazarse dentro del teléfono.

En iOS el logo conserva la malla GLB cerrada con espesor real, evitando la superficie fluida animada; mantiene arrastre, cambios de material y una ligera inclinación inicial. Comprobado con user agent de iPhone en Chromium: canvas activo, poster oculto, estado `sculpted` y respuesta al arrastre. Esto no constituye una prueba en Safari ni en un iPhone físico.

Validación: build de Astro y diff check; ocho proyectos a 320×740, 393×852 y 1440×900, más movimiento reducido. Textos y pies completos, referencias accesibles válidas, sin barra superior ni overflow horizontal. Comprobación adicional en el servidor activo 4321: gesto táctil de salida hacia ambas secciones, scroll interno de capturas sin desplazar la página, desplegable de Tanzania y el octavo SVG en la página de capacitación. Evidencias en `output/playwright/comments-responsive-check.json`, `comments-active-check.json` y capturas `comments-*`. Los cambios de esta revisión permanecen locales.

La barra opcional de desarrollo de Astro devolvía `504 Outdated Optimize Dep` en 4321 incluso después de reiniciar y regenerar la caché de Vite. Se desactivó para el usuario en este proyecto mediante `npm run astro -- preferences disable devToolbar`; es una preferencia local y no cambia la compilación pública ni los controles del sitio. La caché anterior de Vite quedó respaldada en `/tmp/neuraz-vite-cache-20261011-0945`.

### Ajustes de espaciado y contraste — 11 de octubre de 2026

Los botones del Hero se agrupan al inicio de la fila móvil con 6–8 px entre ellos y menos espacio inferior. Las zonas de salida del carrusel tienen una línea divisora hacia el área de proyectos, arriba y abajo. Los antetítulos de los ocho proyectos se ocultan únicamente en móvil.

Todo el texto de Contacto pasa a negro, incluido “Algo nuevo.”, reemplazando el naranja de la revisión anterior. Contacto deja de recibir el desvanecimiento de contenido al entrar en pantalla en móvil para que su texto conserve el negro durante la transición.

Build y diff check correctos. Verificado en localhost:4321 a 320×740, 393×852 y 1440×900: tres enlaces en una fila sin overflow, divisores móviles visibles, antetítulos ocultos en móvil y conservados en escritorio, y Contacto con texto negro y opacidad completa. Sin errores de navegador. Evidencia en `output/playwright/spacing-review-check.json` y capturas `spacing-review-*`. Cambios locales.

Los enlaces del Hero se ubican ahora inmediatamente después del párrafo, antes del render en móvil y debajo del texto en escritorio. Servicios usa una flecha hacia la derecha (`→`). La fila conserva el espaciado compacto y los botones redondeados. Verificado en 4321 a 320, 393, 768 y 1440 px: sin solapamiento ni overflow, tres enlaces en una fila y navegación a Servicios operativa; sin errores de navegador. Build y diff check correctos. Evidencia en `output/playwright/hero-actions-position-check.json` y capturas `hero-actions-position-*`. Cambio local.

Los bordes móviles se trasladan desde los enlaces de salida a la parte superior e inferior de `story-body`, cubriendo todo el ancho de pantalla y dejando Behance fuera del área delimitada. Se retiran los divisores cortos anteriores. Las flechas de Behance bajan de 22 a 14 px y la de WhatsApp de 25 a 18 px, conservando el tamaño de los botones. Build y diff check correctos; los ocho proyectos comprobados a 320, 393 y 1440 px, sin recortes de texto ni overflow, con navegación de salida operativa y sin errores de navegador. Evidencia en `output/playwright/project-borders-check.json` y capturas `project-borders-*`. Cambios locales.

### Gestos y controles de proyectos — 11 de octubre de 2026

El swipe horizontal sobre la zona de pantallas cambia de proyecto mediante la navegación externa. Se elimina el gesto que cambiaba las vistas internas. Las dos flechas de pantalla se agrupan a la izquierda de los puntos, en la fila de pausa y contador; los puntos pasan a indicadores sin acción, con centros separados por 12 px. Se mantienen la reproducción automática, la pausa y el control por teclado.

En móvil, una fila superior de 40 px queda fuera de la zona delimitada por las líneas; los enlaces de salida cubren todo el ancho. Cualquier gesto vertical o scroll sobre la franja superior lleva a Servicios, y la franja inferior o el pie del proyecto llevan a Nosotros. Los bordes de la zona central tienen los mismos extremos y el contenido usa márgenes laterales iguales. Behance baja a 36 px de alto, con texto de 11 px y 12 px de separación respecto de la línea; el ajuste de escala reserva el espacio adicional.

Validación en 4321 con eventos táctiles nativos de Chromium: swipe sobre los renders Kronos → Noticias → Kronos sin cambiar las pantallas internas, flechas siguiente/anterior operativas, salida superior con gesto y rueda, y salida inferior con gesto. Ocho proyectos comprobados a 320, 393 y 1440 px: texto completo, pies fuera de la zona delimitada y sin overflow. Build y diff check correctos; sin errores de navegador. Evidencia en `output/playwright/project-gestures-check.json`, `project-borders-check.json` y capturas `project-gestures-*`. Cambios locales.

### Flechas, marcos de navegador y Behance — 11 de octubre de 2026

Los tres enlaces del Hero usan la misma flecha hacia la derecha. Los marcos de navegador se compactan a 30 px de alto en escritorio y 20 px en móvil; se reducen en proporción los puntos de ventana, el campo de dirección, la etiqueta y el menú.

Behance queda dentro de la zona delimitada: el borde inferior pasa al final del pie, con 12 px de espacio alrededor del botón. El pie participa del swipe horizontal entre proyectos; las franjas externas de Servicios y Nosotros conservan los gestos de salida. Esto reemplaza la ubicación de Behance fuera de los divisores de la revisión anterior.

Build y diff check correctos. Ocho proyectos verificados a 320, 393 y 1440 px: botón dentro de los bordes, texto completo, barras compactas y sin overflow ni errores de navegador. Gesto táctil sobre el pie de Kronos comprobado hacia West. Evidencia en `output/playwright/project-frame-refinements-check.json` y captura `project-frame-refinements-cafe.png`. Cambios locales.

## Publicación de las revisiones móviles — 11 de octubre de 2026

Las revisiones acumuladas se subieron a `origin/master` y se publicaron en el proyecto Vercel `neuraz-web`. Código publicado: `3d57a3a`; deployment `dpl_84AgxdwKH9DY1NsYy5HPC7sZ9JJB`, estado Ready. Se desplegó una copia de los archivos versionados de ese commit. Vercel confirma que `neuraz.ar` y `www.neuraz.ar` apuntan a esta versión; www redirige al dominio principal.

Comprobación pública en navegador a 320×740, 393×852 y 1440×900: Hero con enlaces antes del render y flechas iguales, ocho proyectos con texto completo y Behance dentro de los divisores, barras de navegador compactas, y Contacto negro con el número actualizado y WhatsApp `543856260410`. En móvil se verificó el swipe horizontal entre proyectos, las flechas de las pantallas y los gestos de salida a Servicios y Nosotros. La página pública de capacitación conserva su ilustración. Sin overflow horizontal, errores de JavaScript ni recursos fallidos. Evidencia en `output/playwright/production-mobile-review-check.json` y capturas `production-mobile-review-*`.

## Proyectos a pantalla completa en móvil — 11 de octubre de 2026

En móvil el navbar se oculta durante el tramo de Proyectos y sus controles quedan inactivos; vuelve a mostrarse al salir hacia Servicios o Nosotros. El carrusel ocupa toda la altura de la pantalla, sin reservar los 80 px del navbar. Los cálculos de navegación, ajuste al proyecto y enlaces directos usan ese mismo origen. En escritorio el navbar conserva su espacio y permanece visible.

Behance pasa de la parte inferior a la esquina superior derecha de cada proyecto, con el texto “Ver en Behance”. Solo aparece cuando existe una URL. Se elimina el pie anterior y se reserva una fila superior dentro de los divisores; la franja de salida hacia Nosotros queda libre al final. El ajuste de las pantallas aprovecha el espacio recuperado y conserva los textos completos.

Build y diff check correctos. Validación local de los ocho proyectos en 320×740, 393×852, 1440×900 y 393×852 con movimiento reducido: texto completo, enlace superior, navbar oculto únicamente en los proyectos móviles y sin overflow ni errores de navegador. Gestos horizontales y salidas a ambas secciones comprobados; navbar visible después de cada salida. Enlace directo a Café abre el carrusel desde el borde superior de la pantalla. Evidencia en `output/playwright/project-fullscreen-check.json` y captura `project-fullscreen-cafe.png`. Cambios locales.

### Chevrones, navbar al desplazar y enlaces del equipo — 11 de octubre de 2026

Las franjas externas de Proyectos muestran solo botones circulares de 28 px con un chevrón hacia arriba para Servicios y hacia abajo para Nosotros. Se mantienen las etiquetas accesibles, enlaces y gestos en toda la franja.

Fuera del carrusel, el navbar móvil se oculta al bajar y reaparece al subir, con un umbral de 12 px para evitar cambios por pequeños movimientos. Permanece visible con el menú abierto y al comienzo de la página; en Proyectos sigue oculto durante todo el tramo. En escritorio permanece visible. Los enlaces del equipo usan círculos de 24 px e iconos de 12 px en móvil, y 28/14 px en escritorio.

Build y diff check correctos. Comprobado en 320, 393 y 1440 px: navbar según la dirección, menú y Escape operativos, chevrones con etiquetas accesibles, salidas por toque y gesto hacia ambas secciones, y enlaces del equipo más pequeños. Sin overflow ni errores de navegador. Evidencia en `output/playwright/mobile-chevron-header-check.json` y capturas `mobile-chevron-*`. Cambios locales.

## Publicación de proyectos a pantalla completa y navbar móvil — 11 de octubre de 2026

Los commits `e736b5f` y `e0bff28` se subieron a `origin/master`. Se desplegó una copia limpia de los archivos versionados de `e0bff2838b58f53a75503f4dc67617f0c4ffd5f9` en Vercel: deployment `dpl_G7rRWc2akfUfhy6ncNFVUpYS1nnM`, producción, estado Ready. Los alias `neuraz.ar` y `www.neuraz.ar` apuntan a esta versión.

Verificación pública en navegador a 320×740, 393×852 y 1440×900: navbar móvil oculto al bajar y visible al subir, menú operativo y navbar de escritorio visible. En 393 px, Proyectos ocupa los 852 px completos desde el borde superior; “Ver en Behance” aparece arriba a la derecha y no existe el pie anterior. Ambos chevrones navegan por toque y gesto a Servicios y Nosotros. Los enlaces del equipo conservan sus etiquetas accesibles con círculos e iconos reducidos. Sin overflow horizontal, errores de JavaScript ni recursos fallidos. Evidencia en `output/playwright/production-chevron-header-check.json` y capturas `production-chevron-project.png` y `production-chevron-team.png`.

## Unificación de Nosotros y El equipo — 11 de octubre de 2026

La presentación y los integrantes quedan reunidos bajo “El equipo”, con un único destino `#equipo` en el inicio de la sección. Se elimina Nosotros de los menús de escritorio y móvil, se actualiza el antetítulo y la salida inferior de Proyectos apunta a la misma sección con su etiqueta accesible. El enlace existente del Hero usa también ese destino.

Build y diff check correctos. Validación del build local en navegador a 1440×900, 393×852 y 320×740: menú con Servicios, Trabajos, El equipo y Contacto; un único ID equipo, dos integrantes, título visible al navegar, menú móvil cerrado tras seleccionar y ausencia de enlaces a Nosotros y overflow horizontal. La salida inferior de Proyectos llega a El equipo en ambos anchos móviles. Sin excepciones JavaScript. Capturas en `output/playwright/team-unify-local-*`.

Publicado el commit `4ec96cacbae69ec2a6b4df893979acf4ad696244`, subido a `origin/master`, desde una copia limpia de sus archivos versionados. Vercel: deployment `dpl_7UgYYyWgNRUuApaCCLexES2PR6eL`, producción, estado Ready; alias `neuraz.ar` y `www.neuraz.ar` confirmados.

Comprobación pública en navegador a 1440×900, 393×852 y 320×740: menú unificado, un único destino de sección, dos integrantes y navegación operativa desde el menú y la salida móvil de Proyectos. En escritorio, terminada la animación de desplazamiento, la sección comienza a 80 px y El equipo queda marcado como activo. Sin overflow horizontal, excepciones JavaScript ni respuestas HTTP fallidas; www redirige al dominio principal. Capturas en `output/playwright/team-unify-production-*`.

## Dominio institucional — 11 de octubre de 2026

Se actualizaron cuatro referencias al dominio anterior: las dos URLs de sitio en `public/mcp.md` y los metadatos Theme URI y Author URI del CSS público de la demo Eurotech. Todas apuntan ahora a `https://neuraz.ar/`; la configuración de Astro y el correo de contacto ya usaban el dominio vigente.

Revisión completa de los 1271 archivos versionados, incluidos archivos binarios, y del contenido de los ZIP públicos: ninguna referencia al dominio anterior tras la corrección. El build también queda libre de esas referencias. Build y diff check correctos.
