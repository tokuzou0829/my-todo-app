# Finance

Finance API は API Key に紐づく本人の家計簿項目、タグ、集計データを操作します。Developer API では `isPrivate: true` の項目も取得・操作できます。

## Get Finance Data

```http
GET /api/developer/v1/finance
```

### Response

```json
{
  "entries": [
    {
      "id": "018f0000-0000-7000-8000-000000000010",
      "userId": "user_123",
      "type": "expense",
      "title": "Groceries",
      "amountMinor": 3200,
      "currency": "JPY",
      "occurredAt": "2026-04-01T00:00:00.000Z",
      "paymentMethod": "credit_card",
      "merchant": "Local Market",
      "memo": "weekly shopping",
      "isPrivate": true,
      "createdAt": "2026-04-01T00:00:00.000Z",
      "updatedAt": "2026-04-01T00:00:00.000Z",
      "tags": [{ "id": "018f...", "name": "食費", "color": "lime" }]
    }
  ],
  "tags": [
    {
      "id": "018f0000-0000-7000-8000-000000000020",
      "userId": "user_123",
      "name": "食費",
      "color": "lime",
      "isDefault": true,
      "createdAt": "2026-04-01T00:00:00.000Z",
      "updatedAt": "2026-04-01T00:00:00.000Z"
    }
  ]
}
```

## Create Entry

```http
POST /api/developer/v1/finance/entries
```

### Request Body

```json
{
  "type": "expense",
  "title": "Groceries",
  "amountMinor": 3200,
  "currency": "JPY",
  "occurredAt": "2026-04-01T00:00:00.000Z",
  "paymentMethod": "credit_card",
  "merchant": "Local Market",
  "memo": "weekly shopping",
  "isPrivate": true,
  "tagIds": [],
  "newTags": [{ "name": "Food", "color": "lime" }]
}
```

### Fields

| Field           | Type                                                       | Required | Default | Description                    |
| --------------- | ---------------------------------------------------------- | -------- | ------- | ------------------------------ |
| `type`          | `expense \| income`                                        | Yes      | -       | 支出または収入                 |
| `title`         | `string`                                                   | Yes      | -       | 1-120文字                      |
| `amountMinor`   | `number`                                                   | Yes      | -       | 最小通貨単位の金額。JPY では円 |
| `currency`      | `JPY`                                                      | No       | `JPY`   | 現在は JPY のみ                |
| `occurredAt`    | `string`                                                   | Yes      | -       | 発生日。ISO 8601 形式          |
| `paymentMethod` | `cash \| credit_card \| bank_transfer \| e_money \| other` | No       | `other` | 支払い方法                     |
| `merchant`      | `string \| null`                                           | No       | `null`  | 支払先・入金元。最大240文字    |
| `memo`          | `string \| null`                                           | No       | `null`  | 最大240文字                    |
| `isPrivate`     | `boolean`                                                  | No       | `false` | 公開表示から除外するか         |
| `tagIds`        | `string[]`                                                 | No       | `[]`    | 既存タグID。最大50件           |
| `newTags`       | `NewFinanceTag[]`                                          | No       | `[]`    | 新規作成するタグ。最大20件     |

## Update Entry

```http
PATCH /api/developer/v1/finance/entries/:id
```

少なくとも1つのフィールドが必要です。`tagIds` または `newTags` を指定した場合、対象項目のタグ割り当ては指定内容で置き換えられます。

## Delete Entry

```http
DELETE /api/developer/v1/finance/entries/:id
```

削除した項目を返します。

## Tags

```http
GET /api/developer/v1/finance/tags
POST /api/developer/v1/finance/tags
PATCH /api/developer/v1/finance/tags/:id
DELETE /api/developer/v1/finance/tags/:id
```

デフォルトタグは初回アクセス時にユーザーごとに作成されます。デフォルトタグは削除できません。カスタムタグは作成、名前変更、色変更、削除ができます。

### Create Tag Body

```json
{
  "name": "Travel",
  "color": "blue"
}
```

## Analytics

```http
GET /api/developer/v1/finance/analytics?groupBy=month
```

### Query Parameters

| Parameter | Type                    | Default | Description              |
| --------- | ----------------------- | ------- | ------------------------ |
| `groupBy` | `week \| month \| year` | `month` | 集計粒度                 |
| `from`    | `string`                | -       | 開始日時。ISO 8601 形式  |
| `to`      | `string`                | -       | 終了日時。ISO 8601 形式  |
| `tagIds`  | `string`                | -       | カンマ区切りのタグID     |
| `type`    | `expense \| income`     | -       | 支出または収入で絞り込み |

### Response

```json
{
  "points": [
    {
      "period": "2026-04",
      "income": 300000,
      "expense": 120000,
      "net": 180000
    }
  ],
  "summary": {
    "income": 300000,
    "expense": 120000,
    "net": 180000
  }
}
```
