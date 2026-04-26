# Econo Smart - PRD

## Problem Statement (Original - Spanish)
Aplicación web "Econo Smart" - Sistema inteligente para PyMEs que permite ingresar datos financieros básicos y genera automáticamente análisis, indicadores clave y recomendaciones para mejorar la rentabilidad del negocio. Tipo: Dashboard SaaS moderno tipo fintech.

## User Personas
- Dueños de pequeñas y medianas empresas (PyMEs) en LATAM.
- Sin conocimientos profundos de finanzas o contabilidad.
- Buscan claridad y acciones concretas para mejorar la rentabilidad.

## Core Requirements (static)
- Login con Google (Emergent).
- Captura de datos financieros (negocio, ventas, costos, inventario).
- Cálculos automáticos: ingresos, costos variables/fijos, utilidad, margen, punto de equilibrio.
- Recomendaciones inteligentes con IA (Gemini 2.5 Flash con clave del usuario).
- Dashboard con KPIs, gráficos interactivos (Recharts), indicador visual de salud.
- Simulador de escenarios (precio, costo, cantidad, costos fijos).
- Datos de ejemplo precargados para demo.
- Diseño verde esmeralda + ámbar, responsive.

## What's Been Implemented (2026-04-26)
- Backend FastAPI:
  - `/api/auth/session`, `/api/auth/me`, `/api/auth/logout` (Emergent OAuth)
  - `/api/business` (GET/POST con KPIs)
  - `/api/business/calculate` (preview KPIs sin guardar)
  - `/api/business/simulate` (qué pasaría si...)
  - `/api/business/analyze` (recomendaciones IA con Gemini 2.5 Flash + fallback rule-based)
  - `/api/business/sample` (datos de ejemplo)
- Frontend React:
  - Login con Google
  - Dashboard con: Health indicator (verde/amarillo/rojo), 4 KPI cards, gráfico Recharts, panel de inventario, recomendaciones IA (con strengths, risks, plan 30 días), simulador con sliders.
  - Onboarding form con dropdown tipo negocio y validación.
  - AuthCallback handling (race-condition safe).
  - Diseño con paleta verde esmeralda (#1D9E75) + ámbar (#EF9F27).

## P0/P1/P2 Backlog
- P1: Histórico de meses anteriores y tendencias.
- P1: Comparativo vs. industria/benchmark.
- P2: Exportar reporte PDF de análisis.
- P2: Alertas por email cuando KPIs cambien.
- P2: Multi-negocio por usuario.

## Next Tasks
- Validar testing E2E con testing_agent_v3.
