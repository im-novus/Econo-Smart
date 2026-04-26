"""
Econo Smart - Backend FastAPI
Sistema inteligente para PyMEs: KPIs financieros + Recomendaciones IA (Gemini)
+ Inventario + Histórico + Benchmarks de industria
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


# ============== INDUSTRY BENCHMARKS ==============
# Promedios típicos de la industria en LATAM (referenciales).
INDUSTRY_BENCHMARKS = {
    "tienda":      {"margin": 0.15, "label": "Tienda / Retail",          "inv_turnover": 6.0},
    "restaurante": {"margin": 0.12, "label": "Restaurante / Cafetería",  "inv_turnover": 12.0},
    "servicios":   {"margin": 0.30, "label": "Servicios profesionales",  "inv_turnover": 0.0},
    "manufactura": {"margin": 0.18, "label": "Manufactura / Taller",     "inv_turnover": 4.0},
    "ecommerce":   {"margin": 0.20, "label": "E-commerce / Online",      "inv_turnover": 8.0},
    "salud":       {"margin": 0.25, "label": "Salud / Belleza",          "inv_turnover": 3.0},
    "educacion":   {"margin": 0.35, "label": "Educación / Cursos",       "inv_turnover": 0.0},
    "otro":        {"margin": 0.20, "label": "Otro",                     "inv_turnover": 5.0},
}


# ============== MODELS ==============

class User(BaseModel):
    model_config = ConfigDict(extra="ignore")
    user_id: str
    email: str
    name: str
    picture: Optional[str] = None
    created_at: datetime = Field(default_factory=lambda: datetime.now(timezone.utc))


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
    price_change_pct: float = 0
    cost_change_pct: float = 0
    quantity_change_pct: float = 0
    fixed_cost_change_pct: float = 0


class InventoryItemInput(BaseModel):
    name: str
    sku: Optional[str] = ""
    category: Optional[str] = ""
    stock: int = 0
    reorder_level: int = 0
    cost: float = 0
    price: float = 0


# ============== AUTH HELPERS ==============

async def get_current_user(
    request: Request,
    session_token: Optional[str] = Cookie(None),
    authorization: Optional[str] = Header(None)
) -> User:
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
    body = await request.json()
    session_id = body.get("session_id")
    if not session_id:
        raise HTTPException(status_code=400, detail="Missing session_id")

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

    expires_at = datetime.now(timezone.utc) + timedelta(days=7)
    await db.user_sessions.insert_one({
        "user_id": user_id,
        "session_token": session_token,
        "expires_at": expires_at.isoformat(),
        "created_at": datetime.now(timezone.utc).isoformat()
    })

    response.set_cookie(
        key="session_token", value=session_token,
        max_age=7 * 24 * 60 * 60, path="/",
        httponly=True, secure=True, samesite="none"
    )

    return {"user_id": user_id, "email": email, "name": name, "picture": picture}


@api_router.get("/auth/me")
async def auth_me(request: Request,
                  session_token: Optional[str] = Cookie(None),
                  authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    return {"user_id": user.user_id, "email": user.email,
            "name": user.name, "picture": user.picture}


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

    if profit < 0:
        status, status_label = "loss", "En pérdidas"
    elif margin < 0.20:
        status, status_label = "risk", "En riesgo"
    else:
        status, status_label = "healthy", "Saludable"

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


def _take_snapshot(business: dict, kpis: dict) -> dict:
    """Crea/actualiza un snapshot mensual (key = year-month)."""
    period = datetime.now(timezone.utc).strftime("%Y-%m")
    return {
        "snapshot_id": f"snap_{business['user_id']}_{period}",
        "user_id": business["user_id"],
        "period": period,
        "revenue": kpis["revenue"],
        "profit": kpis["profit"],
        "margin": kpis["margin"],
        "total_costs": kpis["total_costs"],
        "breakeven_units": kpis["breakeven_units"],
        "status": kpis["status"],
        "created_at": datetime.now(timezone.utc).isoformat(),
    }


# ============== BUSINESS ROUTES ==============

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

    # Crea/actualiza snapshot del periodo actual
    snap = _take_snapshot(biz, biz["kpis"])
    await db.snapshots.update_one(
        {"snapshot_id": snap["snapshot_id"]},
        {"$set": snap},
        upsert=True
    )

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
    return compute_kpis(input.model_dump())


@api_router.post("/business/simulate")
async def simulate(sim: SimulationInput, request: Request,
                   session_token: Optional[str] = Cookie(None),
                   authorization: Optional[str] = Header(None)):
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


# ============== AI ANALYSIS ==============

def _format_currency(v: float) -> str:
    try:
        return f"${v:,.2f}"
    except Exception:
        return str(v)


@api_router.post("/business/analyze")
async def ai_analyze(request: Request,
                     session_token: Optional[str] = Cookie(None),
                     authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    biz = await db.businesses.find_one({"user_id": user.user_id}, {"_id": 0})
    if not biz:
        raise HTTPException(status_code=404, detail="No business data")

    kpis = compute_kpis(biz)

    if not GEMINI_API_KEY:
        return {
            "summary": "Análisis basado en reglas (sin IA configurada).",
            "recommendations": [{"title": "Recomendación", "detail": h, "priority": "media"}
                                for h in kpis["rule_hints"]],
            "kpis": kpis, "ai": False,
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
            "strengths": [], "risks": [],
            "recommendations": [{"title": "Recomendación", "detail": h, "priority": "media",
                                 "impact": ""} for h in kpis["rule_hints"]],
            "next_30_days": [], "kpis": kpis, "ai": False, "error": str(e),
        }

    parsed["kpis"] = kpis
    parsed["ai"] = True
    return parsed


# ============== SAMPLE / SEED ==============

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

SAMPLE_INVENTORY = [
    {"name": "Café americano", "sku": "CAF-AME", "category": "Bebidas", "stock": 80, "reorder_level": 30, "cost": 12, "price": 35},
    {"name": "Latte", "sku": "CAF-LAT", "category": "Bebidas", "stock": 60, "reorder_level": 25, "cost": 18, "price": 50},
    {"name": "Pan dulce", "sku": "PAN-DUL", "category": "Panadería", "stock": 45, "reorder_level": 20, "cost": 8, "price": 25},
    {"name": "Sándwich club", "sku": "SAN-CLU", "category": "Comida", "stock": 18, "reorder_level": 15, "cost": 35, "price": 85},
    {"name": "Postre del día", "sku": "POS-DIA", "category": "Postres", "stock": 12, "reorder_level": 15, "cost": 22, "price": 55},
]


@api_router.post("/business/sample")
async def load_sample(request: Request,
                      session_token: Optional[str] = Cookie(None),
                      authorization: Optional[str] = Header(None)):
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

    # Snapshot
    snap = _take_snapshot(biz, biz["kpis"])
    await db.snapshots.update_one(
        {"snapshot_id": snap["snapshot_id"]},
        {"$set": snap},
        upsert=True
    )

    # Cargar inventario de ejemplo solo si no tiene
    has_items = await db.inventory.count_documents({"user_id": user.user_id})
    if not has_items:
        for item in SAMPLE_INVENTORY:
            await db.inventory.insert_one({
                "item_id": f"item_{uuid.uuid4().hex[:12]}",
                "user_id": user.user_id,
                **item,
                "updated_at": now_iso,
            })

    # Snapshots ficticios de meses pasados (demo)
    has_snaps = await db.snapshots.count_documents({"user_id": user.user_id})
    if has_snaps < 3:
        base = datetime.now(timezone.utc)
        for i in range(1, 6):
            d = base - timedelta(days=30 * i)
            period = d.strftime("%Y-%m")
            factor = 0.85 + 0.04 * (5 - i)
            r = round(biz["kpis"]["revenue"] * factor, 2)
            p = round(biz["kpis"]["profit"] * factor * (0.6 + 0.08 * (5 - i)), 2)
            await db.snapshots.update_one(
                {"snapshot_id": f"snap_{user.user_id}_{period}"},
                {"$set": {
                    "snapshot_id": f"snap_{user.user_id}_{period}",
                    "user_id": user.user_id,
                    "period": period,
                    "revenue": r,
                    "profit": p,
                    "margin": round(p / r, 4) if r else 0,
                    "total_costs": round(r - p, 2),
                    "breakeven_units": biz["kpis"]["breakeven_units"],
                    "status": "healthy" if p > 0 and (p / r if r else 0) >= 0.20 else "risk",
                    "created_at": d.isoformat(),
                }},
                upsert=True
            )
    return biz


# ============== INVENTORY ==============

@api_router.get("/inventory")
async def list_inventory(request: Request,
                         session_token: Optional[str] = Cookie(None),
                         authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    items = await db.inventory.find({"user_id": user.user_id}, {"_id": 0}).sort("name", 1).to_list(500)
    total_units = sum(int(i.get("stock", 0)) for i in items)
    total_value_cost = sum(int(i.get("stock", 0)) * float(i.get("cost", 0)) for i in items)
    total_value_price = sum(int(i.get("stock", 0)) * float(i.get("price", 0)) for i in items)
    low_stock = [i for i in items if int(i.get("stock", 0)) <= int(i.get("reorder_level", 0))]
    return {
        "items": items,
        "summary": {
            "count": len(items),
            "total_units": total_units,
            "total_cost_value": round(total_value_cost, 2),
            "total_retail_value": round(total_value_price, 2),
            "potential_margin": round(total_value_price - total_value_cost, 2),
            "low_stock_count": len(low_stock),
            "low_stock_items": [i["name"] for i in low_stock],
        },
    }


@api_router.post("/inventory")
async def create_inventory_item(input: InventoryItemInput, request: Request,
                                session_token: Optional[str] = Cookie(None),
                                authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    item = {
        "item_id": f"item_{uuid.uuid4().hex[:12]}",
        "user_id": user.user_id,
        **input.model_dump(),
        "updated_at": datetime.now(timezone.utc).isoformat(),
    }
    await db.inventory.insert_one(item.copy())
    return item


@api_router.put("/inventory/{item_id}")
async def update_inventory_item(item_id: str, input: InventoryItemInput, request: Request,
                                session_token: Optional[str] = Cookie(None),
                                authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    update_doc = input.model_dump()
    update_doc["updated_at"] = datetime.now(timezone.utc).isoformat()
    res = await db.inventory.update_one(
        {"item_id": item_id, "user_id": user.user_id},
        {"$set": update_doc}
    )
    if res.matched_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    item = await db.inventory.find_one({"item_id": item_id}, {"_id": 0})
    return item


@api_router.delete("/inventory/{item_id}")
async def delete_inventory_item(item_id: str, request: Request,
                                session_token: Optional[str] = Cookie(None),
                                authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    res = await db.inventory.delete_one({"item_id": item_id, "user_id": user.user_id})
    if res.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Item not found")
    return {"ok": True}


# ============== HISTORY / SNAPSHOTS ==============

@api_router.get("/snapshots")
async def get_snapshots(request: Request,
                        session_token: Optional[str] = Cookie(None),
                        authorization: Optional[str] = Header(None)):
    user = await get_current_user(request, session_token, authorization)
    snaps = await db.snapshots.find(
        {"user_id": user.user_id}, {"_id": 0}
    ).sort("period", 1).to_list(60)
    return {"snapshots": snaps}


# ============== BENCHMARKS ==============

@api_router.get("/benchmarks/{business_type}")
async def get_benchmark(business_type: str):
    bench = INDUSTRY_BENCHMARKS.get(business_type, INDUSTRY_BENCHMARKS["otro"])
    return {"business_type": business_type, **bench}


@api_router.get("/")
async def root():
    return {"message": "Econo Smart API", "status": "ok"}


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
