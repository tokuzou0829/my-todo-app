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
