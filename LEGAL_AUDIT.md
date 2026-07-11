# GeoCart — Legal & Privacy Audit

Audit date: July 11, 2026 · Codebase: `SmartShopper` (Expo SDK 54, app name **GeoCart**, iOS bundle `com.unalertu.smartshopper`, version 1.0.0)

This document is the internal legal inventory (Phases 1–2), website integration guidance (Phase 4), and the final compliance report (Phase 5). The generated legal pages live in `website-legal/`.

---

## 1. Permissions requested

| Permission | Why | When requested | Optional? | Degradation if denied |
|---|---|---|---|---|
| **Location — When In Use** (iOS `NSLocationWhenInUseUsageDescription`) | Show user position on map, find nearby stores | Onboarding "location" page (`app/onboarding.tsx:182`) | Yes | Map centers on default region; no nearby search; no reminders |
| **Location — Always / Background** (`NSLocationAlwaysAndWhenInUseUsageDescription`, `UIBackgroundModes: location`) | Detect proximity to stores while app is closed, fire local reminders | Onboarding, immediately after foreground grant (`onboarding.tsx:186`); re-checked at launch | Yes | No background reminders; foreground features still work. `startBackgroundLocationTracking` silently no-ops without grant (`services/locationService.ts:445-455`) |
| **Notifications** (`POST_NOTIFICATIONS` on Android) | Deliver local store reminders and scheduled list reminders | Onboarding notification page via `setupNotifications()` (`services/notificationService.ts:26-35`) | Yes | No alerts; in-app notification history still records nothing new (send path requires permission) |
| Android manifest also declares | `ACCESS_FINE/COARSE_LOCATION`, `ACCESS_BACKGROUND_LOCATION`, `FOREGROUND_SERVICE(_LOCATION)`, `POST_NOTIFICATIONS` (`app.json:36-48`) | — | — | — |

**Not requested / not used:** Camera, Photos, Contacts, Microphone, Bluetooth, Motion, HealthKit, ATT/advertising identifiers, Face ID, Siri. No `expo-camera`, `expo-contacts`, `expo-image-picker`, `expo-device` in the dependency tree's usage. `expo-sharing` and `expo-file-system` are installed but **unused** in source (candidates for removal).

## 2. Data collected

All app data is **stored locally on device in AsyncStorage** (unencrypted app-sandbox storage). There is **no server, no account, no analytics SDK, no crash-reporting SDK, no advertising SDK**. Only two services receive data off-device (see §3).

| Data | Why | Where stored | Retention | Shared/transmitted | Optional |
|---|---|---|---|---|---|
| Shopping lists (names, timestamps) | Core feature | `lists-storage` | Until user deletes / Reset App Data / uninstall | Never leaves device (item names appear in local notification text only) | User-created |
| Shopping items (name, qty, unit, category, purchased flag) | Core feature | `shopping-list-storage` | Same; optional 7-day auto-delete of purchased items (`_layout.tsx:214-229`) | No | User-created |
| Saved stores (name, address, lat/lon, active flag) | Geofenced reminders | `location-storage` → `locations` | Until deleted | Coordinates registered with iOS geofencing (on-device OS service) | User-created |
| Muted shops (OSM IDs) | Suppress alerts | `location-storage` → `mutedUnsavedShops` | Until unmuted/reset | No | Yes |
| Cached nearby stores (OSM ID, name, lat/lon, lastSeenAt) | Offline reminder matching, map markers | `location-storage` → `cachedMarkets` | 30-day TTL, max 5,000 entries (`constants/index.ts:58-59`) | Sourced *from* Overpass; not sent anywhere | Automatic when background discovery on |
| Last background fetch coordinates | Throttle Overpass fetches (1.5 km) | `location-storage` → `lastBackgroundFetchCoords` (persisted) | Overwritten on each fetch | No | — |
| Current location | Map display, proximity engine | In-memory only (`userLocation` not persisted; `partialize` at `useLocationStore.ts:252-256`) | Session | Derived bounding box sent to Overpass (§3) | Permission-gated |
| Notification history (title, body, storeId, listId, timestamp, read) | In-app notification center | `notification-analytics-v1` | Most recent 30 entries (`MAX_NOTIFICATION_HISTORY: 30`) | No | Clearable in app |
| Notification cooldown state incl. **coordinates of last alert** | Cooldowns, trip suppression | `notification-analytics-v1` (`lastNotificationCoords`) | Overwritten per alert; daily counters reset daily | No | — |
| Usage stats (lifetime reminders sent, trips, store visits, last visit date per store) | "Your GeoCart Impact" UI | `stats-storage-v2` | Until reset/uninstall | No | — |
| Activity log (list/item events with names + timestamps) | Activity timeline UI | `activity-storage` | Until reset | No | — |
| Settings (all toggles, schedule, sensitivity, snooze, theme, distance unit, `isPro`) | Preferences | `settings-storage` (v3, migrated) | Until reset | No | — |
| Quick-start template usage counts | Sort templates | `quick-start-storage` | Until reset | No | — |
| Subscription status (`isPro` boolean) | Feature gating | `settings-storage`; source of truth is RevenueCat entitlement | Synced from RevenueCat | Purchase handled by Apple + RevenueCat | — |
| Device locale/region | Default metric vs imperial unit | Read at runtime via `expo-localization` (`useSettingsStore.ts:12-22`); not stored | — | No | — |
| Debug logs & metrics (location fixes, speeds, store names, execution counts) | Location Debugger screen | **In-memory only** (not persisted), capped 100 lines | Session | User can copy to clipboard (`app/debug.tsx:78`) | Debug screen is reachable in production builds — flagged in §10 |

## 3. Third-party services

| Service | What it receives | Notes |
|---|---|---|
| **Apple (App Store / StoreKit)** | Purchase, billing, subscription management; standard app-usage data Apple collects itself | Payments never touch app code; refunds/cancellation are Apple-managed |
| **Apple Maps (MapKit via react-native-maps, default provider)** | Map tile requests → viewport region, IP address, device Apple identifiers per Apple's OS policies | No `PROVIDER_GOOGLE` anywhere; iOS uses Apple Maps. Governed by Apple's privacy policy |
| **RevenueCat, Inc. (US)** | Anonymous app user ID (RC-generated), App Store receipt/transactions, device model, OS + app version, locale, entitlement state | `react-native-purchases` 10.4, configured in `app/_layout.tsx:174-212`. ⚠ Hardcoded **test** key `test_ekQnmm…` — must be replaced with real public SDK key before release. No `logIn`/custom user IDs → anonymous |
| **Overpass API mirrors** (OpenStreetMap data): `overpass.kumi.systems` (Kumi Systems e.U., AT), `overpass-api.de` (FOSSGIS e.V., DE), `overpass.private.coffee` (Private.coffee, AT) | POST body: bounding-box coordinates derived from user location (~2.5 km box in background, visible map area in foreground) + store-category query; plus IP address and standard HTTP headers. **No user identifier, no auth** | `services/overpassService.ts`. This is the only flow where location-derived data leaves the device. Mirrors are volunteer/free services with fair-use policies |
| **i.pravatar.cc** | HTTP GET for a placeholder avatar (`app/(tabs)/profile.tsx:88`) when hidden profile screen renders for Pro users | ❌ Leftover mock; remove before release |
| **Expo (EAS Build/Updates)** | Build-time only; `expo-dev-client`/`EXUpdatesInterface` present but no OTA update URL configured — no runtime phoning home found | Dev tooling |
| **Not present** | Google Sign-In, Apple Sign-In, Firebase, analytics, crash reporting, ads, remote push (no APNs token registration — notifications are 100% local), CDNs, custom backend | Verified by dependency + source grep |

## 4. Subscription system (RevenueCat)

- **Product**: "GeoCart Pro" — single entitlement `pro`; UI copy implies a **Yearly Plan** (`app/pro.tsx:213`). Actual products/prices come from the RevenueCat-hosted paywall (`RevenueCatUI.presentPaywallIfNeeded`, `services/paywallService.ts:25`).
- **Billing flow**: RevenueCat paywall → StoreKit purchase → entitlement listener updates `isPro` (`_layout.tsx:202-206`) → `/purchase-success` screen.
- **Restore purchases**: Settings row calls `Purchases.restorePurchases()` (`settings.tsx:682`). ✅ Required by Apple; present.
- **Cancellation**: deep links to `https://apps.apple.com/account/subscriptions`; in-app copy correctly says benefits last until period end (`pro.tsx:127-140`).
- **Trials/intro offers**: none configured in code; determined by App Store Connect/RC dashboard.
- **Refunds**: not handled in-app → Apple.
- **Downgrade handling**: losing entitlement resets Pro-only settings (`useSettingsStore.ts:166-185`). Free tier: 4 lists, 25 items/list, 4 saved stores, 4 location alerts/day (`constants/tierConfig.ts:12-26`; note settings default `maxAlertsPerDay: 5` is inconsistent with tier config's 4).
- ❌ `pro.tsx` shows **hardcoded mock data**: "Pro Active", "Next Billing: Oct 24, 2026", "Member Since: Oct 24, 2023", "View Receipt" that just opens the subscriptions page. Apple review + consumer-deception risk; must be wired to `CustomerInfo` or removed.

## 5. Notifications

- **Local only.** No remote push, no push tokens, no APNs registration.
- Triggers: (1) background location pipeline (§6); (2) native geofence enters for saved stores; (3) scheduled "unfinished list" reminder +3 days; (4) "empty list" reminder +7 days (`services/notificationEngine.ts:192-320`); (5) local welcome entry (history only, no system notification).
- Guardrails (all on-device): global cooldown 15 min; per-store cooldown 8 h; per-store daily cap 2; user daily cap (free default ~4-5/day, Pro unlimited); trip suppression 300 m / 30 min; default delivery window 08:00–22:00 every day (free users cannot change it; Pro Smart Schedule can); snooze/mute options; fingerprint dedup.
- iOS limitations that belong in user-facing disclosure: delivery depends on iOS background execution, Low Power Mode, Focus modes; alerts can be delayed, skipped, or (rarely) fire when passing by.

## 6. Background location

- Continuous background updates: `Accuracy.Balanced`, `timeInterval: 60000` (ignored by iOS), `distanceInterval: 300` m, `showsBackgroundLocationIndicator: true` (`locationService.ts:447-452`). So on iOS: roughly one fix per 300 m of movement.
- Per-fix pipeline: settings guard → GPS accuracy filter (reject >80 m) → staleness filter (30 s) → speed filter (avg > 25 km/h ignored) → stop-confirmation anchor (60 s stationary within 60 m) → dwell (20 s) → two-zone trigger (inner ~55% of radius, min 45 m) → cooldowns/caps → local notification.
- Alert radius user-selectable: near 50 m / balanced 100 m / far 200 m; density adaptation shrinks radius in dense areas (min 100 m).
- Native geofences: up to 20 nearest saved stores, min radius 150 m, enter-only, rebalanced after ≥1 km movement.
- **Tracking stops**: "Saved Stores Only" mode stops continuous updates entirely (geofences only) (`locationService.ts:434-442`); disabling notifications stops alerts; revoking permission stops everything. Cleanup clears all in-memory state (`stopBackgroundLocationTracking`).
- Battery design: Balanced accuracy, distance pacing, fetch throttling (1.5 km), no timers when queue empty.

## 7. Storage inventory (AsyncStorage keys)

`settings-storage` (v3) · `lists-storage` · `shopping-list-storage` · `location-storage` · `stats-storage-v2` · `activity-storage` · `quick-start-storage` · `notification-analytics-v1`. Plus in-memory: map region cache (12 regions/10 min TTL, `MapCacheManager`), debug logs. **SecureStore: not used** (nothing secret is stored; acceptable).

## 8. User-generated content & IP

- Lists, items, saved stores, notes, preferences: **owned by the user**, stored only on their device. App claims no license (nothing is uploaded).
- App code/branding: developer's property.
- Store/POI data: **© OpenStreetMap contributors, ODbL** — cached in-app; attribution **required** and currently **missing everywhere** (map screens use Apple tiles, but the store *markers/data* are OSM-derived).
- Third-party OSS: MIT/ISC/Apache-2.0 dependencies (see licenses page).

## 9. Security

- All endpoints HTTPS; ATS arbitrary loads disabled (`NSAllowsArbitraryLoads: false`; local networking allowed for dev).
- No auth, no tokens, no secrets at rest. Only embedded key is the RevenueCat public SDK key — currently a **test placeholder** (`_layout.tsx:179`).
- `console.*` stripped in production except `error`/`warn` (`babel.config.js`), but RevenueCat log level is **DEBUG** unconditionally (`_layout.tsx:178`) — set to `ERROR`/remove for release.
- Debug screen (`/debug`) with live location logs + clipboard export is reachable from Settings in production builds.
- AsyncStorage is unencrypted but iOS-sandboxed and included in device encryption; contents are low-sensitivity except location traces in notification analytics.
- `ITSAppUsesNonExemptEncryption: false` correctly declared (HTTPS-only exemption).

## 10. Limitations users must be told about

GPS inaccuracy/urban drift · iOS background throttling, Low Power Mode, Focus · reminders not guaranteed (delays, misses, false positives/negatives by design thresholds) · min effective radii (45–150 m) · quiet window 08:00–22:00 default · daily/cooldown caps · offline mode (cached stores only, cache ≤30 days stale) · OpenStreetMap data accuracy/completeness (includes pharmacies) · network dependence on free volunteer-run Overpass mirrors (rate limits/outages) · "Always Allow" required for background reminders.

## 11. Compliance evaluation

**Apple App Store / Privacy Nutrition Labels** — declare:
- *Location (Precise)* → App Functionality, **not linked to identity**, no tracking. (Transmitted off-device as bounding boxes to Overpass ⇒ counts as "collected" under Apple's definition.)
- *Purchases* → App Functionality, not linked (RevenueCat anonymous ID).
- *Identifiers → User ID* (RevenueCat anonymous app user ID) → App Functionality, not linked to identity.
- "Data Used to Track You: None". No ATT prompt needed.

**GDPR** — controller is the developer. Legal bases: consent (background location, notifications), contract (core features), legitimate interest (fraud-free subscription validation). Data minimization is genuinely strong (on-device processing). Required: privacy policy naming Overpass mirror operators + RevenueCat as recipients, international transfer note (RevenueCat US — SCCs/DPF), rights mechanism (local deletion + email). No DPO/representative likely required at this scale, but note obligations if user base grows.

**CCPA/CPRA** — almost certainly below thresholds (no sale/share, no revenue from data). Include a short "we do not sell or share personal information" statement.

**ODbL (OpenStreetMap)** — attribution required in-app and on website wherever OSM-derived store data appears.

---

## Phase 4 — Website integration (geocart.app)

Routes must match what the app already links to: **`/privacy`**, **`/terms`**, **`/licenses`**, **`/help`** (`settings.tsx:422-712`). The generated pages in `website-legal/app/` use exactly these paths, plus `/cookies`, `/data-deletion`, `/subscription-terms`, `/location-disclosure`, `/disclaimer`.

**Footer (every page):**
```
© 2026 GeoCart · Privacy Policy · Terms of Service · Subscription Terms ·
Location Services · Data Deletion · Licenses · Disclaimer · Cookie Policy · Support
Store data © OpenStreetMap contributors (ODbL)
Apple, the Apple logo, and App Store are trademarks of Apple Inc.
```

**App Store product page**: link Privacy Policy URL (required field) → `https://geocart.app/privacy`; Support URL → `https://geocart.app/help`; add Terms (EULA) URL → `https://geocart.app/terms` or accept Apple's standard EULA.

**In-app additions recommended**: OSM attribution line on both map screens and in Settings → About; add Subscription Terms + Privacy links on the paywall (Apple Guideline 3.1.2 requires terms of the subscription and privacy policy accessible from the purchase flow — configure links in the RevenueCat paywall template too).

---

## Phase 5 — Final report

### ✅ Already covered
- Restore Purchases in Settings (Apple 3.1.1 requirement)
- Cancel/manage subscription flow with correct "until period end" copy
- Purpose strings for all three location permission keys, consistent app.json/Info.plist
- ATS enforced; HTTPS everywhere; encryption-exemption declared
- Local-only data model; no analytics/ads/tracking; no ATT needed
- In-app full data deletion (Reset App Data) and cache clearing
- Notification quiet window, caps and cooldowns (good-faith anti-spam design)
- Background indicator enabled (`showsBackgroundLocationIndicator`)
- Onboarding explains why "Always Allow" is needed before prompting
- Console stripping in production builds

### ⚠ Missing disclosures
- No OSM/ODbL attribution anywhere in app or (planned) website
- Onboarding says "Your Location Stays Private — used only for nearby store reminders" but location-derived bounding boxes are sent to third-party Overpass servers; wording should be "processed on your device; only an approximate area is sent to map-data servers"
- Paywall lacks visible links to Privacy Policy / Terms / auto-renewal disclosure (Apple 3.1.2)
- No in-app link to the Location Services Disclosure

### ❌ Potential legal risks
- **Mock subscription data** in `app/pro.tsx` (hardcoded "Pro Active", billing dates, "View Receipt") — deceptive if shipped
- Hidden `profile.tsx` screen with fake account ("Arda", `test@gmail.com`) and third-party avatar fetch (`i.pravatar.cc`) — undeclared network call
- Governing-law / developer-identity details must be confirmed (documents assume the developer is the controller, contact `unlertu@gmail.com`, governing law Türkiye)

### ❌ Apple review risks
- RevenueCat configured with a **test API key** — purchases will fail in review
- Mock "Pro Active" screen (2.3.1 inaccurate metadata / misleading UI)
- Debug section ("Test Notification Flow", "Location Debugger") visible in production Settings (2.3.1 hidden/incomplete features; also exposes location logs)
- App Store "Rate" link uses placeholder `id0000000000`; Play link uses wrong package `com.geocart.app` (actual: `com.unalertu.smartshopper`)
- Share message links `https://geocart.app` — site must exist at review time
- Background location (2.5.4/5.1.1): expect reviewer scrutiny; the Location Services Disclosure page + demo video of the reminder flow will help
- `UIBackgroundModes: fetch` is declared but **no background fetch task is registered** — remove the mode or justify it

### ❌ GDPR risks
- Overpass mirrors receive location-derived data + IP with no DPA (they're public volunteer services). Mitigation: disclose plainly, minimize (already bbox-level), and offer "Saved Stores Only" mode as a no-third-party alternative — all now covered in the privacy policy
- RevenueCat US transfer must be disclosed (done in generated policy); verify RevenueCat DPA is accepted in their dashboard
- No records/DPIA exist; a short DPIA for background location is recommended (template section included in audit)

### ❌ Privacy issues
- `lastNotificationCoords` + `lastBackgroundFetchCoords` persist location at rest — fine, but must be (and now is) disclosed
- Debug screen clipboard export of location logs in production
- `i.pravatar.cc` request (remove)
- RevenueCat DEBUG logging in release builds

### ❌ Subscription issues
- Test key; mock billing dates; free-tier limit inconsistency (tierConfig says 4/day, settings default 5/day — pick one); "View Receipt" mislabeled; no price/renewal disclosure text near paywall CTA (Apple template may cover; verify)

### ❌ Attribution issues
- OpenStreetMap ODbL attribution missing in-app (map screens + about) and on website (now included in generated footer/licenses page)
- Overpass mirror operators uncredited (credited on licenses page now)

### ❌ Missing pages (all now generated in `website-legal/`)
- /privacy · /terms · /cookies · /data-deletion · /subscription-terms · /location-disclosure · /licenses · /disclaimer (and /help still needs real content — not a legal doc, not generated)

### ❌ Missing footer links / settings links
- Website footer spec above; in-app Settings should add: Subscription Terms, Location Services Disclosure, Data Deletion links (currently only Privacy/Terms/Licenses)

### ❌ Missing in-app disclosures
- OSM attribution; paywall legal links; corrected onboarding privacy claim; optional "What data leaves my device?" row in Settings linking to /privacy#third-parties
