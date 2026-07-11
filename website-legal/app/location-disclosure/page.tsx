import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Location Services Disclosure — GeoCart",
  description:
    "Exactly how, when, and why GeoCart uses your location — including background use, limits, and how to turn it off.",
};

export default function LocationDisclosurePage() {
  return (
    <main>
      <article>
        <header>
          <h1>Location Services Disclosure</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
          <p>
            GeoCart&rsquo;s core feature is a location-based reminder. This
            page describes precisely how the app uses location — including in
            the background — what it never does, and how to control or stop
            it. It supplements the <a href="/privacy">Privacy Policy</a>.
          </p>
        </header>

        <section id="foreground">
          <h2>1. While you are using the app</h2>
          <p>
            With &ldquo;While Using&rdquo; permission, your location centers
            the map and powers nearby-store search. When you browse the map,
            the app requests store data for the visible area from
            OpenStreetMap Overpass servers (see section 4).
          </p>
        </section>

        <section id="background">
          <h2>2. In the background (&ldquo;Always&rdquo; permission)</h2>
          <p>
            Background reminders require iOS &ldquo;Always Allow&rdquo;
            location access. Here is what actually happens:
          </p>
          <ul>
            <li>
              <strong>Update pacing:</strong> the app asks iOS for
              balanced-accuracy updates roughly every 300 meters of movement.
              iOS decides the actual timing; when you are stationary, updates
              largely stop.
            </li>
            <li>
              <strong>On-device processing:</strong> each location fix is
              evaluated entirely on your device. Fixes with poor GPS accuracy
              (worse than 80 m) or that are older than 30 seconds are
              discarded. If you are moving faster than about 25 km/h (for
              example, driving or on a bus), alerts are suppressed.
            </li>
            <li>
              <strong>Stop confirmation:</strong> a reminder only fires after
              you have remained within about 60 meters of the same spot for
              at least 60 seconds <em>and</em> spent at least 20 seconds
              inside a store&rsquo;s alert zone — walking past a store on the
              same street is designed not to trigger anything.
            </li>
            <li>
              <strong>Alert radius:</strong> you choose the sensitivity —
              Near (~50 m), Balanced (~100 m, default), or Far (~200 m). The
              notification itself fires from an inner trigger zone (roughly
              half the radius, minimum 45 m). In dense shopping areas the
              radius automatically shrinks so one busy street cannot flood
              you with alerts.
            </li>
            <li>
              <strong>Saved-store geofences:</strong> for stores you save,
              the app additionally registers up to 20 of the nearest ones
              with iOS&rsquo;s native geofencing (minimum region size 150 m,
              an iOS reliability constraint). iOS then wakes the app only on
              entry.
            </li>
            <li>
              <strong>Rate limits:</strong> at most one alert per 15 minutes
              overall, at most one per store per 8 hours, at most 2 per store
              per day, a daily cap, and a 30-minute / 300-meter
              &ldquo;one walk, one reminder&rdquo; suppression after each
              alert. By default alerts are delivered only between 08:00 and
              22:00.
            </li>
            <li>
              <strong>Visible indicator:</strong> GeoCart enables the iOS
              background-location indicator; it never attempts to hide that
              location is in use.
            </li>
          </ul>
        </section>

        <section id="not-tracking">
          <h2>3. What GeoCart does NOT do with location</h2>
          <ul>
            <li>No location history, trail, or movement log is recorded.</li>
            <li>
              No location is uploaded to any server operated by us — we have
              no server.
            </li>
            <li>
              No location is linked to your identity — the app has no
              accounts and sends no identifiers with map-data requests.
            </li>
            <li>No location is used for advertising or analytics — there are none.</li>
            <li>No location is sold or shared for value. Ever.</li>
          </ul>
          <p>
            The only location-derived data that leaves your device is an
            approximate rectangular area (about 2.5 km across in the
            background, or the visible map area in the foreground) sent to
            public OpenStreetMap Overpass servers to ask &ldquo;which stores
            are in this rectangle?&rdquo;. Details and server operators are
            listed in the{" "}
            <a href="/privacy#third-parties">Privacy Policy</a>.
          </p>
        </section>

        <section id="control">
          <h2>4. Your controls</h2>
          <ul>
            <li>
              <strong>Saved Stores Only mode</strong> (app Settings): stops
              continuous background location entirely. Reminders then rely
              solely on iOS geofences around your saved stores, and no
              background map-data requests are made.
            </li>
            <li>
              <strong>Snooze / mute:</strong> pause all alerts for a period,
              or until you reopen the app; mute individual stores.
            </li>
            <li>
              <strong>Schedule:</strong> default delivery window is
              08:00–22:00; GeoCart Pro can customize days and hours.
            </li>
            <li>
              <strong>Turn it off completely:</strong> iOS Settings →
              Privacy &amp; Security → Location Services → GeoCart →
              &ldquo;While Using&rdquo; or &ldquo;Never&rdquo;. The app
              remains fully usable as a shopping-list app.
            </li>
          </ul>
        </section>

        <section id="battery">
          <h2>5. Battery</h2>
          <p>
            The design minimizes battery use: balanced (not maximum) GPS
            accuracy, movement-paced updates, native geofences for saved
            stores, store-data downloads throttled to once per 1.5 km of
            movement, and no background work at all in Saved Stores Only
            mode. Battery impact varies by device, signal conditions, and how
            much you move.
          </p>
        </section>

        <section id="limitations">
          <h2>6. Honest limitations</h2>
          <ul>
            <li>
              GPS in cities can drift tens of meters; occasional false
              triggers (an alert while passing by) and misses (no alert while
              inside a store, especially indoors) are possible by design and
              by physics.
            </li>
            <li>
              iOS may delay or withhold background execution — notably in Low
              Power Mode, with Background App Refresh off, in Focus/Do Not
              Disturb modes, or right after a device restart before first
              unlock.
            </li>
            <li>
              Store data comes from OpenStreetMap and may be incomplete or
              outdated; a reminder can reference a store that has closed or
              moved.
            </li>
            <li>
              Regions smaller than ~150 m are unreliable for iOS geofencing;
              GeoCart compensates with wider regions plus on-device distance
              confirmation, but precision is inherently limited.
            </li>
          </ul>
          <p>
            Because of all of the above, reminders are best-effort. Do not
            rely on them for critical or time-sensitive purchases — see the{" "}
            <a href="/disclaimer">Disclaimer</a>.
          </p>
        </section>
      </article>
    </main>
  );
}
