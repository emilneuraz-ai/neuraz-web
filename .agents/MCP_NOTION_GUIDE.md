# Notion MCP Integration para Neuraz Web

## Estado de la conexión

✅ **MCP Configurado**: `.agents/mcp.json` apunta al wrapper de Notion
✅ **API Key**: Se obtiene de la variable de entorno `NOTION_API_KEY`
✅ **Versión API**: 2022-06-28

## Cómo usar el MCP desde el agente de código

El agente de código (Claude Code, Codex, etc.) puede usar el MCP server de Notion para:

1. **Leer páginas** del proyecto
2. **Query databases** (Servicios, Branding)
3. **Actualizar contenido** en Notion

### IDs clave para usar con MCP

```json
{
  "proyecto_neuraz_web": "333790d5-5c51-8023-b620-e7aef5dc851b",
  "database_servicios": "5b9ff771-6190-4466-83d8-8866b5f48c84",
  "pagina_branding": "338790d5-5c51-8199-8230-c35ebe8f3dcb",
  "pagina_institucional": "319790d5-5c51-805b-b984-f6ff92a443b0"
}
```

### Ejemplos de uso

#### Leer el proyecto principal
```typescript
// Usando MCP tool
const proyecto = await mcp.notion.notion.pages.retrieve({
  page_id: "333790d5-5c51-8023-b620-e7aef5dc851b"
});
```

#### Obtener servicios destacados
```typescript
const servicios = await mcp.notion.notion.databases.query({
  database_id: "5b9ff771-6190-4466-83d8-8866b5f48c84",
  filter: {
    property: "Destacado",
    checkbox: { equals: true }
  }
});
```

#### Leer página de Branding
```typescript
const branding = await mcp.notion.notion.pages.retrieve({
  page_id: "338790d5-5c51-8199-8230-c35ebe8f3dcb"
});
```

## Estructura de datos en Notion

### Proyecto "Neuraz web"
- **Status**: En progreso
- **Stack**: Astro + Tailwind CSS + Vercel
- **Repositorio**: https://github.com/emilneuraz-ai/neuraz-web
- **Dominio Vercel**: https://neuraz-web.vercel.app

### Database "Servicios" (9 servicios)
| Servicio | Categoría | Destacado |
|----------|-----------|-----------|
| Automatización de Flujos de Negocio | Automatización | ✅ |
| CRM con Atención Automática | Automatización | ❌ |
| Sistema de Puntos y Fidelización | Gamificación | ✅ |
| Juegos y Experiencias de Marca | Gamificación | ✅ |
| Generación Automática de Contenido con IA | IA | ❌ |
| Agentes de IA | IA | ✅ |
| Documentación Inteligente | Documentación | ✅ |
| Capacitaciones en IA y Automatización | IA | ❌ |
| Dashboards & Estadísticas en Tiempo Real | Análisis de datos | ✅ |

### Página "Branding Neuraz"
- Estado: Pendiente de definir
- Campos esperados: Colores, Tipografía, Logo, Dark/Light mode

## Troubleshooting

### Si el MCP no conecta:
1. Verificar que `NOTION_API_KEY` esté definido en el entorno
2. Verificar que el token tenga acceso al workspace de Notion
3. Revisar logs en `.agents/mcp/logs/`

### IDs de bases de datos de Neuraz:
- **Proyectos**: `317790d5-5c51-80da-81eb-f5960556038d`
- **Tareas Neury**: `338790d5-5c51-8144-b476-c71aa4642abb`
- **Stacks**: `338790d5-5c51-81ad-a3ad-f0792f3dab53`
