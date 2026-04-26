# Auth Testing Playbook

## Step 1: Create Test User & Session

```bash
mongosh --eval "
use('test_database');
var userId = 'test-user-' + Date.now();
var sessionToken = 'test_session_' + Date.now();
db.users.insertOne({
  user_id: userId,
  email: 'test.user.' + Date.now() + '@example.com',
  name: 'Test User',
  picture: 'https://via.placeholder.com/150',
  created_at: new Date()
});
db.user_sessions.insertOne({
  user_id: userId,
  session_token: sessionToken,
  expires_at: new Date(Date.now() + 7*24*60*60*1000),
  created_at: new Date()
});
print('Session token: ' + sessionToken);
print('User ID: ' + userId);
"
```

## Step 2: Test Backend API

```bash
# Auth endpoint
curl -X GET "$REACT_APP_BACKEND_URL/api/auth/me" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

# Business CRUD
curl -X POST "$REACT_APP_BACKEND_URL/api/business" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{
    "business_name":"Test Café","business_type":"restaurante",
    "monthly_sales":85000,"fixed_costs":22000,
    "cost_per_unit":35,"sale_price":75,
    "quantity_sold":1200,"inventory":400
  }'

curl -X GET "$REACT_APP_BACKEND_URL/api/business" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "$REACT_APP_BACKEND_URL/api/business/sample" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"

curl -X POST "$REACT_APP_BACKEND_URL/api/business/simulate" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN" \
  -d '{"price_change_pct":10}'

curl -X POST "$REACT_APP_BACKEND_URL/api/business/analyze" \
  -H "Authorization: Bearer YOUR_SESSION_TOKEN"
```

## Step 3: Browser Testing (Playwright)

```python
await page.context.add_cookies([{
  "name": "session_token",
  "value": "YOUR_SESSION_TOKEN",
  "domain": "smart-finance-418.preview.emergentagent.com",
  "path": "/",
  "httpOnly": True,
  "secure": True,
  "sameSite": "None"
}])
await page.goto("https://smart-finance-418.preview.emergentagent.com/dashboard")
```

## Quick Debug

```bash
mongosh --eval "
use('test_database');
db.users.find().limit(2).pretty();
db.user_sessions.find().limit(2).pretty();
db.businesses.find().limit(2).pretty();
"

# Clean test data
mongosh --eval "
use('test_database');
db.users.deleteMany({email: /test\\.user\\./});
db.user_sessions.deleteMany({session_token: /test_session/});
db.businesses.deleteMany({user_id: /test-user-/});
"
```

## Checklist
- User document has `user_id` (custom UUID).
- Session `user_id` matches user's `user_id`.
- All Mongo queries use `{"_id": 0}` projection.
- `/api/auth/me` returns user data when valid token sent.
- Dashboard loads when cookie/Authorization is present.
- KPIs computed correctly (revenue = price × qty, etc.).
- AI analysis endpoint returns `recommendations` (or rule-based fallback).
- Simulator returns `current` and `simulated` KPIs.
