import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — GeoCart",
  description:
    "The terms that govern your use of the GeoCart app and website.",
};

export default function TermsOfServicePage() {
  return (
    <main>
      <article>
        <header>
          <h1>GeoCart Terms of Service</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
          <p>
            These Terms of Service (&ldquo;Terms&rdquo;) are an agreement
            between you and Ertuğrul Ünal, the independent developer of
            GeoCart (&ldquo;we&rdquo;, &ldquo;the developer&rdquo;). They
            govern your use of the GeoCart mobile application and the
            geocart.app website (together, the &ldquo;Service&rdquo;). By
            downloading or using GeoCart you agree to these Terms. If you do
            not agree, do not use the Service.
          </p>
        </header>

        <section id="service">
          <h2>1. What GeoCart is</h2>
          <p>
            GeoCart is a shopping-list app that can remind you about your list
            when you are near a store. Reminders are generated on your device
            using your location (with your permission) and store data from
            OpenStreetMap. GeoCart is a convenience tool: it does not sell
            goods, process grocery payments, or guarantee that any store
            exists, is open, or stocks what you need.
          </p>
        </section>

        <section id="license">
          <h2>2. License to use the app</h2>
          <p>
            We grant you a personal, non-exclusive, non-transferable,
            revocable license to install and use GeoCart on Apple-branded
            devices that you own or control, as permitted by the App Store
            Terms of Service. Apple&rsquo;s standard Licensed Application End
            User License Agreement applies to the extent these Terms do not
            cover a topic. You may not copy, modify, distribute, sell, rent,
            reverse-engineer, or create derivative works of the app except
            where such a restriction is prohibited by law or permitted by an
            open-source license covering a specific component (see our{" "}
            <a href="/licenses">Licenses page</a>).
          </p>
        </section>

        <section id="your-content">
          <h2>3. Your content stays yours</h2>
          <p>
            Shopping lists, items, saved stores, notes, and preferences you
            create in GeoCart are yours. They are stored only on your device;
            we do not receive them, claim no ownership of them, and take no
            license to them. Deleting the app deletes them — we cannot recover
            your data for you, so back up your device if your lists matter to
            you.
          </p>
        </section>

        <section id="acceptable-use">
          <h2>4. Acceptable use</h2>
          <p>You agree not to:</p>
          <ul>
            <li>
              use the Service in a way that violates applicable law or the
              rights of others;
            </li>
            <li>
              interfere with, overload, or disrupt the third-party services
              the app relies on (including the volunteer-operated Overpass API
              servers), for example by automating or artificially multiplying
              requests;
            </li>
            <li>
              circumvent, disable, or tamper with subscription entitlements or
              feature limits;
            </li>
            <li>
              use GeoCart while driving in a way that violates traffic law —
              interact with the app only when it is safe and legal to do so.
            </li>
          </ul>
        </section>

        <section id="subscriptions">
          <h2>5. GeoCart Pro</h2>
          <p>
            Optional auto-renewing subscriptions (&ldquo;GeoCart Pro&rdquo;)
            unlock additional limits and features. Subscriptions are sold
            through the Apple App Store and are governed by our{" "}
            <a href="/subscription-terms">Subscription Terms</a>, which form
            part of these Terms.
          </p>
        </section>

        <section id="third-party-data">
          <h2>6. Third-party data and services</h2>
          <p>
            Store locations are derived from{" "}
            <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
              OpenStreetMap
            </a>{" "}
            (© OpenStreetMap contributors), made available under the Open
            Database License (ODbL). Map imagery is provided by Apple Maps
            under Apple&rsquo;s terms. Community map data can be incomplete,
            outdated, or wrong: stores may be missing, mislocated, closed, or
            miscategorized. Navigation links open third-party map apps
            (Apple Maps, Google Maps, Yandex Maps) that operate under their
            own terms.
          </p>
        </section>

        <section id="reminders">
          <h2>7. Reminders are best-effort</h2>
          <p>
            Location reminders depend on GPS accuracy, device settings,
            battery state, iOS background-execution policies, and network
            availability. Reminders may arrive late, may not arrive at all,
            or may occasionally fire when you are merely passing by. The app
            also intentionally limits how many reminders it sends (cooldowns,
            daily caps, quiet hours). <strong>Do not rely on GeoCart for
            time-critical, safety-critical, or medically important purchases
            or errands.</strong> See the{" "}
            <a href="/disclaimer">Disclaimer</a> and{" "}
            <a href="/location-disclosure">Location Services Disclosure</a>.
          </p>
        </section>

        <section id="ip">
          <h2>8. Intellectual property</h2>
          <p>
            The GeoCart name, app design, and original code are the property
            of the developer. Open-source components remain the property of
            their respective authors under their respective licenses, listed
            on the <a href="/licenses">Licenses page</a>. Apple, the Apple
            logo, App Store, and Apple Maps are trademarks of Apple Inc.
            OpenStreetMap is a trademark of the OpenStreetMap Foundation;
            GeoCart is not endorsed by or affiliated with the OpenStreetMap
            Foundation, Apple, or RevenueCat.
          </p>
        </section>

        <section id="warranty">
          <h2>9. No warranty</h2>
          <p>
            The Service is provided &ldquo;as is&rdquo; and &ldquo;as
            available&rdquo;, without warranties of any kind, express or
            implied, including merchantability, fitness for a particular
            purpose, accuracy, and non-infringement, to the maximum extent
            permitted by law. Some jurisdictions do not allow the exclusion of
            implied warranties; in that case the shortest lawful duration and
            narrowest lawful scope apply. Nothing in these Terms limits your
            mandatory statutory rights as a consumer.
          </p>
        </section>

        <section id="liability">
          <h2>10. Limitation of liability</h2>
          <p>
            To the maximum extent permitted by law, the developer is not
            liable for indirect, incidental, special, consequential, or
            punitive damages, or for lost profits, lost data, missed
            purchases, wasted trips, or the accuracy of third-party store
            data, arising out of or related to your use of the Service. To
            the extent liability cannot be excluded, the developer&rsquo;s
            total aggregate liability is limited to the greater of (a) the
            amount you paid for GeoCart Pro in the twelve months before the
            claim arose and (b) 25 EUR. Nothing in these Terms excludes
            liability for intent, gross negligence, or death or personal
            injury caused by negligence, or any other liability that cannot
            lawfully be excluded.
          </p>
        </section>

        <section id="apple">
          <h2>11. Apple-specific terms</h2>
          <p>
            These Terms are between you and the developer, not Apple. Apple
            has no obligation to provide maintenance or support for the app
            and is not responsible for addressing any claims relating to the
            app, including product-liability, regulatory, or IP claims. In
            the event the app fails to conform to an applicable warranty, you
            may notify Apple and Apple will refund the purchase price (if
            any); Apple has no other warranty obligation. Apple and its
            subsidiaries are third-party beneficiaries of these Terms and may
            enforce them against you. You represent that you are not located
            in a country subject to a U.S. Government embargo and are not on
            any U.S. Government restricted-parties list.
          </p>
        </section>

        <section id="termination">
          <h2>12. Termination</h2>
          <p>
            You can stop using GeoCart at any time by deleting the app. We
            may terminate or suspend the license in section 2 if you
            materially breach these Terms. Sections 3 and 8–14 survive
            termination. Termination does not entitle you to a refund of
            amounts already paid, except as provided by Apple&rsquo;s refund
            policies or applicable law.
          </p>
        </section>

        <section id="changes">
          <h2>13. Changes to the Service and these Terms</h2>
          <p>
            We may update the app and these Terms. For material changes to
            the Terms we will give notice in the app or on this page at least
            14 days before they take effect, unless a shorter period is
            required for legal or security reasons. Continuing to use the
            Service after the effective date constitutes acceptance; if you
            do not agree, stop using the Service and, if you have an active
            subscription, cancel it before the next renewal.
          </p>
        </section>

        <section id="law">
          <h2>14. Governing law and disputes</h2>
          <p>
            These Terms are governed by the laws of the Republic of Türkiye,
            excluding its conflict-of-law rules. If you are a consumer
            residing in the EU, the UK, or another jurisdiction whose law
            grants you non-waivable protections or a home-court venue, you
            retain those protections and venues. The EU Online Dispute
            Resolution platform is available at{" "}
            <a href="https://ec.europa.eu/consumers/odr/" rel="noopener noreferrer">
              ec.europa.eu/consumers/odr
            </a>
            ; we are neither obliged nor willing to participate in dispute
            resolution before a consumer-arbitration board except where
            required by law.
          </p>
        </section>

        <section id="contact">
          <h2>15. Contact</h2>
          <p>
            Questions about these Terms:{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>
          </p>
        </section>

        <footer>
          <p>
            See also: <a href="/privacy">Privacy Policy</a> ·{" "}
            <a href="/subscription-terms">Subscription Terms</a> ·{" "}
            <a href="/location-disclosure">Location Services Disclosure</a> ·{" "}
            <a href="/data-deletion">Data Deletion Policy</a> ·{" "}
            <a href="/disclaimer">Disclaimer</a> ·{" "}
            <a href="/licenses">Licenses</a>
          </p>
        </footer>
      </article>
    </main>
  );
}
