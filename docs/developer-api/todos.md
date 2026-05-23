# Todos

Todo API は API Key に紐づく本人の Todo を操作します。Developer API では `isPrivate: true` の Todo も取得・操作できます。

## Get Todos

```http
GET /api/developer/v1/todos
```

### Response

```json
{
  "todos": [
    {
      "id": "018f0000-0000-7000-8000-000000000001",
      "userId": "user_123",
      "title": "Private API task",
      "priority": "high",
      "dueAt": "2026-03-01T00:00:00.000Z",
      "isPrivate": true,
      "completed": false,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### curl

```bash
curl "/api/developer/v1/todos" \
  -H "Authorization: Bearer tdo_live_xxx"
```

## Create Todo

```http
POST /api/developer/v1/todos
```

### Request Body

```json
{
  "title": "Private API task",
  "priority": "high",
  "dueAt": "2026-03-01T00:00:00.000Z",
  "isPrivate": true,
  "completed": false
}
```

### Fields

| Field       | Type                            | Required | Default     | Description         |
| ----------- | ------------------------------- | -------- | ----------- | ------------------- |
| `title`     | `string`                        | Yes      | -           | 1-120文字           |
| `priority`  | `none \| low \| medium \| high` | No       | `none`      | 優先度              |
| `dueAt`     | `string \| null`                | No       | `undefined` | 期限。ISO 8601 形式 |
| `isPrivate` | `boolean`                       | No       | `false`     | 公開表示から隠すか  |
| `completed` | `boolean`                       | No       | `false`     | 完了状態            |

### Response

```json
{
  "todo": {
    "id": "018f0000-0000-7000-8000-000000000001",
    "userId": "user_123",
    "title": "Private API task",
    "priority": "high",
    "dueAt": "2026-03-01T00:00:00.000Z",
    "isPrivate": true,
    "completed": false,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z"
  }
}
```

### curl

```bash
curl "/api/developer/v1/todos" \
  -X POST \
  -H "Authorization: Bearer tdo_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Private API task",
    "priority": "high",
    "dueAt": "2026-03-01T00:00:00.000Z",
    "isPrivate": true
  }'
```

## Update Todo

```http
PATCH /api/developer/v1/todos/:id
```

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | `uuid` | Todo ID     |

### Request Body

少なくとも1つのフィールドが必要です。

```json
{
  "completed": true,
  "dueAt": null
}
```

### Updatable Fields

| Field       | Type                            | Description             |
| ----------- | ------------------------------- | ----------------------- |
| `title`     | `string`                        | 1-120文字               |
| `priority`  | `none \| low \| medium \| high` | 優先度                  |
| `dueAt`     | `string \| null`                | 期限。`null` で期限なし |
| `isPrivate` | `boolean`                       | 公開表示から隠すか      |
| `completed` | `boolean`                       | 完了状態                |

### Response

```json
{
  "todo": {
    "id": "018f0000-0000-7000-8000-000000000001",
    "userId": "user_123",
    "title": "Private API task",
    "priority": "high",
    "dueAt": null,
    "isPrivate": true,
    "completed": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-02T00:00:00.000Z"
  }
}
```

### curl

```bash
curl "/api/developer/v1/todos/018f0000-0000-7000-8000-000000000001" \
  -X PATCH \
  -H "Authorization: Bearer tdo_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{ "completed": true, "dueAt": null }'
```

## Delete Todo

```http
DELETE /api/developer/v1/todos/:id
```

### Response

削除した Todo を返します。

```json
{
  "todo": {
    "id": "018f0000-0000-7000-8000-000000000001",
    "title": "Private API task"
  }
}
```

### curl

```bash
curl "/api/developer/v1/todos/018f0000-0000-7000-8000-000000000001" \
  -X DELETE \
  -H "Authorization: Bearer tdo_live_xxx"
```
