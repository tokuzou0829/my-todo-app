# Scraps

Scrap API は API Key に紐づく本人のスクラップを操作します。Developer API では `isPrivate: true` のスクラップも取得・操作できます。

## Get Scraps

```http
GET /api/developer/v1/scraps
```

### Query Parameters

| Parameter | Type     | Default | Description                       |
| --------- | -------- | ------- | --------------------------------- |
| `page`    | `number` | `1`     | 1以上のページ番号                 |
| `perPage` | `number` | `30`    | 1-100件                           |
| `q`       | `string` | `""`    | `title`, `body`, `sourceUrl` 検索 |

### Response

```json
{
  "scraps": [
    {
      "id": "018f0000-0000-7000-8000-000000000030",
      "userId": "user_123",
      "title": "Private scrap",
      "body": "image memo",
      "kind": "image",
      "sourceUrl": null,
      "isPrivate": true,
      "createdAt": "2026-01-01T00:00:00.000Z",
      "updatedAt": "2026-01-01T00:00:00.000Z",
      "linkPreview": null,
      "attachments": [
        {
          "id": "018f0000-0000-7000-8000-000000000031",
          "scrapId": "018f0000-0000-7000-8000-000000000030",
          "fileId": "018f0000-0000-7000-8000-000000000032",
          "altText": "photo.png",
          "position": 0,
          "createdAt": "2026-01-01T00:00:00.000Z",
          "url": "/api/developer/v1/scraps/files/018f0000-0000-7000-8000-000000000032"
        }
      ]
    }
  ],
  "pagination": {
    "page": 1,
    "perPage": 30,
    "total": 1,
    "pageCount": 1
  }
}
```

## Get Scrap

```http
GET /api/developer/v1/scraps/:id
```

### Path Parameters

| Parameter | Type   | Description |
| --------- | ------ | ----------- |
| `id`      | `uuid` | Scrap ID    |

### Response

```json
{
  "scrap": {
    "id": "018f0000-0000-7000-8000-000000000030",
    "title": "Private scrap",
    "kind": "image",
    "attachments": []
  }
}
```

## Create Scrap

```http
POST /api/developer/v1/scraps
Content-Type: multipart/form-data
```

### Form Fields

| Field       | Type      | Required | Default | Description                        |
| ----------- | --------- | -------- | ------- | ---------------------------------- |
| `title`     | `string`  | No       | `""`    | 最大500文字。URLの場合はリンク扱い |
| `body`      | `string`  | No       | `""`    | 最大20,000文字                     |
| `sourceUrl` | `string`  | No       | `""`    | HTTP/HTTPS URL。指定時はリンク扱い |
| `isPrivate` | `boolean` | No       | `false` | `"true"` のとき非公開              |
| `images`    | `File[]`  | No       | `[]`    | 最大4枚。各8MBまで                 |

`title`, `body`, `sourceUrl`, `images` の少なくとも1つが必要です。

対応画像形式は JPEG, PNG, WebP, GIF, AVIF, HEIC, HEIF です。

### curl

```bash
curl "/api/developer/v1/scraps" \
  -X POST \
  -H "Authorization: Bearer tdo_live_xxx" \
  -F "title=Private scrap" \
  -F "body=image memo" \
  -F "isPrivate=true" \
  -F "images=@./photo.png;type=image/png"
```

リンクスクラップを作成する場合は `sourceUrl` を指定します。

```bash
curl "/api/developer/v1/scraps" \
  -X POST \
  -H "Authorization: Bearer tdo_live_xxx" \
  -F "sourceUrl=https://example.com/article" \
  -F "isPrivate=true"
```

## Update Scrap

```http
PATCH /api/developer/v1/scraps/:id
Content-Type: application/json
```

少なくとも1つのフィールドが必要です。リンクプレビューと添付画像は更新されません。

### Request Body

```json
{
  "title": "Updated scrap",
  "body": null,
  "isPrivate": false
}
```

### Updatable Fields

| Field       | Type             | Description        |
| ----------- | ---------------- | ------------------ |
| `title`     | `string`         | 1-500文字          |
| `body`      | `string \| null` | 最大20,000文字     |
| `isPrivate` | `boolean`        | 公開表示から隠すか |

## Delete Scrap

```http
DELETE /api/developer/v1/scraps/:id
```

削除した Scrap を返します。添付画像とリンクプレビュー画像も削除されます。

## Get Scrap File

```http
GET /api/developer/v1/scraps/files/:id
```

添付画像またはリンクプレビュー画像を取得します。API Key のユーザーに属するスクラップのファイルだけ取得できます。
