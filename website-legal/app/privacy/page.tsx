import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — GeoCart",
  description:
    "How GeoCart handles your data: everything stays on your device, no accounts, no analytics, no ads.",
};

export default function PrivacyPolicyPage() {
  return (
    <main>
      <article>
        <header>
          <h1>GeoCart Privacy Policy</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
          <p>
            GeoCart is a shopping-list app that reminds you about your list
            when you are near a store. It is built local-first: your lists,
            saved stores, and settings live only on your device. GeoCart has
            no user accounts, no sign-in, no advertising, no analytics SDKs,
            and no crash-reporting SDKs. We do not sell, rent, or share your
            personal information with anyone for marketing purposes, and we
            do not use your data to track you across apps or websites.
          </p>
          <p>
            This policy explains exactly what data the app handles, the two
            narrow cases where data leaves your device, and your choices and
            rights.
          </p>
        </header>

        <section id="controller">
          <h2>1. Who is responsible</h2>
          <p>
            GeoCart is developed and operated by Ertuğrul Ünal, an independent
            developer (the &ldquo;developer&rdquo;, &ldquo;we&rdquo;). For any
            privacy question or request, contact:
          </p>
          <p>
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>
          </p>
          <p>
            For users in the European Economic Area, the United Kingdom, and
            other jurisdictions with similar laws, the developer is the data
            controller for the limited processing described in this policy.
          </p>
        </section>

        <section id="data-on-device">
          <h2>2. Data stored on your device (never uploaded by us)</h2>
          <p>
            The following data is created by you or by the app and is stored
            only in the app&rsquo;s private storage on your device. We have no
            server and no ability to access it:
          </p>
          <ul>
            <li>
              <strong>Shopping lists and items</strong> — list names, item
              names, quantities, units, categories, purchased status, and
              timestamps.
            </li>
            <li>
              <strong>Saved stores</strong> — the name, address, and map
              coordinates of stores you choose to save, and whether alerts for
              each are active or muted.
            </li>
            <li>
              <strong>Nearby-store cache</strong> — names and coordinates of
              stores near places you have been, downloaded from OpenStreetMap
              (see section 4). Cached entries expire after 30 days and the
              cache is capped at 5,000 entries.
            </li>
            <li>
              <strong>Notification history</strong> — the most recent
              reminders the app showed you (title, text, related store and
              list, time, read status), including the approximate location
              where the most recent alert fired. The app uses this to enforce
              its own anti-spam rules (cooldowns, daily limits).
            </li>
            <li>
              <strong>Settings and preferences</strong> — notification
              toggles, alert distance, schedules, quiet hours, snooze state,
              sound/haptics, theme, and distance unit.
            </li>
            <li>
              <strong>Usage statistics</strong> — on-device counters such as
              lifetime reminders sent, shopping trips assisted, and store
              visits, shown to you in the app. These never leave your device.
            </li>
            <li>
              <strong>Activity timeline</strong> — a local log of your own
              list edits (items added, completed, removed) shown in the app.
            </li>
            <li>
              <strong>Subscription status</strong> — a simple flag recording
              whether GeoCart Pro is active, derived from Apple/RevenueCat
              (see section 5).
            </li>
          </ul>
          <p>
            Your device&rsquo;s language and region setting is read once to
            choose a default distance unit (kilometers or miles); it is not
            stored or transmitted.
          </p>
          <p>
            You can erase all of this data at any time in{" "}
            <em>Settings → Danger Zone → Reset App Data</em>, or by deleting
            the app. See our{" "}
            <a href="/data-deletion">Data Deletion Policy</a>.
          </p>
        </section>

        <section id="location">
          <h2>3. Location data</h2>
          <p>
            Location is the most sensitive data GeoCart uses, so here is the
            complete picture:
          </p>
          <ul>
            <li>
              <strong>While you use the app</strong>, your location is used to
              center the map and find stores near you.
            </li>
            <li>
              <strong>In the background</strong> (only if you grant
              &ldquo;Always&rdquo; location access), iOS wakes the app roughly
              every 300 meters of movement. The app then decides, entirely on
              your device, whether you have stopped near a store on your list
              radius. Proximity detection, dwell timing, speed filtering, and
              every notification decision run locally.
            </li>
            <li>
              <strong>Your location history is not recorded.</strong> The app
              keeps only transient working state: the coordinates of the last
              alert (to avoid duplicate alerts on the same trip) and the
              coordinates of the last store-data download (to avoid
              re-downloading). No movement log or trail is stored, and nothing
              is uploaded to us — we have no server.
            </li>
            <li>
              <strong>What leaves the device:</strong> to learn which stores
              exist around you, the app sends a rectangular map area (a
              bounding box roughly 2.5 km across in the background, or the
              visible map area when you browse the map) to OpenStreetMap
              Overpass servers (section 4). The request contains only that
              rectangle and the store categories to search — no name, no
              account, no device identifier, no advertising ID.
            </li>
            <li>
              <strong>You are always in control.</strong> Background reminders
              are optional. The &ldquo;Saved Stores Only&rdquo; mode stops
              continuous background location entirely and relies solely on the
              operating system&rsquo;s geofences around the stores you saved
              (in that mode, no map-area requests are made in the background
              at all). You can revoke location access at any time in iOS
              Settings; the app keeps working as a normal shopping-list app.
            </li>
            <li>
              iOS shows its standard indicator when an app can use your
              location in the background; GeoCart does not suppress it.
            </li>
          </ul>
          <p>
            Full technical detail is published in our{" "}
            <a href="/location-disclosure">Location Services Disclosure</a>.
          </p>
        </section>

        <section id="third-parties">
          <h2>4. Third parties that receive data</h2>
          <p>Exactly three parties can receive data when you use GeoCart:</p>

          <h3>4.1 OpenStreetMap Overpass API servers</h3>
          <p>
            Store locations come from OpenStreetMap, a community-maintained
            open map database. The app queries one of the following public
            Overpass API servers:
          </p>
          <ul>
            <li>
              <code>overpass-api.de</code> — operated by FOSSGIS e.V.
              (Germany)
            </li>
            <li>
              <code>overpass.kumi.systems</code> — operated by Kumi Systems
              e.U. (Austria)
            </li>
            <li>
              <code>overpass.private.coffee</code> — operated by
              Private.coffee (Austria)
            </li>
          </ul>
          <p>
            Each request contains a geographic rectangle and the store
            categories to search (supermarkets, convenience stores, grocery
            stores, department stores, pharmacies). Like any internet request,
            it also technically exposes your IP address to the server
            operator. These are independent, volunteer-operated public
            services; they are not our processors, and their own policies
            apply to their server logs. We deliberately send no identifiers
            with these requests. If you prefer that no map-area requests
            happen in the background, enable &ldquo;Saved Stores Only&rdquo;
            in Settings.
          </p>

          <h3>4.2 RevenueCat (subscription management)</h3>
          <p>
            GeoCart Pro purchases are processed by Apple and validated through
            RevenueCat, Inc. (San Francisco, USA). RevenueCat receives: a
            randomly generated anonymous app-user ID (created by the SDK, not
            linked to your name or email — GeoCart has neither), your App
            Store purchase receipt and transaction history for this app, the
            device model, operating-system version, app version, and locale.
            RevenueCat uses this solely to determine whether your Pro
            entitlement is active. See the{" "}
            <a
              href="https://www.revenuecat.com/privacy"
              rel="noopener noreferrer"
            >
              RevenueCat Privacy Policy
            </a>
            . Transfers to the United States are safeguarded by RevenueCat&rsquo;s
            standard contractual clauses / EU&ndash;US Data Privacy Framework
            participation.
          </p>

          <h3>4.3 Apple</h3>
          <p>
            Apple processes your payment and subscription under your Apple
            Account and Apple&rsquo;s own terms and privacy policy; we never
            see your payment details. The in-app map is Apple Maps (MapKit),
            which loads map imagery from Apple; those requests are made by the
            operating system under{" "}
            <a href="https://www.apple.com/legal/privacy/" rel="noopener noreferrer">
              Apple&rsquo;s Privacy Policy
            </a>
            . Reminders are local notifications generated on your device; they
            are not sent through any push-notification server.
          </p>

          <p>
            <strong>That is the complete list.</strong> GeoCart contains no
            analytics, no advertising SDKs, no crash reporters, no social
            SDKs, and no tracking of any kind as defined by Apple&rsquo;s App
            Tracking Transparency framework.
          </p>
        </section>

        <section id="legal-bases">
          <h2>5. Legal bases (GDPR)</h2>
          <ul>
            <li>
              <strong>Consent</strong> (Art. 6(1)(a)) — location access and
              notifications, granted through the iOS permission prompts and
              revocable at any time in iOS Settings.
            </li>
            <li>
              <strong>Performance of a contract</strong> (Art. 6(1)(b)) —
              storing your lists and settings so the app works, and processing
              your purchase to provide GeoCart Pro.
            </li>
            <li>
              <strong>Legitimate interests</strong> (Art. 6(1)(f)) —
              validating subscription entitlements to prevent fraud.
            </li>
          </ul>
        </section>

        <section id="retention">
          <h2>6. Retention</h2>
          <ul>
            <li>
              On-device data: kept until you delete it in the app or uninstall
              GeoCart. Optional setting: purchased items auto-delete after 7
              days.
            </li>
            <li>Nearby-store cache: 30 days per entry, max 5,000 entries.</li>
            <li>Notification history: most recent entries only (currently 30).</li>
            <li>
              Alert-location working state: overwritten on each new alert.
            </li>
            <li>
              RevenueCat retains purchase records per its policy; Apple
              retains purchase records under your Apple Account.
            </li>
          </ul>
        </section>

        <section id="rights">
          <h2>7. Your rights</h2>
          <p>
            Because your data lives on your device, you can exercise most
            rights directly: view everything inside the app, correct it by
            editing, and erase it via <em>Reset App Data</em> or
            uninstalling. For anything else — including deletion of the
            anonymous purchase record held by RevenueCat, access requests,
            objection, restriction, portability, or a complaint — email{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>. We
            respond within 30 days. You also have the right to lodge a
            complaint with your local data-protection authority.
          </p>
          <p>
            <strong>California residents:</strong> GeoCart does not sell or
            share personal information as defined by the CCPA/CPRA, and we do
            not use sensitive personal information beyond what is necessary to
            provide the service you request. The rights to know, delete, and
            correct can be exercised as described above, without
            discrimination.
          </p>
        </section>

        <section id="children">
          <h2>8. Children</h2>
          <p>
            GeoCart is not directed at children under 13 (or the equivalent
            minimum age in your jurisdiction), and we do not knowingly collect
            personal information from them. Since the app has no accounts and
            no server-side collection, no child-specific data is held by us;
            parents can remove all local data by deleting the app.
          </p>
        </section>

        <section id="security">
          <h2>9. Security</h2>
          <p>
            All network connections use HTTPS/TLS; the app refuses insecure
            connections. On-device data is stored in the app&rsquo;s private
            sandbox and is protected by your device&rsquo;s encryption and
            passcode. Because there is no account system, there are no
            passwords to breach and no server database to leak.
          </p>
        </section>

        <section id="changes">
          <h2>10. Changes to this policy</h2>
          <p>
            If we change how GeoCart handles data — for example, by adding a
            new service — we will update this policy, change the effective
            date above, and, for material changes, notify you inside the app
            before the change applies to you.
          </p>
        </section>

        <footer>
          <p>
            Store location data ©{" "}
            <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
            , licensed under ODbL. See also our{" "}
            <a href="/terms">Terms of Service</a>,{" "}
            <a href="/subscription-terms">Subscription Terms</a>,{" "}
            <a href="/location-disclosure">Location Services Disclosure</a>,{" "}
            and <a href="/data-deletion">Data Deletion Policy</a>.
          </p>
        </footer>
      </article>
    </main>
  );
}
