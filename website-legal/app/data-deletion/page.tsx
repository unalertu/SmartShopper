import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Data Deletion Policy — GeoCart",
  description:
    "How to delete every piece of data GeoCart holds — in the app, on your device, and at RevenueCat.",
};

export default function DataDeletionPage() {
  return (
    <main>
      <article>
        <header>
          <h1>Data Deletion Policy</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
          <p>
            GeoCart has no accounts and no server database, so deleting your
            data does not require contacting anyone — you can do it yourself,
            completely, in under a minute. This page explains every place
            data can exist and how to remove it.
          </p>
        </header>

        <section id="in-app">
          <h2>1. Delete everything inside the app</h2>
          <p>
            Open GeoCart → <strong>Settings</strong> →{" "}
            <strong>Danger Zone</strong>:
          </p>
          <ul>
            <li>
              <strong>Reset App Data</strong> permanently deletes all saved
              lists, shopping items, saved shops, notification history, usage
              statistics, activity timeline, and preferences. This cannot be
              undone.
            </li>
            <li>
              <strong>Clear Cache</strong> deletes cached nearby-store data
              (downloaded from OpenStreetMap) and temporary map data, leaving
              your own lists and shops intact.
            </li>
          </ul>
          <p>
            Reset App Data intentionally preserves one thing: your GeoCart
            Pro status, because it is derived from your Apple Account
            purchase, not from app data. It also stops any pending scheduled
            reminders from referencing deleted lists.
          </p>
        </section>

        <section id="uninstall">
          <h2>2. Delete the app</h2>
          <p>
            Uninstalling GeoCart removes the app&rsquo;s entire private
            storage from your device, including everything listed above.
            Nothing survives on any server of ours, because none exists.
            Note two things that uninstalling does <strong>not</strong> do:
          </p>
          <ul>
            <li>
              It does not cancel an active GeoCart Pro subscription — cancel
              via iOS Settings → your name → Subscriptions (see{" "}
              <a href="/subscription-terms">Subscription Terms</a>).
            </li>
            <li>
              If your device backs up to iCloud, a copy of the app&rsquo;s
              data may exist inside your own device backup, under your
              control and Apple&rsquo;s terms. Deleting the backup or the app
              before backing up removes that too.
            </li>
          </ul>
        </section>

        <section id="third-party">
          <h2>3. Data held by third parties</h2>
          <ul>
            <li>
              <strong>RevenueCat</strong> holds an anonymous purchase record
              (random app-user ID, receipt data, device model, OS/app
              version, locale) used to validate GeoCart Pro. To have it
              deleted, email{" "}
              <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a> and we
              will submit a deletion request to RevenueCat for your anonymous
              ID within 30 days. Note that deleting it means Pro cannot be
              restored without repurchasing through Apple&rsquo;s restore
              flow.
            </li>
            <li>
              <strong>Apple</strong> retains your App Store purchase history
              under your Apple Account; that is governed by Apple, not by us.
            </li>
            <li>
              <strong>Overpass/OpenStreetMap servers</strong> receive only
              anonymous map-area queries; there is no per-user record we or
              you could identify to delete. Server operators may keep
              standard, short-lived technical logs (including IP addresses)
              under their own policies.
            </li>
          </ul>
        </section>

        <section id="requests">
          <h2>4. Deletion requests and questions</h2>
          <p>
            If anything is unclear, or you want to exercise a deletion right
            under GDPR, CCPA, or similar laws, email{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>. We
            respond within 30 days. Since we cannot access your device, we
            will guide you through the on-device steps and handle the
            RevenueCat side for you.
          </p>
        </section>
      </article>
    </main>
  );
}
