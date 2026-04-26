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
