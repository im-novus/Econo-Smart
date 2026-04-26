# Econo Smart - PRD

## Problem Statement (Spanish)
Sistema inteligente para PyMEs que captura datos financieros y genera KPIs, dashboard, recomendaciones IA y herramientas de gestión.

## Core Requirements
- Login Google (Emergent OAuth)
- Captura de datos financieros del negocio
- Cálculos automáticos: ingresos, utilidad, margen, punto de equilibrio
- Dashboard con KPIs, gráficos, indicador de salud
- Recomendaciones IA (Gemini 2.5 Flash)
- Simulador de escenarios

## Implemented (2026-04-26)
### Iteration 1
- Auth Google + endpoints CRUD negocio + KPIs + simulador + IA Gemini
- Dashboard con 4 KPI cards, health indicator, gráfico Recharts, panel inventario, AI recomendaciones
- Onboarding form, datos de ejemplo precargados

### Iteration 2 (FIX + nuevas features)
- **Fix errores DOM Recharts:** isAnimationActive=false, key estable, notranslate meta tag, useMemo
- **Inventario completo:** página /inventario con tabla, búsqueda, alertas bajo stock, CRUD modal, sumarios (productos, unidades, valor a costo, potencial utilidad)
- **Histórico mensual:** snapshots automáticos al guardar negocio + gráfico de áreas Recharts (ingresos/utilidad)
- **Comparativo industria:** benchmarks por tipo de negocio + tarjeta visual
- **Exportar PDF:** botón que genera PDF del dashboard con jsPDF + html2canvas
- **Nav unificada** con AppShell (Dashboard, Inventario, Mi negocio)

## P0/P1/P2 Backlog
- P2: Multi-negocio por usuario (deferido)
- P2: Snapshots automáticos por cron mensual
- P2: Email/WhatsApp alertas semanales

## Test Credentials
Ver /app/memory/test_credentials.md - OAuth Google sin password.
