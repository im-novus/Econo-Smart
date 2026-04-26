"""
Econo Smart - Backend FastAPI
Sistema inteligente para PyMEs: KPIs financieros + Recomendaciones IA (Gemini)
"""
import os
import uuid
import logging
from pathlib import Path
from datetime import datetime, timezone, timedelta
from typing import Optional, List

import requests
from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Cookie, Header
from dotenv import load_dotenv
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient
from pydantic import BaseModel, Field, ConfigDict

from emergentintegrations.llm.chat import LlmChat, UserMessage

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / '.env')

# MongoDB
mongo_url = os.environ['MONGO_URL']
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ['DB_NAME']]

GEMINI_API_KEY = os.environ.get('GEMINI_API_KEY', '')

app = FastAPI(title="Econo Smart API")
api_router = APIRouter(prefix="/api")

logging.basicConfig(level=logging.INFO,
                    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# ============== MODELS ==============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BusinessData(BaseModel):
    model_config = ConfigDict(extra="ignore")
    business_id: str = Field(default_factory=lambda: f"biz_{uuid.uuid4().hex[:12]}")
    user_id: str
    business_name: str
    business_type: str  # tienda, restaurante, servicios, manufactura, ecommerce, salud
    monthly_sales: float
    fixed_costs: float
    cost_per_unit: float
    sale_price: float
    quantity_sold: int
    inventory: int
    updated_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


class BusinessDataInput(BaseModel):
    business_name: str
    business_type: str
    monthly_sales: float
    fixed_costs: float
    cost_per_unit: float
    sale_price: float
    quantity_sold: int
    inventory: int


class SimulationInput(BaseModel):
    price_change_pct: float = 0     # ej. 10 = +10%
    cost_change_pct: float = 0      # ej. -5 = -5%
    quantity_change_pct: float = 0
    fixed_cost_change_pct: float = 0


# ============== AUTH HELPERS ==============

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None)
) -> User:
    """Get authenticated user from cookie or Authorization header."""
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()

    if not token:
        raise HTTPException(status_code=401, detail="No session token")

    session_doc = await db.user_sessions.find_one({"session_token": token}, {"_id": 0})
    if not session_doc:
        raise HTTPException(status_code=401, detail="Invalid session")

    expires_at = session_doc.get("expires_at")
    if isinstance(expires_at, str):
        expires_at = datetime.fromisoformat(expires_at)
    if expires_at and expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)
    if expires_at and expires_at < datetime.now(timezone.utc):
        raise HTTPException(status_code=401, detail="Session expired")

    user_doc = await db.users.find_one({"user_id": session_doc["user_id"]}, {"_id": 0})
    if not user_doc:
        raise HTTPException(status_code=401, detail="User not found")

    if isinstance(user_doc.get("created_at"), str):
        user_doc["created_at"] = datetime.fromisoformat(user_doc["created_at"])
    return User(**user_doc)


# ============== AUTH ROUTES ==============

@api_router.post("/auth/session")
async def auth_session(request: Request, response: Response):
    """Process session_id from Emergent Auth and create our session."""
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

    # Call Emergent Auth to get user data
    try:
        r = requests.get(
            "https://demobackend.emergentagent.com/auth/v1/env/oauth/session-data",
            headers={"X-Session-ID": session_id},
            timeout=15
        )
        if r.status_code != 200:
            raise HTTPException(status_code=401, detail="Invalid session_id")
        data = r.json()
    except requests.RequestException as e:
        logger.error(f"Emergent Auth error: {e}")
        raise HTTPException(status_code=502, detail="Auth provider unreachable")

    email = data["email"]
    name = data.get("name", email)
    picture = data.get("picture")
    session_token = data["session_token"]

    # Upsert user
    existing = await db.users.find_one({"email": email}, {"_id": 0})
    if existing:
        user_id = existing["user_id"]
        await db.users.update_one(
            {"user_id": user_id},
            {"$set": {"name": name, "picture": picture}}
        )
    else:
        user_id = f"user_{uuid.uuid4().hex[:12]}"
        await db.users.insert_one({
            "user_id": user_id,
            "email": email,
            "name": name,
            "picture": picture,
            "created_at": datetime.now(timezone.utc).isoformat()
        })

    # Save session (7 days)
    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    # Set httpOnly cookie
    response.set_cookie(
        key="session_token",
        value=session_token,
        max_age=7 * 24 * 60 * 60,
        path="/",
        httponly=True,
        secure=True,
        samesite="none"
    )

    return {"user_id": user_id, "email": email, "name": name, "picture": picture}


@api_router.get("/auth/me")
async def auth_me(request: Request,
                  session_token: Optional[str] = Cookie(None),
                  authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    return {
        "user_id": user.user_id,
        "email": user.email,
        "name": user.name,
        "picture": user.picture
    }


@api_router.post("/auth/logout")
async def auth_logout(response: Response,
                      session_token: Optional[str] = Cookie(None),
                      authorization: Optional[str] = Header(None)):
    token = session_token
    if not token and authorization and authorization.startswith("Bearer "):
        token = authorization.replace("Bearer ", "").strip()
    if token:
        await db.user_sessions.delete_one({"session_token": token})
    response.delete_cookie("session_token", path="/")
    return {"ok": True}


# ============== CALCULATIONS ==============

def compute_kpis(d: dict) -> dict:
    """Calcula los KPIs financieros base."""
    price = float(d.get("sale_price", 0))
    cost = float(d.get("cost_per_unit", 0))
    qty = int(d.get("quantity_sold", 0))
    fixed = float(d.get("fixed_costs", 0))
    inventory = int(d.get("inventory", 0))

    revenue = price * qty
    variable_costs = cost * qty
    total_costs = fixed + variable_costs
    profit = revenue - total_costs
    margin = (profit / revenue) if revenue > 0 else 0
    contribution_margin = price - cost
    breakeven_units = (fixed / contribution_margin) if contribution_margin > 0 else None
    breakeven_revenue = breakeven_units * price if breakeven_units else None
    inventory_turnover_ratio = (qty / inventory) if inventory > 0 else None
    inventory_high = (inventory > qty * 1.5) if qty > 0 else False

    # Health status
    if profit < 0:
        status = "loss"  # rojo
        status_label = "En pérdidas"
    elif margin < 0.20:
        status = "risk"  # amarillo
        status_label = "En riesgo"
    else:
        status = "healthy"  # verde
        status_label = "Saludable"

    # Quick rule-based hints
    rule_hints = []
    if profit < 0:
        rule_hints.append("Tu negocio está en pérdida, reduce gastos urgentemente.")
    if margin < 0.20 and profit >= 0:
        rule_hints.append("Considera aumentar precios o reducir costos.")
    if inventory_high:
        rule_hints.append("Reduce inventario o implementa promociones.")
    if not rule_hints:
        rule_hints.append("Tu negocio es saludable. Mantén el ritmo.")

    return {
        "revenue": round(revenue, 2),
        "variable_costs": round(variable_costs, 2),
        "fixed_costs": round(fixed, 2),
        "total_costs": round(total_costs, 2),
        "profit": round(profit, 2),
        "margin": round(margin, 4),
        "contribution_margin_per_unit": round(contribution_margin, 2),
        "breakeven_units": round(breakeven_units, 2) if breakeven_units else None,
        "breakeven_revenue": round(breakeven_revenue, 2) if breakeven_revenue else None,
        "inventory_turnover_ratio": round(inventory_turnover_ratio, 2) if inventory_turnover_ratio else None,
        "inventory_high": inventory_high,
        "status": status,
        "status_label": status_label,
        "rule_hints": rule_hints,
    }


# ============== BUSINESS DATA ROUTES ==============

@api_router.post("/business")
async def save_business(input: BusinessDataInput, request: Request,
                        session_token: Optional[str] = Cookie(None),
                        authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)

    existing = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    now_iso = datetime.now(timezone.utc).isoformat()

    if existing:
        update_doc = input.model_dump()
        update_doc["updated_at"] = now_iso
        await db.businesses.update_one({"user_id": user.user_id}, {"$set": update_doc})
        biz = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    else:
        biz = {
            "business_id": f"biz_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            **input.model_dump(),
            "updated_at": now_iso,
        }
        await db.businesses.insert_one(biz.copy())

    biz["kpis"] = compute_kpis(biz)
    return biz


@api_router.get("/business")
async def get_business(request: Request,
                       session_token: Optional[str] = Cookie(None),
                       authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    biz = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    if not biz:
        return {"business": None}
    biz["kpis"] = compute_kpis(biz)
    return {"business": biz}


@api_router.post("/business/calculate")
async def calculate_only(input: BusinessDataInput):
    """Calcula KPIs sin guardar (preview en formulario)."""
    return compute_kpis(input.model_dump())


@api_router.post("/business/simulate")
async def simulate(sim: SimulationInput, request: Request,
                   session_token: Optional[str] = Cookie(None),
                   authorization: Optional[str] = Header(None)):
    """Simula cambios sobre el negocio guardado."""
    user = await get_current_user(request, session_token, authorization)
    biz = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    if not biz:
        raise HTTPException(status_code=404, detail="No business data")

    sim_data = {
        **biz,
        "sale_price": biz["sale_price"] * (1 + sim.price_change_pct / 100),
        "cost_per_unit": biz["cost_per_unit"] * (1 + sim.cost_change_pct / 100),
        "quantity_sold": int(biz["quantity_sold"] * (1 + sim.quantity_change_pct / 100)),
        "fixed_costs": biz["fixed_costs"] * (1 + sim.fixed_cost_change_pct / 100),
    }

    return {
        "current": compute_kpis(biz),
        "simulated": compute_kpis(sim_data),
        "changes": sim.model_dump(),
    }


# ============== AI ANALYSIS (Gemini) ==============

def _format_currency(v: float) -> str:
    try:
        return f"${v:,.2f}"
    except Exception:
        return str(v)


@api_router.post("/business/analyze")
async def ai_analyze(request: Request,
                     session_token: Optional[str] = Cookie(None),
                     authorization: Optional[str] = Header(None)):
    """Genera análisis y recomendaciones IA usando Gemini."""
    user = await get_current_user(request, session_token, authorization)
    biz = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    if not biz:
        raise HTTPException(status_code=404, detail="No business data")

    kpis = compute_kpis(biz)

    if not GEMINI_API_KEY:
        # Fallback rule-based si no hay clave
        return {
            "summary": "Análisis basado en reglas (sin IA configurada).",
            "recommendations": [{"title": "Recomendación", "detail": h, "priority": "media"}
                                for h in kpis["rule_hints"]],
            "kpis": kpis,
            "ai": False,
        }

    system_message = (
        "Eres un consultor financiero experto especializado en PyMEs latinoamericanas. "
        "Tu trabajo es analizar datos financieros y dar recomendaciones MUY claras, prácticas y accionables, "
        "evitando jerga contable. Usa tono cercano y motivador. "
        "SIEMPRE respondes en español y SIEMPRE en formato JSON válido siguiendo este esquema EXACTO:\n"
        "{\n"
        '  "summary": "diagnóstico claro del estado del negocio en 2-3 oraciones",\n'
        '  "strengths": ["fortaleza 1", "fortaleza 2"],\n'
        '  "risks": ["riesgo 1", "riesgo 2"],\n'
        '  "recommendations": [\n'
        '    {"title": "titulo corto","detail":"acción específica con números si aplica","priority":"alta|media|baja","impact":"qué mejora si lo aplica"}\n'
        "  ],\n"
        '  "next_30_days": ["acción concreta 1", "acción concreta 2", "acción concreta 3"]\n'
        "}\n"
        "Devuelve ÚNICAMENTE el JSON, sin texto adicional, sin bloques de código."
    )

    prompt = f"""Analiza este negocio:

NEGOCIO: {biz['business_name']} (Tipo: {biz['business_type']})

DATOS DE ENTRADA:
- Ventas mensuales reportadas: {_format_currency(biz['monthly_sales'])}
- Costos fijos mensuales: {_format_currency(biz['fixed_costs'])}
- Costo por unidad: {_format_currency(biz['cost_per_unit'])}
- Precio de venta: {_format_currency(biz['sale_price'])}
- Cantidad vendida al mes: {biz['quantity_sold']} unidades
- Inventario actual: {biz['inventory']} unidades

KPIs CALCULADOS:
- Ingresos: {_format_currency(kpis['revenue'])}
- Costos variables: {_format_currency(kpis['variable_costs'])}
- Costos totales: {_format_currency(kpis['total_costs'])}
- Utilidad: {_format_currency(kpis['profit'])}
- Margen de ganancia: {kpis['margin']*100:.1f}%
- Margen de contribución por unidad: {_format_currency(kpis['contribution_margin_per_unit'])}
- Punto de equilibrio: {kpis['breakeven_units']} unidades
- Estado: {kpis['status_label']}
- Inventario alto: {"sí" if kpis['inventory_high'] else "no"}

Genera el análisis en JSON exacto."""

    try:
        chat = LlmChat(
            api_key=GEMINI_API_KEY,
            session_id=f"analyze_{user.user_id}_{uuid.uuid4().hex[:6]}",
            system_message=system_message,
        ).with_model("gemini", "gemini-2.5-flash")

        response = await chat.send_message(UserMessage(text=prompt))
        text = response.strip()
        # Limpia bloques de código si los hubiera
        if text.startswith("```"):
            text = text.strip("`")
            if text.startswith("json"):
                text = text[4:]
            text = text.strip()
        import json
        parsed = json.loads(text)
    except Exception as e:
        logger.error(f"Gemini error: {e}")
        return {
            "summary": "No fue posible obtener análisis IA. Mostramos recomendaciones basadas en reglas.",
            "strengths": [],
            "risks": [],
            "recommendations": [{"title": "Recomendación", "detail": h, "priority": "media",
                                 "impact": ""} for h in kpis["rule_hints"]],
            "next_30_days": [],
            "kpis": kpis,
            "ai": False,
            "error": str(e),
        }

    parsed["kpis"] = kpis
    parsed["ai"] = True
    return parsed


# ============== SAMPLE DATA ==============

SAMPLE_BUSINESS = {
    "business_name": "Cafetería La Esquina",
    "business_type": "restaurante",
    "monthly_sales": 85000,
    "fixed_costs": 22000,
    "cost_per_unit": 35,
    "sale_price": 75,
    "quantity_sold": 1200,
    "inventory": 400,
}

@api_router.post("/business/sample")
async def load_sample(request: Request,
                      session_token: Optional[str] = Cookie(None),
                      authorization: Optional[str] = Header(None)):
    """Carga datos de ejemplo para el usuario."""
    user = await get_current_user(request, session_token, authorization)
    now_iso = datetime.now(timezone.utc).isoformat()

    existing = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    if existing:
        await db.businesses.update_one(
            {"user_id": user.user_id},
            {"$set": {**SAMPLE_BUSINESS, "updated_at": now_iso}}
        )
    else:
        await db.businesses.insert_one({
            "business_id": f"biz_{uuid.uuid4().hex[:12]}",
            "user_id": user.user_id,
            **SAMPLE_BUSINESS,
            "updated_at": now_iso,
        })

    biz = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    biz["kpis"] = compute_kpis(biz)
    return biz


@api_router.get("/")
async def root():
    return {"message": "Econo Smart API", "status": "ok"}


# Include router
app.include_router(api_router)

app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=os.environ.get('CORS_ORIGINS', '*').split(','),
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("shutdown")
async def shutdown_db_client():
    client.close()
