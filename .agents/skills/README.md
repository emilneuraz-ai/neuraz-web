# Skills de Agentes para Neuraz Web

Este directorio contiene skills que los agentes de código (Claude Code, Codex, Cursor, etc.) pueden usar para desarrollar el proyecto.

## Skills Instaladas

### Frameworks & UI
| Skill | Descripción | Fuente |
|-------|-------------|--------|
| `shadcn` | shadcn/ui - Componentes React con Tailwind | shadcn/ui (official) |
| `vercel-react-best-practices` | 62 reglas de React (performance, SSR, optimización) | Vercel Labs |
| `tailwind-design-system` | Design system con Tailwind v4, CSS-first, CVA | wshobson |
| `web-design-guidelines` | Guías de diseño web | Vercel Labs |

### Calidad Web (Addy Osmani)
| Skill | Descripción |
|-------|-------------|
| `accessibility` | Accesibilidad WCAG 2.2 |
| `best-practices` | Mejores prácticas web |
| `core-web-vitals` | Optimización Core Web Vitals |
| `performance` | Performance web |
| `seo` | SEO optimization |
| `web-quality-audit` | Auditoría de calidad web |

### Build Tools
| Skill | Descripción | Fuente |
|-------|-------------|--------|
| `vite` | Vite build tool best practices | Anthony Fu |

### Supabase (ya clonado en `supabase/`)
- Postgres best practices
- Edge Functions
- RLS (Row Level Security)

### UX/UI (ya clonado en `ux-ui/`)
- UX/UI Agent Skills
- Design systems
- Component engineering

## Uso

Los agentes de código detectan automáticamente estas skills en `.agents/skills/`.

Para usar una skill específica, el agente lee el archivo `SKILL.md` dentro de cada directorio.

## Instalación de nuevas skills

```bash
# Usando el CLI de Vercel Skills
npx skills add <owner/repo> --skill <skill-name> --all

# Ejemplo
npx skills add vercel-labs/agent-skills --skill vercel-react-best-practices --all
```

## Estructura

```
.agents/
├── mcp.json              # Configuración MCP para Notion
├── NOTION_CONFIG.md      # IDs de páginas y databases de Notion
└── skills/
    ├── README.md         # Este archivo
    ├── shadcn/           # shadcn/ui skill
    ├── supabase/         # Supabase agent skills
    ├── ux-ui/            # UX/UI agent skills
    └── ...               # Otras skills
```

## Conexión con Notion

El proyecto está conectado con Notion vía MCP:
- **Proyecto**: Neuraz web (ID: `333790d5-5c51-8023-b620-e7aef5dc851b`)
- **Servicios**: Database con 9 servicios
- **Branding**: Página vinculada para colores/logo

Ver `../NOTION_CONFIG.md` para más detalles.
