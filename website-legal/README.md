# GeoCart legal pages (geocart.app)

Production-ready Next.js App Router pages generated from a full audit of this repository (see `../LEGAL_AUDIT.md`). Copy the `app/` subfolders into the geocart.app Next.js project. Routes intentionally match what the shipped app already links to (`app/(tabs)/settings.tsx` → `/privacy`, `/terms`, `/licenses`).

## Pages

| Route | File | Linked from app? |
|---|---|---|
| `/privacy` | `app/privacy/page.tsx` | ✅ Settings |
| `/terms` | `app/terms/page.tsx` | ✅ Settings |
| `/licenses` | `app/licenses/page.tsx` | ✅ Settings |
| `/subscription-terms` | `app/subscription-terms/page.tsx` | ➕ add to Settings + paywall |
| `/location-disclosure` | `app/location-disclosure/page.tsx` | ➕ add to Settings/onboarding |
| `/data-deletion` | `app/data-deletion/page.tsx` | ➕ add to Settings |
| `/cookies` | `app/cookies/page.tsx` | footer only |
| `/disclaimer` | `app/disclaimer/page.tsx` | footer only |

Still needed (not legal documents, not generated): `/help` — the app links to it from Settings → Help & Support.

## Site footer (add to the root layout)

```tsx
<footer>
  <nav aria-label="Legal">
    <a href="/privacy">Privacy Policy</a>
    <a href="/terms">Terms of Service</a>
    <a href="/subscription-terms">Subscription Terms</a>
    <a href="/location-disclosure">Location Services</a>
    <a href="/data-deletion">Data Deletion</a>
    <a href="/licenses">Licenses</a>
    <a href="/disclaimer">Disclaimer</a>
    <a href="/cookies">Cookie Policy</a>
    <a href="/help">Support</a>
  </nav>
  <p>
    Store data ©{" "}
    <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>{" "}
    (ODbL). Apple, the Apple logo, and App Store are trademarks of Apple Inc.
  </p>
  <p>© 2026 GeoCart · Ertuğrul Ünal. All rights reserved.</p>
</footer>
```

## App Store Connect

- **Privacy Policy URL** (required): `https://geocart.app/privacy`
- **Support URL**: `https://geocart.app/help`
- **EULA**: either accept Apple's standard EULA or supply `https://geocart.app/terms`
- **Privacy Nutrition Labels** (per `LEGAL_AUDIT.md §11`): Location (Precise) → App Functionality, not linked, no tracking; Purchases → App Functionality, not linked; Identifiers → User ID (anonymous RevenueCat ID) → App Functionality, not linked; Tracking: none.

## In-app changes required before release (see LEGAL_AUDIT.md Phase 5)

1. Replace the hardcoded RevenueCat **test** API key (`app/_layout.tsx`).
2. Remove/rework the mock "Pro Active / Next Billing" data in `app/pro.tsx`.
3. Remove the hidden `profile.tsx` mock account + `i.pravatar.cc` fetch.
4. Gate the Debug section in Settings behind `__DEV__`.
5. Add OSM attribution ("© OpenStreetMap contributors") on both map screens and in Settings → About.
6. Fix the App Store rate link (`id0000000000`) and Play package name.
7. Add Privacy + Terms + Subscription Terms links to the paywall (RevenueCat template + `/pro` screen).
8. Soften the onboarding claim "Your Location Stays Private" to "Processed on your device — only an approximate area is sent to map-data servers."
9. Remove the unused `fetch` background mode from `UIBackgroundModes`, or implement/justify it.
10. Set RevenueCat log level to ERROR for release builds.
