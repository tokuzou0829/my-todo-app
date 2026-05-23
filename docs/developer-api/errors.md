# Errors

Developer API のエラーは JSON で返ります。

```json
{
  "error": "Invalid API key"
}
```

## Common Status Codes

| Status | Meaning                    | Example                      |
| ------ | -------------------------- | ---------------------------- |
| `400`  | リクエストが不正           | `Invalid subscription label` |
| `401`  | API Key がない、または不正 | `API key is required`        |
| `404`  | 対象リソースがない         | `Todo not found`             |
| `500`  | サーバーエラー             | `Internal Server Error`      |

## Authentication Errors

API Key が指定されていません。

```json
{
  "error": "API key is required"
}
```

API Key が不正、または失効済みです。

```json
{
  "error": "Invalid API key"
}
```

## Validation Errors

リクエストボディ、パスパラメータ、日付形式などがスキーマに合わない場合は `400` 系のエラーになります。

代表例です。

```json
{
  "error": "No changes provided"
}
```

```json
{
  "error": "Invalid subscription label"
}
```

## Not Found Errors

API Key のユーザーに属さないリソースは、存在していても `404` として扱われます。

```json
{
  "error": "Todo not found"
}
```

```json
{
  "error": "Subscription not found"
}
```
