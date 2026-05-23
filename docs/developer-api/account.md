# Account

API Key に紐づくユーザー情報を取得します。

## Get Me

```http
GET /api/developer/v1/me
```

## Response

```json
{
  "user": {
    "id": "user_123",
    "name": "Test User",
    "email": "user@example.com",
    "emailVerified": true,
    "image": null,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

## curl

```bash
curl "/api/developer/v1/me" \
  -H "Authorization: Bearer tdo_live_xxx"
```
