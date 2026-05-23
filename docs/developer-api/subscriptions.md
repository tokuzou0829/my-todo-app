# Subscriptions

Subscription API は API Key に紐づく本人のサブスクリプションを操作します。Developer API では `isPrivate: true` のサブスクリプションも取得・操作できます。

## Get Subscriptions

```http
GET /api/developer/v1/subscriptions
```

### Response

```json
{
  "subscriptions": [
    {
      "id": "018f0000-0000-7000-8000-000000000010",
      "userId": "user_123",
      "name": "Private Cloud",
      "amountMinor": 1980,
      "currency": "JPY",
      "billingIntervalUnit": "month",
      "billingIntervalCount": 1,
      "nextPaymentAt": "2026-04-01T00:00:00.000Z",
      "memo": "internal",
      "isPrivate": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "labels": [
        {
          "id": "018f0000-0000-7000-8000-000000000020",
          "userId": "user_123",
          "name": "dev",
          "color": "blue",
          "createdAt": "2026-01-01T00:00:00.000Z",
          "updatedAt": "2026-01-01T00:00:00.000Z"
        }
      ]
    }
  ],
  "labels": [
    {
      "id": "018f0000-0000-7000-8000-000000000020",
      "userId": "user_123",
      "name": "dev",
      "color": "blue",
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z"
    }
  ]
}
```

### curl

```bash
curl "/api/developer/v1/subscriptions" \
  -H "Authorization: Bearer tdo_live_xxx"
```

## Create Subscription

```http
POST /api/developer/v1/subscriptions
```

### Request Body

```json
{
  "name": "Private Cloud",
  "amountMinor": 1980,
  "currency": "JPY",
  "billingIntervalUnit": "month",
  "billingIntervalCount": 1,
  "nextPaymentAt": "2026-04-01T00:00:00.000Z",
  "memo": "internal",
  "isPrivate": true,
  "labelIds": [],
  "newLabels": [{ "name": "dev", "color": "blue" }]
}
```

### Fields

| Field                  | Type                           | Required | Default | Description                    |
| ---------------------- | ------------------------------ | -------- | ------- | ------------------------------ |
| `name`                 | `string`                       | Yes      | -       | 1-120文字                      |
| `amountMinor`          | `number`                       | Yes      | -       | 最小通貨単位の金額。JPY では円 |
| `currency`             | `JPY`                          | No       | `JPY`   | 現在は JPY のみ                |
| `billingIntervalUnit`  | `day \| week \| month \| year` | Yes      | -       | 支払い周期の単位               |
| `billingIntervalCount` | `number`                       | Yes      | -       | 1-60 の整数                    |
| `nextPaymentAt`        | `string`                       | Yes      | -       | 基準支払い日。ISO 8601 形式    |
| `memo`                 | `string \| null`               | No       | `null`  | 最大240文字                    |
| `isPrivate`            | `boolean`                      | No       | `false` | 公開表示で名称とメモを伏せるか |
| `labelIds`             | `string[]`                     | No       | `[]`    | 既存ラベルID。最大50件         |
| `newLabels`            | `NewLabel[]`                   | No       | `[]`    | 新規作成するラベル。最大20件   |

### Billing Examples

| Use Case  | `billingIntervalUnit` | `billingIntervalCount` |
| --------- | --------------------- | ---------------------- |
| 30日ごと  | `day`                 | `30`                   |
| 毎週      | `week`                | `1`                    |
| 毎月      | `month`               | `1`                    |
| 3か月ごと | `month`               | `3`                    |
| 毎年      | `year`                | `1`                    |

`nextPaymentAt` は基準支払い日です。クライアント側で今日以降の表示用支払い日を計算する場合は、この日付と支払い周期を元に算出してください。

### Response

```json
{
  "subscription": {
    "id": "018f0000-0000-7000-8000-000000000010",
    "userId": "user_123",
    "name": "Private Cloud",
    "amountMinor": 1980,
    "currency": "JPY",
    "billingIntervalUnit": "month",
    "billingIntervalCount": 1,
    "nextPaymentAt": "2026-04-01T00:00:00.000Z",
    "memo": "internal",
    "isPrivate": true,
    "createdAt": "2026-01-01T00:00:00.000Z",
    "updatedAt": "2026-01-01T00:00:00.000Z",
    "labels": [{ "id": "018f...", "name": "dev", "color": "blue" }]
  }
}
```

### curl

```bash
curl "/api/developer/v1/subscriptions" \
  -X POST \
  -H "Authorization: Bearer tdo_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Private Cloud",
    "amountMinor": 1980,
    "currency": "JPY",
    "billingIntervalUnit": "month",
    "billingIntervalCount": 1,
    "nextPaymentAt": "2026-04-01T00:00:00.000Z",
    "memo": "internal",
    "isPrivate": true,
    "newLabels": [{ "name": "dev", "color": "blue" }]
  }'
```

## Update Subscription

```http
PATCH /api/developer/v1/subscriptions/:id
```

### Path Parameters

| Parameter | Type   | Description     |
| --------- | ------ | --------------- |
| `id`      | `uuid` | Subscription ID |

### Request Body

少なくとも1つのフィールドが必要です。

```json
{
  "amountMinor": 2500,
  "memo": null,
  "newLabels": [{ "name": "updated", "color": "rose" }]
}
```

### Label Update Behavior

`labelIds` または `newLabels` を指定した場合、対象サブスクリプションのラベル割り当ては指定内容で置き換えられます。

既存ラベルを残したい場合は `labelIds` にそのラベルIDを含めてください。

### Response

```json
{
  "subscription": {
    "id": "018f0000-0000-7000-8000-000000000010",
    "amountMinor": 2500,
    "memo": null,
    "labels": [{ "id": "018f...", "name": "updated", "color": "rose" }]
  }
}
```

### curl

```bash
curl "/api/developer/v1/subscriptions/018f0000-0000-7000-8000-000000000010" \
  -X PATCH \
  -H "Authorization: Bearer tdo_live_xxx" \
  -H "Content-Type: application/json" \
  -d '{
    "amountMinor": 2500,
    "memo": null,
    "newLabels": [{ "name": "updated", "color": "rose" }]
  }'
```

## Delete Subscription

```http
DELETE /api/developer/v1/subscriptions/:id
```

### Response

削除したサブスクリプションを返します。

```json
{
  "subscription": {
    "id": "018f0000-0000-7000-8000-000000000010",
    "name": "Private Cloud"
  }
}
```

### curl

```bash
curl "/api/developer/v1/subscriptions/018f0000-0000-7000-8000-000000000010" \
  -X DELETE \
  -H "Authorization: Bearer tdo_live_xxx"
```
