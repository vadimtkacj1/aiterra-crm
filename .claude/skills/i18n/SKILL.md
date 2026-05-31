---
name: i18n
description: Manage localization keys in this CRM project. Add, rename, remove, or list i18n translation keys across EN and HE locales simultaneously. Works with react-i18next JSON files in frontend/src/i18n/locales/{en,he}/. Triggers on: add translation, add i18n key, localization, locale, translate, i18n, add key to module, rename key, remove key, list keys, missing translation.
---

# i18n — Localization Skill

## Project Structure

```
frontend/src/i18n/locales/
  en/
    index.ts          ← imports all JSON modules + deepMerge
    admin-leads.json
    site.json
    core-shell.json
    ... (one JSON per feature module)
  he/
    index.ts          ← same structure
    admin-leads.json
    site.json
    ...
  mergeTranslations.ts
```

All keys use **dot notation** for nesting. Example: `admin.leads.title` maps to:
```json
{ "admin": { "leads": { "title": "..." } } }
```

## Commands

### /i18n add

Add a key to an existing or new module.

**Syntax:**
```
/i18n add <dot.key.path> "<EN value>" / "<HE value>" to <module>
/i18n add <dot.key.path> "<EN value>" "<HE value>" <module>
```

**Examples:**
```
/i18n add leads.title "Leads" / "לידים" to admin-leads
/i18n add site.hero.cta "Get Started" / "התחל" to site
/i18n add common.save "Save" / "שמור" to core-shell
```

**Steps to execute:**
1. Read `frontend/src/i18n/locales/en/<module>.json` (create if missing)
2. Read `frontend/src/i18n/locales/he/<module>.json` (create if missing)
3. Set the nested key using dot path in both files
4. Write both files back
5. If new module: register in both `index.ts` files (see Registration below)

### /i18n list

List all keys in a module.

**Syntax:**
```
/i18n list <module>
```

**Steps:** Read EN JSON file and display all keys flattened to dot notation with their values.

### /i18n rename

Rename a key across both locales.

**Syntax:**
```
/i18n rename <old.dot.path> to <new.dot.path> in <module>
```

**Steps:**
1. Read EN and HE JSON files
2. Copy value from old path to new path
3. Delete old path
4. Write both files

### /i18n remove

Remove a key from both locales.

**Syntax:**
```
/i18n remove <dot.key.path> from <module>
```

### /i18n sync

Find keys that exist in EN but not HE (or vice versa) in a module.

**Syntax:**
```
/i18n sync <module>
```

## Setting Nested Keys (Dot Notation)

When writing key `admin.leads.title` with value `"Leads"` into existing JSON:

```json
// Before
{ "admin": { "leads": { "menuTitle": "Landing page leads" } } }

// After adding admin.leads.title = "Leads"
{ "admin": { "leads": { "menuTitle": "Landing page leads", "title": "Leads" } } }
```

Always **merge**, never overwrite sibling keys.

## Registering a New Module in index.ts

When creating a new JSON module file, add to BOTH `en/index.ts` and `he/index.ts`:

**1. Import line** (add after last import, alphabetical order preferred):
```ts
import myNewModule from "./my-new-module.json";
```

**2. Add to deepMerge call** (add after last argument, before closing `)`):
```ts
const merged = deepMerge(
  {},
  ...existingModules,
  myNewModule,   // ← add here
);
```

## Existing Modules (as of 2026-05)

| File | Namespace |
|------|-----------|
| `admin-leads.json` | `admin.leads.*` |
| `site.json` | `site.*` |
| `core-shell.json` | layout, menu items |
| `core-account.json` | account settings |
| `admin-shell.json` | admin layout |
| `admin-contracts.json` | `admin.contracts.*` |
| `admin-invoices.json` | `admin.invoices.*` |
| `admin-stats.json` | `admin.stats.*` |
| `admin-audit.json` | `admin.audit.*` |
| `admin-topup.json` | `admin.topup.*` |
| `admin-payments-a.json` | `admin.payments.*` |
| `admin-payments-b.json` | `admin.paymentsB.*` |
| `admin-metaConnect.json` | `admin.metaConnect.*` |
| `analytics-shell.json` | analytics layout |
| `analytics-data.json` | analytics data labels |
| `billing-ui.json` | billing UI labels |
| `billing-checkout.json` | checkout flow |
| `billing-errors.json` | billing errors |
| `billing-contract.json` | contract billing |
| `contracts.json` | contracts feature |
| `memberContracts.json` | member contracts |
| `meta.json` | Meta Ads labels |
| `legal.json` | legal pages |
| `errors.json` | global errors |
| `common-enhanced.json` | shared UI labels |

## Rules

- Always update **both** EN and HE at the same time — never one without the other
- Preserve existing JSON formatting (2-space indent)
- Never delete keys without explicit `/i18n remove` command
- If HE value not provided, add `"TODO: translate"` placeholder and note it
- Keep JSON keys in the same order as they appear in the file (append new ones at end of their object)
