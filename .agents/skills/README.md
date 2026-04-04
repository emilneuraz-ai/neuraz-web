# Skills disponibles para agentes de código

Este directorio contiene referencias a skills de ClawHub que los agentes de código pueden usar.

## Skills instaladas

### Astro
- **astro-advanced**: Construcción, configuración y troubleshooting de proyectos Astro
- Ubicación: `~/.openclaw/workspace/skills/astro-advanced/SKILL.md`

### Tailwind CSS  
- **shadcn-tailwind**: Tailwind v4 + shadcn/ui, CSS variables, OKLCH colors, dark mode
- Ubicación: `~/.openclaw/workspace/skills/shadcn-tailwind/SKILL.md`

- **lb-tailwindcss-skill**: Documentación completa de Tailwind CSS
- Ubicación: `~/.openclaw/workspace/skills/lb-tailwindcss-skill/SKILL.md`

### Frontend
- **frontend**: Frontend development con React, Next.js, Tailwind CSS
- Ubicación: `~/.openclaw/workspace/skills/frontend/SKILL.md`

### Design Systems
- **distinctive-design-systems**: Design systems con personalidad, tokens, tipografía
- Ubicación: `~/.openclaw/workspace/skills/distinctive-design-systems/SKILL.md`

## Uso

Los agentes de código deben leer el SKILL.md correspondiente antes de implementar:

```
read ~/.openclaw/workspace/skills/astro-advanced/SKILL.md
read ~/.openclaw/workspace/skills/shadcn-tailwind/SKILL.md
```

## Conexión MCP

El archivo `.agents/mcp.json` configura la conexión con Notion para que el agente pueda:
- Leer contenido del proyecto "Neuraz web"
- Acceder a la base de datos de Branding
- Consultar servicios y contenido institucional
