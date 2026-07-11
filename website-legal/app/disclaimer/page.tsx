import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Disclaimer — GeoCart",
  description:
    "Important limitations of GeoCart's location reminders and store data.",
};

export default function DisclaimerPage() {
  return (
    <main>
      <article>
        <header>
          <h1>Disclaimer</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
          <p>
            GeoCart is a convenience tool built by an independent developer.
            Please read these limitations before relying on it.
          </p>
        </header>

        <section id="reminders">
          <h2>1. Reminders are not guaranteed</h2>
          <p>
            Location reminders depend on GPS signal quality, your device
            settings, battery state, iOS background-execution policies, and
            deliberate anti-spam limits built into the app (cooldowns, daily
            caps, a default 08:00–22:00 delivery window). A reminder may
            arrive late, may not arrive at all, or may occasionally fire when
            you are only passing near a store.{" "}
            <strong>
              Never rely on GeoCart as your only reminder for time-critical,
              safety-critical, health-related, or financially important
              purchases or errands
            </strong>{" "}
            — including prescription pickups, even though pharmacies appear
            in the app&rsquo;s store data.
          </p>
        </section>

        <section id="store-data">
          <h2>2. Store data may be wrong</h2>
          <p>
            Store names and locations come from OpenStreetMap, a
            community-maintained database (©{" "}
            <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>
            , ODbL). Stores may be missing, mislocated, renamed, closed, or
            miscategorized, and cached data on your device may be up to 30
            days old. GeoCart does not verify opening hours, stock, prices,
            or the existence of any store. Always confirm before making a
            special trip.
          </p>
        </section>

        <section id="maps-navigation">
          <h2>3. Maps and navigation</h2>
          <p>
            Map imagery is provided by Apple Maps. Directions open in
            third-party apps (Apple Maps, Google Maps, Yandex Maps) that
            operate under their own terms; GeoCart provides no routing or
            navigation of its own. Do not interact with your phone while
            driving.
          </p>
        </section>

        <section id="no-advice">
          <h2>4. No professional advice</h2>
          <p>
            Nothing in GeoCart — including item suggestions, categories,
            statistics such as &ldquo;estimated time saved&rdquo;, or store
            listings — constitutes medical, nutritional, financial, or other
            professional advice. Statistics shown in the app are rough,
            on-device estimates for your own interest.
          </p>
        </section>

        <section id="battery">
          <h2>5. Battery and device impact</h2>
          <p>
            Background location use consumes some battery. The app is
            engineered to minimize this (see the{" "}
            <a href="/location-disclosure">Location Services Disclosure</a>),
            but actual impact varies by device, coverage, and movement
            patterns.
          </p>
        </section>

        <section id="as-is">
          <h2>6. &ldquo;As is&rdquo;</h2>
          <p>
            The app and this website are provided &ldquo;as is&rdquo; without
            warranties, and liability is limited as set out in sections 9 and
            10 of the <a href="/terms">Terms of Service</a>. Nothing on this
            page limits rights that consumer law grants you and that cannot
            be waived.
          </p>
        </section>

        <section id="contact">
          <h2>7. Contact</h2>
          <p>
            Found incorrect store data or a misfiring reminder? Tell us:{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>. You can
            also fix store data for everyone at{" "}
            <a href="https://www.openstreetmap.org" rel="noopener noreferrer">
              openstreetmap.org
            </a>
            .
          </p>
        </section>
      </article>
    </main>
  );
}
