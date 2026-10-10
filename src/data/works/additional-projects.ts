import type { WorkStory } from './types';
import sources from '../behance-projects.json';
function story(id:string,title:string,category:string,accent:string,behance:string,theme:'light'|'dark',format:'desktop'|'mobile',scenes:string[][]):WorkStory {
 return {id,title,category,accent,theme,format,url:sources.find(item=>item.id===behance)?.url,scenes:scenes.map(([id,label,eyebrow,title,description,detail])=>({id,label,eyebrow,title,description,detail}))};
}
export const gestor=story('eurotech-gestor','Eurotech Gestor','Producto digital · Gestión','#b90b08','255607819','light','desktop',[
 ['catalogo','Catálogo','Dos países, una operación','Todo el catálogo.\nUna sola mirada.','Un espacio de trabajo para organizar los productos de Argentina y Uruguay, conocer su estado y encontrar cada SKU.','Catálogo global / Búsqueda / Estados'],
 ['producto','Edición','Información de producto','Orden para\ncada detalle.','Contenido, clasificación y precios reunidos en una ficha. Una interfaz que acompaña las tareas del equipo comercial.','Ficha / Precios / Clasificación'],
 ['sync','Sincronización','Canales conectados','Del origen\na la tienda.','Una vista central para seguir las fuentes y revisar la sincronización de los productos entre canales.','Fuentes / Sincronización / Seguimiento']]);
export const cafe:WorkStory={
 id:'aclimatar-cafe',title:'Aclimatar Café',category:'World Coffee Research · UX/UI',accent:'#235647',theme:'light',format:'desktop',
 url:sources.find(item=>item.id==='223769785')?.url,
 scenes:[
  ['inicio','Inicio','inicio.jpg',2402,'El inicio conecta información climática con ensayos de variedades de café y permite elegir una localización.'],
  ['ubicacion','Mapa','mapa.jpg',991,'Selección de una localidad mediante coordenadas y cartografía para iniciar el análisis climático.'],
  ['dashboard','Dashboard','dashboard.png',2133,'Resumen de información climática, adaptación, gemelo climático y variedades globales.'],
  ['precipitaciones','Precipitaciones','precipitaciones.png',1185,'Comparación de la precipitación mensual para los períodos pasado, presente y futuro.'],
  ['temperatura','Temperatura','temperatura.png',1265,'Evolución mensual de las temperaturas máxima, media y mínima.'],
  ['riesgos','Riesgos climáticos','riesgos.png',1375,'Comparación de riesgos térmicos, sequía, precipitaciones intensas y riesgo para las personas.'],
 ].map(([id,label,file,height,description])=>({id:String(id),label:String(label),eyebrow:'Diseño original',title:String(label),description:String(description),detail:'World Coffee Research / Aclimatar',image:{src:`/images/works/aclimatar-cafe/${file}`,width:1730,height:Number(height),alt:`Aclimatar Café: pantalla original de ${label}`}}))
};
export const shell:WorkStory={
 id:'shell-puntos',title:'Shell Puntos',category:'App · Fidelización',accent:'#d72322',theme:'dark',format:'presentation',
 url:sources.find(item=>item.id==='240133227')?.url,
 scenes:[
  [1,'portada','Sistema de fidelización',950,'Presentación del sistema de fidelización de clientes Shell Puntos, con un teléfono sobre una caja roja y monedas.'],
  [2,'caja','Presentación',442,'Caja roja de Shell Puntos y teléfono con la campaña Navidad sobre ruedas.'],
  [4,'participacion','Participación',630,'Presentación de tickets, cupones digitales y puntos, con explicación del escaneo QR y la carga manual.'],
  [5,'premios','Premios',421,'Teléfono con la interfaz del catálogo de premios de Shell Puntos.'],
  [6,'multieventos','Sistema multieventos',488,'Campañas simultáneas de Shell Puntos y su presentación en la interfaz móvil.'],
  [8,'escaneo','Escaneo y carga manual',417,'Escaneo QR y carga manual de cupones digitales y tickets de compra.'],
  [9,'cargas','Mis cargas',405,'Historial de cargas, gasto total, filtros por fecha y puntos acumulados en las visitas a Shell.'],
  [10,'interfaces','UX/UI',1147,'Diseño de las pantallas móviles de ingreso, registro, inicio, historial y canje de premios.'],
  [11,'sistema-diseno','Sistema de diseño',868,'Documentación visual de escalas de espaciado, tipografía, colores y componentes.'],
  [12,'administracion','Administración',773,'Panel de administración para eventos, cupones, premios, canjes, reglas de puntuación, sorteos y usuarios.'],
 ].map(([file,id,label,height,alt],index)=>({id:String(id),label:String(label),eyebrow:'Presentación original',title:String(label),description:index===0?'Plataforma web para gestionar campañas de fidelización y sorteos. Los usuarios cargan tickets mediante QR o de forma manual, canjean cupones y acumulan puntos o chances para acceder a premios. El panel de administración reúne eventos, reglas de puntuación, canjes y sorteos.':'',detail:'Shell Puntos / UX/UI',image:{src:`/images/works/shell-puntos/presentacion-caja2_${String(file).padStart(2,'0')}.png`,width:446,height:Number(height),alt:String(alt)}}))
};
export const west=story('west','West','Identidad · Diseño web','#fbba28','233151769','light','desktop',[
 ['inicio','Inicio','Gestión inmobiliaria','Una dirección\npara invertir.','Una presencia digital que reúne gestión desarrollista e inmobiliaria con una identidad sobria y arquitectónica.','Identidad / Sitio web'],
 ['equipo','Equipo','Personas detrás de los proyectos','Confianza que\nse construye.','El equipo y su manera de trabajar toman protagonismo en un recorrido editorial con imágenes y tipografía.','Equipo / Presentación'],
 ['proceso','Proceso','De la idea al desarrollo','Cada etapa,\nun paso claro.','La presentación del proceso ordena el recorrido de un proyecto y acerca la propuesta de West a nuevos clientes.','Proceso / Desarrollo / Gestión']]);
export const kronos=story('kronos','Kronos OCR','Producto digital · Inteligencia artificial','#615fff','255626677','light','desktop',[
 ['flujos','Flujos','Del documento al dato','Leer. Extraer.\nEstructurar.','Flujos de extracción configurables para convertir documentos en información organizada.','OCR / Flujos / Documentos'],
 ['config','Configuración','Control sobre la extracción','Definir qué\nimporta.','El contexto y la estructura esperada conviven en un editor que permite preparar cada flujo de trabajo.','Contexto / Esquema / Prompt'],
 ['extraer','Extracción','Una herramienta para operar','Probar antes\nde integrar.','Un espacio para cargar documentos, revisar resultados y trabajar con funciones de procesamiento.','Archivo / Resultado / Funciones']]);
export const noticias:WorkStory={
 id:'noticias',title:'100% Noticias',category:'App de noticias · UX/UI',accent:'#ff1a23',theme:'dark',format:'mobile',
 url:sources.find(item=>item.id==='226355857')?.url,
 scenes:[
  ['portada','Portada','home.png',7303,'Una portada móvil que organiza las noticias, destaca las emisiones en vivo y da jerarquía al contenido.'],
  ['temas','Categoría','category.png',3238,'La navegación por categorías reúne las noticias y permite recorrer la información por temática.'],
  ['lectura','Lectura','single.png',5540,'La pantalla de lectura reúne el artículo, los contenidos multimedia y las noticias relacionadas.'],
  ['ajustes','Ajustes','settings.png',932,'La pantalla de ajustes reúne el modo de visualización y los accesos a alertas, privacidad, contacto y archivo.'],
  ['alertas','Alertas','alerts.png',1370,'Las preferencias de alertas permiten seleccionar los temas sobre los que recibir actualizaciones.'],
 ].map(([id,label,file,height,description])=>({id:String(id),label:String(label),eyebrow:'Diseño original',title:String(label),description:String(description),detail:'100% Noticias / UX/UI',image:{src:`/images/works/noticias/${file}`,width:430,height:Number(height),alt:`100% Noticias: pantalla original de ${label}`}}))
};
export const lmn=story('las-mil-novedades','Las Mil Novedades','Plataforma · Fidelización','#cfaa00','255628191','light','desktop',[
 ['inicio','Mi cuenta','Un vínculo que continúa','Volver tiene\nsu recompensa.','Un panel para consultar puntos, nivel y actividad dentro del sistema de asociados.','Cuenta / Puntos / Nivel'],
 ['canjes','Canjes','Beneficios para explorar','Los puntos\ntienen destino.','El catálogo de canjes acerca los premios y facilita entender la relación entre saldo y beneficios.','Premios / Puntos / Canjes'],
 ['actividad','Actividad','Todo en un lugar','La historia\nde cada compra.','El historial reúne movimientos y compras para que cada persona pueda seguir su participación.','Compras / Historial / Seguimiento']]);
export const legend=story('legend-bots','The Legend Bots','Web app · UX/UI','#d0ab67','125290655','dark','mobile',[
 ['inicio','Preparar','Una secuencia guiada','Preparar. Conectar.\nConfigurar.','El diseño ordena los pasos de incorporación antes de acceder a la operación del bot.','Onboarding / Autenticación / Conexión'],
 ['config','Configurar','Parámetros a la vista','Cada decisión,\nen su lugar.','Un formulario compacto reúne los parámetros del bot y permite revisar la configuración antes de activarlo.','Configuración / Límites / Revisión'],
 ['panel','Panel','Estado & seguimiento','Una vista\nde la operación.','Estado, parámetros e historial reunidos en un panel de seguimiento. Esta reconstrucción funciona únicamente como demostración visual.','Panel / Estado / Actividad']]);
