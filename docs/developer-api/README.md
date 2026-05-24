# Developer API

Developer API は、外部クライアントから本人の Todo、サブスクリプション、家計簿を読み書きするための API です。

## Base URL

```txt
/api/developer/v1
```

## Authentication

すべての Developer API は API Key 認証が必要です。

```http
Authorization: Bearer <API_KEY>
```

または次のヘッダーも利用できます。

```http
X-API-Key: <API_KEY>
```

詳しくは [Authentication](./authentication.md) を参照してください。

## Endpoints

### Account

| Method | Path  | Description                    |
| ------ | ----- | ------------------------------ |
| `GET`  | `/me` | API Key に紐づくユーザーを取得 |

詳しくは [Account](./account.md) を参照してください。

### Todos

| Method   | Path         | Description     |
| -------- | ------------ | --------------- |
| `GET`    | `/todos`     | Todo 一覧を取得 |
| `POST`   | `/todos`     | Todo を作成     |
| `PATCH`  | `/todos/:id` | Todo を更新     |
| `DELETE` | `/todos/:id` | Todo を削除     |

詳しくは [Todos](./todos.md) を参照してください。

### Subscriptions

| Method   | Path                 | Description                  |
| -------- | -------------------- | ---------------------------- |
| `GET`    | `/subscriptions`     | サブスクリプション一覧を取得 |
| `POST`   | `/subscriptions`     | サブスクリプションを作成     |
| `PATCH`  | `/subscriptions/:id` | サブスクリプションを更新     |
| `DELETE` | `/subscriptions/:id` | サブスクリプションを削除     |

詳しくは [Subscriptions](./subscriptions.md) を参照してください。

### Finance

| Method   | Path                   | Description          |
| -------- | ---------------------- | -------------------- |
| `GET`    | `/finance`             | 家計簿データを取得   |
| `GET`    | `/finance/analytics`   | 家計簿の集計を取得   |
| `POST`   | `/finance/entries`     | 家計簿項目を作成     |
| `PATCH`  | `/finance/entries/:id` | 家計簿項目を更新     |
| `DELETE` | `/finance/entries/:id` | 家計簿項目を削除     |
| `GET`    | `/finance/tags`        | 家計簿タグ一覧を取得 |
| `POST`   | `/finance/tags`        | 家計簿タグを作成     |
| `PATCH`  | `/finance/tags/:id`    | 家計簿タグを更新     |
| `DELETE` | `/finance/tags/:id`    | 家計簿タグを削除     |

詳しくは [Finance](./finance.md) を参照してください。

## Response Format

レスポンスは JSON です。日時は ISO 8601 形式の文字列として返ります。

```json
{
  "todo": {
    "id": "018f...",
    "title": "Example task"
  }
}
```

エラー時は共通して次の形式です。

```json
{
  "error": "Invalid API key"
}
```

詳しくは [Errors](./errors.md) を参照してください。
