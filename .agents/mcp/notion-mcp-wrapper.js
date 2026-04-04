#!/usr/bin/env node
/**
 * MCP Wrapper para Notion
 * 
 * Este script actúa como bridge entre el agente de código y la API de Notion.
 * Lee el NOTION_API_KEY del entorno y ejecuta el MCP server de Notion.
 */

const { spawn } = require('child_process');
const path = require('path');

const NOTION_API_KEY = process.env.NOTION_API_KEY;

if (!NOTION_API_KEY) {
  console.error('Error: NOTION_API_KEY no está configurado');
  console.error('Asegúrate de que la variable de entorno esté definida');
  process.exit(1);
}

// Ejecutar el MCP server de Notion
const notionMcp = spawn('npx', ['-y', '@notionhq/notion-mcp-server'], {
  stdio: ['inherit', 'inherit', 'inherit'],
  env: {
    ...process.env,
    NOTION_API_KEY: NOTION_API_KEY,
    NOTION_VERSION: '2022-06-28'
  }
});

notionMcp.on('error', (err) => {
  console.error('Error al ejecutar el MCP server de Notion:', err);
  process.exit(1);
});

notionMcp.on('close', (code) => {
  process.exit(code);
});
