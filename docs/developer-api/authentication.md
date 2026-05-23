# Authentication

Developer API はすべて API Key 認証です。

## API Key Header

推奨は `Authorization` ヘッダーです。

```http
Authorization: Bearer <API_KEY>
```

`X-API-Key` ヘッダーでも認証できます。

```http
X-API-Key: <API_KEY>
```

## Example

```bash
curl "/api/developer/v1/me" \
  -H "Authorization: Bearer tdo_live_xxx"
```

## API Key Format

発行される API Key は次のような形式です。

```txt
tdo_live_<random-value>
```

## Failed Authentication

API Key がない場合は `401` です。

```json
{
  "error": "API key is required"
}
```

API Key が不正、または失効済みの場合も `401` です。

```json
{
  "error": "Invalid API key"
}
```
