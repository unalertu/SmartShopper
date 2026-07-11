import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Subscription Terms — GeoCart",
  description:
    "How GeoCart Pro subscriptions, billing, renewal, cancellation, and refunds work.",
};

export default function SubscriptionTermsPage() {
  return (
    <main>
      <article>
        <header>
          <h1>GeoCart Pro Subscription Terms</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
          <p>
            These terms supplement the <a href="/terms">Terms of Service</a>{" "}
            and govern the optional GeoCart Pro auto-renewing subscription.
          </p>
        </header>

        <section id="what-you-get">
          <h2>1. What GeoCart Pro includes</h2>
          <p>
            The free version of GeoCart is fully functional: location
            reminders are never paywalled. The free tier applies quantity
            limits — currently up to 4 shopping lists, 25 items per list, 4
            saved stores, a capped number of location alerts per day, and a
            fixed alert-delivery window of 08:00–22:00. GeoCart Pro removes
            or raises these limits and unlocks:
          </p>
          <ul>
            <li>Unlimited shopping lists and items per list</li>
            <li>Unlimited saved stores and muted shops</li>
            <li>Unlimited location alerts per day</li>
            <li>Custom quiet hours and smart schedules (choose days and hours)</li>
            <li>Custom reminder sensitivity (alert distance)</li>
            <li>Advanced notification controls and future Pro features</li>
          </ul>
          <p>
            The exact feature list, available plans (for example, a yearly
            plan), prices in your local currency, and any introductory offer
            or free trial are always displayed in the app at the point of
            purchase before you confirm.
          </p>
        </section>

        <section id="billing">
          <h2>2. Billing and renewal</h2>
          <ul>
            <li>
              Payment is charged to your Apple Account through the App Store
              when you confirm the purchase. We never see or store your
              payment details.
            </li>
            <li>
              The subscription <strong>renews automatically</strong> unless
              you cancel at least 24 hours before the end of the current
              period. Your Apple Account is charged for the renewal within 24
              hours before the current period ends, at the price shown in the
              App Store at that time.
            </li>
            <li>
              If a free trial or introductory price is offered, the terms
              (length and post-trial price) are shown before purchase. Any
              unused portion of a free trial is forfeited if you purchase a
              subscription during the trial, where the App Store applies that
              rule.
            </li>
            <li>
              If the price of your plan increases, Apple will notify you and,
              where required, ask for your consent before charging the new
              price.
            </li>
          </ul>
        </section>

        <section id="cancel">
          <h2>3. How to cancel</h2>
          <p>
            You can cancel at any time — cancellation takes effect at the end
            of the current billing period, and you keep Pro benefits until
            then. Deleting the app does <strong>not</strong> cancel a
            subscription. To cancel:
          </p>
          <ol>
            <li>
              Open <strong>Settings</strong> on your iPhone → tap your name →{" "}
              <strong>Subscriptions</strong> → <strong>GeoCart</strong> →{" "}
              <strong>Cancel Subscription</strong>, or
            </li>
            <li>
              Use the &ldquo;Manage Subscription&rdquo; button inside GeoCart
              (Settings → GeoCart Pro), which opens{" "}
              <a
                href="https://apps.apple.com/account/subscriptions"
                rel="noopener noreferrer"
              >
                apps.apple.com/account/subscriptions
              </a>
              .
            </li>
          </ol>
        </section>

        <section id="refunds">
          <h2>4. Refunds</h2>
          <p>
            Because purchases are processed by Apple, refunds are granted by
            Apple under Apple&rsquo;s refund policy — the developer cannot
            issue App Store refunds directly. Request a refund at{" "}
            <a href="https://reportaproblem.apple.com" rel="noopener noreferrer">
              reportaproblem.apple.com
            </a>
            . Statutory withdrawal and refund rights in your country (for
            example, EU consumer rights) are not affected. If Apple declines
            and you believe your case is exceptional, contact us at{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a> and we
            will try to help.
          </p>
        </section>

        <section id="restore">
          <h2>5. Restoring purchases</h2>
          <p>
            Your Pro entitlement is tied to your Apple Account through an
            anonymous identifier — no GeoCart account is needed. On a new or
            reinstalled device, open{" "}
            <em>Settings → Restore Purchases</em> in the app while signed in
            to the same Apple Account, and Pro will be re-activated at no
            charge.
          </p>
        </section>

        <section id="changes">
          <h2>6. Changes and downgrades</h2>
          <ul>
            <li>
              If your subscription lapses or is refunded, the app returns to
              the free tier. Content you created above free-tier limits is
              not deleted, but you may be unable to add more until you are
              under the limits or re-subscribe. Pro-only settings (custom
              schedules, sensitivity) revert to defaults.
            </li>
            <li>
              We may change the Pro feature set over time. If we materially
              reduce what an active subscription includes, you may cancel and
              request a pro-rated remedy through Apple.
            </li>
          </ul>
        </section>

        <section id="contact">
          <h2>7. Contact</h2>
          <p>
            Subscription questions:{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>.
            Subscription entitlements are validated by RevenueCat, Inc.; see
            the <a href="/privacy#third-parties">Privacy Policy</a> for what
            RevenueCat receives.
          </p>
        </section>
      </article>
    </main>
  );
}
