# Multilingual Integration Guide

## ✅ Implementation Complete

Your Next.js App Router project now has full multilingual support with German (default) and English.

## 📁 File Structure

```
src/
├── app/
│   ├── [locale]/
│   │   ├── layout.tsx              # Locale-aware root layout
│   │   ├── page.tsx                # Redirects to /[locale]/dashboard
│   │   └── (dashboard)/
│   │       ├── layout.tsx          # Dashboard layout
│   │       └── dashboard/
│   │           └── page.tsx        # Example translated page
│   ├── layout.tsx                  # Root layout (pass-through)
│   └── page.tsx                    # Redirects to /de/dashboard
├── components/
│   └── common/
│       ├── language-switcher.tsx   # Language switcher component
│       ├── dashboard-shell.tsx     # Updated with translations
│       ├── sidebar-nav.tsx         # Updated with translations
│       └── topbar.tsx              # Updated with translations
├── i18n/
│   └── request.ts                  # next-intl configuration
├── lib/
│   └── i18n-utils.ts               # Helper functions for locale paths
└── types/
    └── i18n.d.ts                   # TypeScript types for translations

messages/
├── de.json                         # German translations
└── en.json                         # English translations

src/
└── proxy.ts                        # Next.js 16 middleware for routing
```

## 🔧 How It Works

### Routing
- **German (default)**: `/dashboard`, `/employees`, etc. (no prefix)
- **English**: `/en/dashboard`, `/en/employees`, etc. (with `/en` prefix)
- Root `/` redirects to `/de/dashboard`
- `/[locale]` redirects to `/[locale]/dashboard`

### Translation Files
- Located in `messages/de.json` and `messages/en.json`
- Nested structure: `sidebar.dashboard`, `employees.title`, etc.
- Type-safe with TypeScript

### Language Switcher
- Dropdown in topbar with flag icons
- Persists language selection across pages
- Updates URL while maintaining current page

## 📝 Next Steps: Migrate Your Pages

### 1. Move Pages to Locale Structure

Copy your existing pages from `(dashboard)/` to `[locale]/(dashboard)/`:

```bash
# Example: Copy dashboard page
cp src/app/(dashboard)/dashboard/page.tsx src/app/[locale]/(dashboard)/dashboard/page.tsx
```

### 2. Update Pages to Use Translations

**Before:**
```tsx
export default function EmployeesPage() {
  return (
    <section>
      <h1>Employees</h1>
      <Button>Add Employee</Button>
    </section>
  );
}
```

**After:**
```tsx
"use client";
import { useTranslations } from "next-intl";
import { createLocalizedPath } from "@/lib/i18n-utils";
import { useLocale } from "next-intl";

export default function EmployeesPage() {
  const t = useTranslations("employees");
  const locale = useLocale();
  
  return (
    <section>
      <h1>{t("title")}</h1>
      <Link href={createLocalizedPath("/employees/create", locale)}>
        <Button>{t("addEmployee")}</Button>
      </Link>
    </section>
  );
}
```

### 3. Update Links

**Before:**
```tsx
<Link href="/employees">Employees</Link>
```

**After:**
```tsx
import { createLocalizedPath } from "@/lib/i18n-utils";
import { useLocale } from "next-intl";

const locale = useLocale();
<Link href={createLocalizedPath("/employees", locale)}>Employees</Link>
```

### 4. Add Missing Translations

Add any missing keys to both `messages/de.json` and `messages/en.json`:

```json
{
  "employees": {
    "title": "Mitarbeiter",
    "addEmployee": "Mitarbeiter hinzufügen",
    "newKey": "New German Text"
  }
}
```

## 🎯 Usage Examples

### Client Components
```tsx
"use client";
import { useTranslations, useLocale } from "next-intl";
import { createLocalizedPath } from "@/lib/i18n-utils";

export default function MyComponent() {
  const t = useTranslations("employees");
  const locale = useLocale();
  
  return (
    <div>
      <h1>{t("title")}</h1>
      <Link href={createLocalizedPath("/employees", locale)}>
        {t("viewAll")}
      </Link>
    </div>
  );
}
```

### Server Components
```tsx
import { getTranslations } from "next-intl/server";

export default async function MyServerComponent() {
  const t = await getTranslations("employees");
  
  return <h1>{t("title")}</h1>;
}
```

### Dynamic Content Translation
For API/database content, you can:
1. Store translations in database
2. Use translation API
3. Use fallback to default language

Example:
```tsx
const translatedName = employee.nameTranslations?.[locale] || employee.name;
```

## 🔍 Testing

1. **Test German (default)**:
   - Visit `/dashboard` → Should show German
   - Visit `/employees` → Should show German

2. **Test English**:
   - Visit `/en/dashboard` → Should show English
   - Visit `/en/employees` → Should show English

3. **Test Language Switcher**:
   - Click language switcher in topbar
   - Should switch language and update URL
   - Should maintain current page

## 📚 Resources

- [next-intl Documentation](https://next-intl.dev/)
- [Next.js App Router i18n](https://nextjs.org/docs/app/building-your-application/routing/internationalization)

## ⚠️ Important Notes

1. **All dashboard pages** need to be copied to `[locale]/(dashboard)/`
2. **All links** should use `createLocalizedPath()` helper
3. **Translation keys** must exist in both `de.json` and `en.json`
4. **TypeScript** will warn if you use non-existent translation keys

## 🚀 Production Ready

- ✅ SEO-friendly (proper lang attributes)
- ✅ Type-safe translations
- ✅ Persistent language selection
- ✅ Fallback to default locale
- ✅ Server and client component support
- ✅ Optimized bundle size

