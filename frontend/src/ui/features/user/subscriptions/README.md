# Subscription Feature Structure

Clean, reusable architecture for subscription management across admin and user interfaces.

## Directory Structure

```
frontend/src/ui/
├── features/
│   ├── subscriptions/              # Shared subscription components
│   │   ├── components/
│   │   │   ├── SubscriptionOverview.tsx          # Displays subscription details
│   │   │   ├── SubscriptionPaymentHistory.tsx    # Payment history table
│   │   │   └── SubscriptionTestMode.tsx          # Test mode controls (admin only)
│   │   ├── hooks/
│   │   │   └── useSubscriptionStatus.ts          # Fetch & manage subscription data
│   │   └── index.ts                              # Exports all components
│   │
│   ├── admin/
│   │   └── pages/
│   │       └── admin-contracts/
│   │           └── SubscriptionStatusModal.tsx   # Admin modal (uses shared components)
│   │
│   └── user/                                     # Future: user-facing subscription views
│       └── pages/
│           └── my-subscriptions/
│               └── MySubscriptionsPage.tsx       # User page (uses shared components)
│
└── shared/
    └── utils/
        └── subscriptionUtils.ts                  # Shared utilities (formatMoney, etc.)
```

## How to Add New Components

### 1. For Admin Features

Create in `features/admin/pages/` and import shared components:

```tsx
import { SubscriptionOverview, useSubscriptionStatus } from "../../../subscriptions";

export function AdminSubscriptionPage() {
  const { status, loading } = useSubscriptionStatus(contractId);
  return <SubscriptionOverview status={status} t={t} />;
}
```

### 2. For User Features

Create in `features/user/pages/` and import the same shared components:

```tsx
import { SubscriptionPaymentHistory, useSubscriptionStatus } from "../../../subscriptions";

export function MySubscriptionsPage() {
  const { status, loading } = useSubscriptionStatus(contractId);
  return <SubscriptionPaymentHistory payments={status.payments} currency="ILS" t={t} />;
}
```

### 3. Adding New Shared Components

Add to `features/subscriptions/components/`:

```tsx
// features/subscriptions/components/SubscriptionCard.tsx
export function SubscriptionCard({ status, t }: Props) {
  return <Card>...</Card>;
}

// Export in features/subscriptions/index.ts
export { SubscriptionCard } from "./components/SubscriptionCard";
```

## Shared Utilities

All formatting and helper functions are in `shared/utils/subscriptionUtils.ts`:

- `formatMoney(amount, currency)` - Format currency
- `formatDate(date)` - Format date
- `formatDateTime(date)` - Format date + time
- `getSubscriptionStatusColor(status)` - Get Ant Design color for status
- `getPaymentStatusColor(status)` - Get Ant Design color for payment status

## Benefits

✅ **No Code Duplication** - Shared components used by both admin and user interfaces
✅ **Easy to Extend** - Add new features by composing existing components
✅ **Consistent UI** - Same look and feel across admin and user views
✅ **Type Safety** - TypeScript interfaces shared across all components
✅ **Single Source of Truth** - Business logic in hooks, presentation in components

## Example: Adding User Subscription View

```tsx
// features/user/pages/my-subscriptions/MySubscriptionsPage.tsx
import { Space } from "antd";
import { useTranslation } from "react-i18next";
import { 
  SubscriptionOverview, 
  SubscriptionPaymentHistory,
  useSubscriptionStatus 
} from "../../../subscriptions";

export function MySubscriptionsPage() {
  const { t } = useTranslation();
  const { status, loading } = useSubscriptionStatus(contractId);

  return (
    <Space direction="vertical" size={20} style={{ width: "100%" }}>
      {status && (
        <>
          <SubscriptionOverview status={status} t={t} />
          <SubscriptionPaymentHistory 
            payments={status.payments} 
            currency={status.currency} 
            t={t} 
          />
        </>
      )}
    </Space>
  );
}
```

That's it! No need to rewrite any logic or components.
