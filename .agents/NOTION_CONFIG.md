# Configuración de Notion para el proyecto Neuraz web

## Proyecto Principal
- **Nombre**: Neuraz web
- **ID**: `333790d5-5c51-8023-b620-e7aef5dc851b`
- **URL**: https://www.notion.so/Neuraz-web-333790d55c518023b620e7aef5dc851b

## Contenido disponible

### Páginas hijas del proyecto:
- **Branding Neuraz** (para definir: colores, tipografía, logo, dark/light mode)
  - ID: `338790d5-5c51-8199-8230-c35ebe8f3dcb`

### Contenido institucional (página "Institucional"):
- **ID**: `319790d5-5c51-805b-b984-f6ff92a443b0`
- Contiene:
  - Database "Servicios" (9 servicios de Neuraz)
  - Página "Equipo"
  - Página "Sobre Nosotros" 
  - Página "Contacto"

### Database de Servicios:
- **ID**: `5b9ff771-6190-4466-83d8-8866b5f48c84`
- Campos: Servicio, Descripción, Beneficio Clave, Categoría, Industrias Aplicables, Destacado

## IDs útiles para queries MCP

```json
{
  "proyecto_principal": "333790d5-5c51-8023-b620-e7aef5dc851b",
  "pagina_institucional": "319790d5-5c51-805b-b984-f6ff92a443b0",
  "database_servicios": "5b9ff771-6190-4466-83d8-8866b5f48c84",
  "branding": "338790d5-5c51-8199-8230-c35ebe8f3dcb"
}
```

## Ejemplo de uso con MCP

```javascript
// Leer proyecto
const proyecto = await notion.pages.retrieve({ 
  page_id: "333790d5-5c51-8023-b620-e7aef5dc851b" 
});

// Query servicios destacados
const servicios = await notion.databases.query({
  database_id: "5b9ff771-6190-4466-83d8-8866b5f48c84",
  filter: {
    property: "Destacado",
    checkbox: { equals: true }
  }
});
```
