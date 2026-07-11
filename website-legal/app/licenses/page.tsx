import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Open Source & Third-Party Licenses — GeoCart",
  description:
    "Attribution for OpenStreetMap data and the open-source software GeoCart is built on.",
};

const mitLibraries: [name: string, copyright: string][] = [
  ["React & React DOM", "Meta Platforms, Inc. and affiliates"],
  ["React Native", "Meta Platforms, Inc. and affiliates"],
  [
    "Expo (expo, expo-router, expo-location, expo-notifications, expo-task-manager, expo-localization, expo-haptics, expo-image, expo-linear-gradient, expo-linking, expo-blur, expo-constants, expo-font, expo-splash-screen, expo-status-bar, expo-symbols, expo-system-ui, expo-file-system, expo-sharing, expo-dev-client, @expo/vector-icons)",
    "650 Industries, Inc. (Expo)",
  ],
  ["react-native-maps", "Airbnb, Inc. and react-native-maps contributors"],
  [
    "react-native-purchases & react-native-purchases-ui (RevenueCat SDK)",
    "RevenueCat, Inc.",
  ],
  ["@react-navigation/native & @react-navigation/bottom-tabs", "React Navigation contributors"],
  ["@react-native-async-storage/async-storage", "React Native Community contributors"],
  ["@react-native-masked-view/masked-view", "React Native Community contributors"],
  ["@gorhom/bottom-sheet", "Mo Gorhom"],
  ["react-native-reanimated & react-native-worklets", "Software Mansion"],
  ["react-native-gesture-handler", "Software Mansion"],
  ["react-native-screens", "Software Mansion"],
  ["react-native-safe-area-context", "Th3rd Wave & contributors"],
  ["react-native-svg", "Software Mansion & contributors"],
  ["react-native-web", "Nicolas Gallagher and contributors"],
  ["nativewind", "Mark Lawlor and contributors"],
  ["Tailwind CSS", "Tailwind Labs, Inc."],
  ["zustand", "Paul Henschel and contributors"],
];

const iscLibraries: [name: string, copyright: string][] = [
  ["supercluster", "Vladimir Agafonkin, Mapbox"],
  ["lucide-react-native (Lucide icons)", "Lucide contributors (based on Feather Icons, © Cole Bemis)"],
];

export default function LicensesPage() {
  return (
    <main>
      <article>
        <header>
          <h1>Open Source &amp; Third-Party Licenses</h1>
          <p>
            GeoCart is built on open data and open-source software. This page
            provides the attribution their licenses require, and our thanks.
          </p>
        </header>

        <section id="openstreetmap">
          <h2>1. OpenStreetMap (store data)</h2>
          <p>
            Store names, categories, and locations shown in GeoCart are ©{" "}
            <a href="https://www.openstreetmap.org/copyright" rel="noopener noreferrer">
              OpenStreetMap contributors
            </a>{" "}
            and are made available under the{" "}
            <a href="https://opendatacommons.org/licenses/odbl/1-0/" rel="noopener noreferrer">
              Open Database License (ODbL) v1.0
            </a>
            . OpenStreetMap® is a trademark of the OpenStreetMap Foundation.
            GeoCart is not endorsed by or affiliated with the OpenStreetMap
            Foundation. If you spot incorrect store data, you can improve the
            map for everyone at{" "}
            <a href="https://www.openstreetmap.org" rel="noopener noreferrer">
              openstreetmap.org
            </a>
            .
          </p>
          <p>
            Store data is retrieved through the{" "}
            <a href="https://wiki.openstreetmap.org/wiki/Overpass_API" rel="noopener noreferrer">
              Overpass API
            </a>
            . We gratefully acknowledge the operators of the public Overpass
            instances GeoCart uses: FOSSGIS e.V. (
            <code>overpass-api.de</code>), Kumi Systems e.U. (
            <code>overpass.kumi.systems</code>), and Private.coffee (
            <code>overpass.private.coffee</code>).
          </p>
        </section>

        <section id="apple-maps">
          <h2>2. Apple Maps (map imagery)</h2>
          <p>
            Map imagery in the app is provided by Apple Maps (MapKit). Apple,
            Apple Maps, and the Apple logo are trademarks of Apple Inc.,
            registered in the U.S. and other countries.
          </p>
        </section>

        <section id="mit">
          <h2>3. Software under the MIT License</h2>
          <p>The following components are used under the MIT License:</p>
          <ul>
            {mitLibraries.map(([name, copyright]) => (
              <li key={name}>
                <strong>{name}</strong> — © {copyright}
              </li>
            ))}
          </ul>
          <details>
            <summary>MIT License text</summary>
            <p>
              Permission is hereby granted, free of charge, to any person
              obtaining a copy of this software and associated documentation
              files (the &ldquo;Software&rdquo;), to deal in the Software
              without restriction, including without limitation the rights to
              use, copy, modify, merge, publish, distribute, sublicense,
              and/or sell copies of the Software, and to permit persons to
              whom the Software is furnished to do so, subject to the
              following conditions:
            </p>
            <p>
              The above copyright notice and this permission notice shall be
              included in all copies or substantial portions of the Software.
            </p>
            <p>
              THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo;, WITHOUT WARRANTY
              OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO
              THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR
              PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
              COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
              LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE,
              ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE
              USE OR OTHER DEALINGS IN THE SOFTWARE.
            </p>
          </details>
        </section>

        <section id="isc">
          <h2>4. Software under the ISC License</h2>
          <ul>
            {iscLibraries.map(([name, copyright]) => (
              <li key={name}>
                <strong>{name}</strong> — © {copyright}
              </li>
            ))}
          </ul>
          <details>
            <summary>ISC License text</summary>
            <p>
              Permission to use, copy, modify, and/or distribute this software
              for any purpose with or without fee is hereby granted, provided
              that the above copyright notice and this permission notice
              appear in all copies.
            </p>
            <p>
              THE SOFTWARE IS PROVIDED &ldquo;AS IS&rdquo; AND THE AUTHOR
              DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING
              ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO
              EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
              INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER
              RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN
              ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION,
              ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
              THIS SOFTWARE.
            </p>
          </details>
        </section>

        <section id="other">
          <h2>5. Bundled native components</h2>
          <p>
            The iOS build additionally bundles open-source native libraries
            distributed with React Native and Expo (including Hermes,
            Folly/Boost, glog, libwebp, libavif, and libdav1d) under their
            respective MIT, Apache-2.0, BSD, and similar permissive licenses.
            Their notices are included in the application bundle.
          </p>
        </section>

        <section id="contact">
          <h2>6. Questions</h2>
          <p>
            License questions or attribution corrections:{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>
          </p>
        </section>
      </article>
    </main>
  );
}
