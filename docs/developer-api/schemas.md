# Schemas

## User

```ts
type User = {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  image: string | null;
  createdAt: string;
  updatedAt: string;
};
```

## Todo

```ts
type Todo = {
  id: string;
  userId: string;
  title: string;
  priority: "none" | "low" | "medium" | "high";
  dueAt: string | null;
  isPrivate: boolean;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## Scrap

```ts
type Scrap = {
  id: string;
  userId: string;
  title: string;
  body: string | null;
  kind: "short_text" | "long_text" | "link" | "image";
  sourceUrl: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  linkPreview: ScrapLinkPreview | null;
  attachments: ScrapAttachment[];
};
```

## ScrapLinkPreview

```ts
type ScrapLinkPreview = {
  id: string;
  scrapId: string;
  url: string;
  title: string | null;
  description: string | null;
  siteName: string | null;
  providerName: string | null;
  authorName: string | null;
  html: string | null;
  imageFileId: string | null;
  imageAlt: string | null;
  metadataSource: "oembed" | "open_graph" | "twitter_card" | "html" | "none";
  rawMetadata: Record<string, unknown> | null;
  createdAt: string;
  imageUrl: string | null;
};
```

## ScrapAttachment

```ts
type ScrapAttachment = {
  id: string;
  scrapId: string;
  fileId: string;
  altText: string | null;
  position: number;
  createdAt: string;
  url: string;
};
```

## Subscription

```ts
type Subscription = {
  id: string;
  userId: string;
  name: string;
  amountMinor: number;
  currency: "JPY";
  billingIntervalUnit: "day" | "week" | "month" | "year";
  billingIntervalCount: number;
  nextPaymentAt: string;
  memo: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  labels: SubscriptionLabel[];
};
```

## SubscriptionLabel

```ts
type SubscriptionLabel = {
  id: string;
  userId: string;
  name: string;
  color: "lime" | "blue" | "violet" | "rose" | "amber" | "slate";
  createdAt: string;
  updatedAt: string;
};
```

## NewLabel

```ts
type NewLabel = {
  name: string;
  color: "lime" | "blue" | "violet" | "rose" | "amber" | "slate";
};
```

## FinanceEntry

```ts
type FinanceEntry = {
  id: string;
  userId: string;
  type: "expense" | "income";
  title: string;
  amountMinor: number;
  currency: "JPY";
  occurredAt: string;
  paymentMethod: "cash" | "credit_card" | "bank_transfer" | "e_money" | "other";
  merchant: string | null;
  memo: string | null;
  isPrivate: boolean;
  createdAt: string;
  updatedAt: string;
  tags: FinanceTag[];
};
```

## FinanceTag

```ts
type FinanceTag = {
  id: string;
  userId: string;
  name: string;
  color: "lime" | "blue" | "violet" | "rose" | "amber" | "slate";
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
};
```

## NewFinanceTag

```ts
type NewFinanceTag = {
  name: string;
  color: "lime" | "blue" | "violet" | "rose" | "amber" | "slate";
};
```

## FinanceAnalyticsPoint

```ts
type FinanceAnalyticsPoint = {
  period: string;
  income: number;
  expense: number;
  net: number;
};
```

## ErrorResponse

```ts
type ErrorResponse = {
  error: string;
};
```

## Date Values

日時は ISO 8601 形式の文字列です。

```txt
2026-04-01T00:00:00.000Z
```

リクエストでも ISO 8601 形式を指定してください。
