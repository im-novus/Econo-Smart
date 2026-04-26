"""
Econo Smart Backend Tests
Covers: auth, business CRUD, KPI calculations, simulator, and AI analysis.
"""
import os
import time
import requests
import pytest
from pymongo import MongoClient

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "https://smart-finance-418.preview.emergentagent.com").rstrip("/")
MONGO_URL = os.environ.get("MONGO_URL", "mongodb://localhost:27017")
DB_NAME = os.environ.get("DB_NAME", "test_database")


@pytest.fixture(scope="session")
def mongo_db():
    c = MongoClient(MONGO_URL)
    return c[DB_NAME]


@pytest.fixture(scope="session")
def session_token(mongo_db):
    """Create test user + session in MongoDB and return the session token."""
    import datetime
    uid = f"test-user-{int(time.time()*1000)}"
    token = f"test_session_{int(time.time()*1000)}"
    mongo_db.users.insert_one({
        "user_id": uid,
        "email": f"test.user.{int(time.time()*1000)}@example.com",
        "name": "Test User",
        "picture": "https://via.placeholder.com/150",
        "created_at": datetime.datetime.utcnow().isoformat(),
    })
    mongo_db.user_sessions.insert_one({
        "user_id": uid,
        "session_token": token,
        "expires_at": (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat(),
        "created_at": datetime.datetime.utcnow().isoformat(),
    })
    yield {"token": token, "user_id": uid}
    # Teardown
    mongo_db.user_sessions.delete_one({"session_token": token})
    mongo_db.users.delete_one({"user_id": uid})
    mongo_db.businesses.delete_many({"user_id": uid})
    mongo_db.inventory.delete_many({"user_id": uid})
    mongo_db.snapshots.delete_many({"user_id": uid})


@pytest.fixture
def auth_headers(session_token):
    return {"Authorization": f"Bearer {session_token['token']}", "Content-Type": "application/json"}


# ========= AUTH TESTS =========

class TestAuth:
    def test_me_no_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me")
        assert r.status_code == 401

    def test_me_with_token(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/auth/me", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["email"].startswith("test.user.")
        assert d["name"] == "Test User"
        assert "user_id" in d

    def test_me_invalid_token(self):
        r = requests.get(f"{BASE_URL}/api/auth/me",
                         headers={"Authorization": "Bearer invalid_token_xyz"})
        assert r.status_code == 401

    def test_business_no_auth_returns_401(self):
        r = requests.get(f"{BASE_URL}/api/business")
        assert r.status_code == 401


# ========= BUSINESS CRUD =========

class TestBusiness:
    def test_load_sample(self, auth_headers):
        r = requests.post(f"{BASE_URL}/api/business/sample", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "kpis" in d
        assert d["business_name"] == "Cafetería La Esquina"
        kpis = d["kpis"]
        # revenue = 75 * 1200 = 90000
        assert kpis["revenue"] == 90000.0
        # variable = 35*1200=42000; total=42000+22000=64000; profit=90000-64000=26000
        assert kpis["profit"] == 26000.0

    def test_save_business_and_kpis(self, auth_headers):
        payload = {
            "business_name": "TEST_Negocio",
            "business_type": "tienda",
            "monthly_sales": 100000,
            "fixed_costs": 20000,
            "cost_per_unit": 50,
            "sale_price": 100,
            "quantity_sold": 1000,
            "inventory": 500,
        }
        r = requests.post(f"{BASE_URL}/api/business", json=payload, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        kpis = d["kpis"]
        # revenue = 100*1000 = 100000
        assert kpis["revenue"] == 100000.0
        # profit = 100000 - (50*1000 + 20000) = 30000
        assert kpis["profit"] == 30000.0
        # margin = 0.30
        assert abs(kpis["margin"] - 0.30) < 0.001
        # breakeven units = 20000 / (100-50) = 400
        assert kpis["breakeven_units"] == 400.0
        assert kpis["status"] == "healthy"

    def test_get_business(self, auth_headers):
        r = requests.get(f"{BASE_URL}/api/business", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert d["business"] is not None
        assert "kpis" in d["business"]

    def test_calculate_only(self, auth_headers):
        payload = {
            "business_name": "x", "business_type": "tienda",
            "monthly_sales": 1, "fixed_costs": 100,
            "cost_per_unit": 5, "sale_price": 10,
            "quantity_sold": 100, "inventory": 50,
        }
        r = requests.post(f"{BASE_URL}/api/business/calculate", json=payload, headers=auth_headers)
        assert r.status_code == 200
        k = r.json()
        # revenue = 1000, variable = 500, total=600, profit=400
        assert k["revenue"] == 1000.0
        assert k["profit"] == 400.0


# ========= STATUS LOGIC =========

class TestStatusLogic:
    def _post(self, headers, **overrides):
        payload = {
            "business_name": "TEST_status",
            "business_type": "tienda",
            "monthly_sales": 10000,
            "fixed_costs": 2000,
            "cost_per_unit": 50,
            "sale_price": 100,
            "quantity_sold": 100,
            "inventory": 50,
        }
        payload.update(overrides)
        r = requests.post(f"{BASE_URL}/api/business/calculate", json=payload, headers=headers)
        return r.json()

    def test_status_loss(self, auth_headers):
        # cost > price -> loss
        k = self._post(auth_headers, sale_price=10, cost_per_unit=50, quantity_sold=100, fixed_costs=2000)
        assert k["status"] == "loss"
        assert k["profit"] < 0

    def test_status_risk(self, auth_headers):
        # margin small but positive: revenue=10000, cost=8000, fixed=1500 -> profit=500, margin=0.05
        k = self._post(auth_headers, sale_price=100, cost_per_unit=80, quantity_sold=100, fixed_costs=1500)
        assert k["status"] == "risk"
        assert 0 <= k["margin"] < 0.20

    def test_status_healthy(self, auth_headers):
        k = self._post(auth_headers, sale_price=100, cost_per_unit=30, quantity_sold=100, fixed_costs=2000)
        assert k["status"] == "healthy"
        assert k["margin"] >= 0.20


# ========= SIMULATOR =========

class TestSimulator:
    def test_simulate_price_up(self, auth_headers):
        # ensure there's saved business
        requests.post(f"{BASE_URL}/api/business/sample", headers=auth_headers)
        r = requests.post(f"{BASE_URL}/api/business/simulate",
                          json={"price_change_pct": 10}, headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "current" in d and "simulated" in d
        cur_rev = d["current"]["revenue"]
        sim_rev = d["simulated"]["revenue"]
        # 10% increase in price -> revenue should be 10% higher
        assert abs(sim_rev - cur_rev * 1.10) < 1.0


# ========= AI ANALYSIS =========

class TestAI:
    def test_ai_analyze(self, auth_headers):
        # ensure business
        requests.post(f"{BASE_URL}/api/business/sample", headers=auth_headers)
        r = requests.post(f"{BASE_URL}/api/business/analyze", headers=auth_headers, timeout=60)
        assert r.status_code == 200
        d = r.json()
        assert "summary" in d
        assert "recommendations" in d
        assert isinstance(d["recommendations"], list)
        assert "kpis" in d
        # If AI is reachable, should be True; allow rule-based fallback
        if d.get("ai"):
            assert "next_30_days" in d
            assert isinstance(d["next_30_days"], list)
            for rec in d["recommendations"]:
                assert "title" in rec
                assert "detail" in rec
                assert "priority" in rec


# ========= LOGOUT =========

class TestLogout:
    def test_logout(self, mongo_db):
        # create dedicated session
        import datetime, time as t
        uid = f"test-user-logout-{int(t.time()*1000)}"
        token = f"test_session_logout_{int(t.time()*1000)}"
        mongo_db.users.insert_one({
            "user_id": uid, "email": f"logout{int(t.time()*1000)}@x.com",
            "name": "L", "created_at": datetime.datetime.utcnow().isoformat()
        })
        mongo_db.user_sessions.insert_one({
            "user_id": uid, "session_token": token,
            "expires_at": (datetime.datetime.utcnow() + datetime.timedelta(days=7)).isoformat(),
            "created_at": datetime.datetime.utcnow().isoformat(),
        })
        h = {"Authorization": f"Bearer {token}"}
        r = requests.post(f"{BASE_URL}/api/auth/logout", headers=h)
        assert r.status_code == 200
        # session should now be invalid
        r2 = requests.get(f"{BASE_URL}/api/auth/me", headers=h)
        assert r2.status_code == 401
        mongo_db.users.delete_one({"user_id": uid})



# ========= INVENTORY (NEW) =========

class TestInventory:
    def test_inventory_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/inventory")
        assert r.status_code == 401

    def test_inventory_summary_after_sample(self, auth_headers):
        requests.post(f"{BASE_URL}/api/business/sample", headers=auth_headers)
        r = requests.get(f"{BASE_URL}/api/inventory", headers=auth_headers)
        assert r.status_code == 200
        d = r.json()
        assert "items" in d and "summary" in d
        s = d["summary"]
        for k in ("count", "total_units", "total_cost_value", "total_retail_value",
                  "potential_margin", "low_stock_count", "low_stock_items"):
            assert k in s, f"summary missing key {k}"
        assert s["count"] >= 5
        assert s["total_units"] > 0
        assert s["potential_margin"] == round(s["total_retail_value"] - s["total_cost_value"], 2)
        assert s["low_stock_count"] >= 1

    def test_inventory_create_update_delete(self, auth_headers):
        payload = {
            "name": "TEST_Producto", "sku": "TST-001", "category": "Test",
            "stock": 25, "reorder_level": 5, "cost": 10.0, "price": 25.0,
        }
        r = requests.post(f"{BASE_URL}/api/inventory", json=payload, headers=auth_headers)
        assert r.status_code == 200
        item = r.json()
        assert item["name"] == "TEST_Producto"
        assert item["stock"] == 25
        item_id = item["item_id"]

        r2 = requests.get(f"{BASE_URL}/api/inventory", headers=auth_headers)
        names = [i["name"] for i in r2.json()["items"]]
        assert "TEST_Producto" in names

        upd = {**payload, "stock": 100, "price": 30.0}
        r3 = requests.put(f"{BASE_URL}/api/inventory/{item_id}", json=upd, headers=auth_headers)
        assert r3.status_code == 200
        assert r3.json()["stock"] == 100
        assert r3.json()["price"] == 30.0

        r4 = requests.get(f"{BASE_URL}/api/inventory", headers=auth_headers)
        match = [i for i in r4.json()["items"] if i["item_id"] == item_id]
        assert match and match[0]["stock"] == 100

        r5 = requests.delete(f"{BASE_URL}/api/inventory/{item_id}", headers=auth_headers)
        assert r5.status_code == 200

        r6 = requests.get(f"{BASE_URL}/api/inventory", headers=auth_headers)
        ids = [i["item_id"] for i in r6.json()["items"]]
        assert item_id not in ids

    def test_inventory_update_not_found(self, auth_headers):
        upd = {"name": "X", "sku": "x", "category": "x",
               "stock": 1, "reorder_level": 1, "cost": 1, "price": 1}
        r = requests.put(f"{BASE_URL}/api/inventory/nonexistent_xyz",
                         json=upd, headers=auth_headers)
        assert r.status_code == 404

    def test_inventory_delete_not_found(self, auth_headers):
        r = requests.delete(f"{BASE_URL}/api/inventory/nonexistent_xyz",
                            headers=auth_headers)
        assert r.status_code == 404


# ========= SNAPSHOTS (NEW) =========

class TestSnapshots:
    def test_snapshots_no_auth(self):
        r = requests.get(f"{BASE_URL}/api/snapshots")
        assert r.status_code == 401

    def test_snapshots_after_sample(self, auth_headers):
        requests.post(f"{BASE_URL}/api/business/sample", headers=auth_headers)
        r = requests.get(f"{BASE_URL}/api/snapshots", headers=auth_headers)
        assert r.status_code == 200
        snaps = r.json()["snapshots"]
        assert isinstance(snaps, list)
        assert len(snaps) >= 3
        periods = [s["period"] for s in snaps]
        assert periods == sorted(periods)
        for s in snaps:
            for k in ("snapshot_id", "user_id", "period", "revenue", "profit", "margin"):
                assert k in s

    def test_snapshot_created_on_business_save(self, auth_headers):
        payload = {
            "business_name": "TEST_SnapBiz", "business_type": "tienda",
            "monthly_sales": 50000, "fixed_costs": 10000, "cost_per_unit": 20,
            "sale_price": 50, "quantity_sold": 500, "inventory": 200,
        }
        requests.post(f"{BASE_URL}/api/business", json=payload, headers=auth_headers)
        r = requests.get(f"{BASE_URL}/api/snapshots", headers=auth_headers)
        snaps = r.json()["snapshots"]
        import datetime as _dt
        cur_period = _dt.datetime.utcnow().strftime("%Y-%m")
        assert any(s["period"] == cur_period for s in snaps)


# ========= BENCHMARKS (NEW) =========

class TestBenchmarks:
    @pytest.mark.parametrize("btype", [
        "tienda", "restaurante", "servicios", "manufactura",
        "ecommerce", "salud", "educacion", "otro",
    ])
    def test_benchmark_known_types(self, btype):
        r = requests.get(f"{BASE_URL}/api/benchmarks/{btype}")
        assert r.status_code == 200
        d = r.json()
        assert "margin" in d and "label" in d and "inv_turnover" in d
        assert isinstance(d["margin"], (int, float))
        assert d["business_type"] == btype

    def test_benchmark_unknown_falls_back(self):
        r = requests.get(f"{BASE_URL}/api/benchmarks/unknownxyz")
        assert r.status_code == 200
        assert r.json()["label"] == "Otro"
