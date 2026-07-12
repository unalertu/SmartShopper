# Open Source & Third-Party Licenses

**GeoCart** · Last updated: July 12, 2026 · App version 1.0.0

GeoCart is built on open data and open-source software. This page lists every third-party component **distributed with the GeoCart app**, its license, and the attribution those licenses require. Build-time tooling that is not shipped to your device is not listed. No GPL, LGPL, or other copyleft-licensed code is distributed with the app.

---

## 1. OpenStreetMap (store data)

Store names, categories, and locations shown in GeoCart are **© [OpenStreetMap](https://www.openstreetmap.org/copyright) contributors** and are made available under the **[Open Database License (ODbL) v1.0](https://opendatacommons.org/licenses/odbl/1-0/)**.

OpenStreetMap® is a trademark of the OpenStreetMap Foundation. GeoCart is not endorsed by or affiliated with the OpenStreetMap Foundation. If you spot incorrect store data, you can improve the map for everyone at [openstreetmap.org](https://www.openstreetmap.org).

Store data is retrieved through the [Overpass API](https://wiki.openstreetmap.org/wiki/Overpass_API). We gratefully acknowledge the operators of the public Overpass instances GeoCart uses:

- **FOSSGIS e.V.** — `overpass-api.de`
- **Kumi Systems e.U.** — `overpass.kumi.systems`
- **Private.coffee** — `overpass.private.coffee`

## 2. Apple Maps (map imagery)

Map imagery in the app is provided by Apple Maps (MapKit). Apple, Apple Maps, and the Apple logo are trademarks of Apple Inc., registered in the U.S. and other countries.

## 3. Icons & fonts

- **Material Design Icons** (bundled as the `MaterialCommunityIcons` icon font) — © [Pictogrammers](https://pictogrammers.com/) and contributors; includes Material Design icons © Google. Licensed under the **Apache License 2.0** (see §7). Packaged for React Native by **react-native-vector-icons** — © Joel Arvidsson (MIT) — distributed via **@expo/vector-icons** — © 650 Industries, Inc. (MIT).
- **Lucide icons** (`lucide-react-native`) — © Lucide Contributors; portions of the icon set are derived from **Feather icons**, © 2013–2023 Cole Bemis. Licensed under the **ISC License** (see §5).

All other artwork in the app (app icon, splash screen, logos) is original to GeoCart and is not third-party licensed material.

## 4. Software used under the MIT License

The following components are distributed with the app under the **MIT License**. Full license text follows the list; the listed copyright holders' notices apply.

### Frameworks & native components

- **React, React Native, Hermes JavaScript engine, Yoga, Metro runtime, scheduler, and @react-native/* support packages** — © Meta Platforms, Inc. and affiliates
- **Expo SDK** (expo, expo-application, expo-asset, expo-blur, expo-constants, expo-font, expo-haptics, expo-image, expo-linear-gradient, expo-linking, expo-localization, expo-location, expo-modules-core, expo-notifications, expo-router, expo-splash-screen, expo-status-bar, expo-symbols, expo-task-manager, @expo/cli runtime, @expo/metro-runtime, @expo/vector-icons, and the Expo native modules and dev-client) — © 650 Industries, Inc.
- **RevenueCat SDKs** (react-native-purchases, react-native-purchases-ui, @revenuecat/purchases-typescript-internal, @revenuecat/purchases-js-hybrid-mappings, purchases-ios, RevenueCatUI, PurchasesHybridCommon) — © RevenueCat, Inc.
- **react-native-maps** — © 2015 Airbnb and react-native-maps contributors
- **react-native-gesture-handler, react-native-reanimated, react-native-screens, react-native-worklets, react-freeze** — © Software Mansion
- **react-native-svg** — © 2015–2016 Horcrux and react-native-svg contributors
- **react-native-safe-area-context** — © 2019 Th3rd Wave and contributors
- **@react-native-async-storage/async-storage, @react-native-masked-view/masked-view** — © 2015–present Facebook, Inc. and React Native Community contributors
- **React Navigation** (@react-navigation/native, bottom-tabs, core, elements, native-stack, routers) — © 2017 React Navigation Contributors
- **@gorhom/bottom-sheet, @gorhom/portal** — © 2020 Mo Gorhom
- **NativeWind / react-native-css-interop** — © 2023 Mark Lawlor
- **zustand** — © 2019 Paul Henschel and contributors
- **SDWebImage, SDWebImageWebPCoder, SDWebImageAVIFCoder, SDWebImageSVGCoder** — © Olivier Poitrey and SDWebImage contributors
- **{fmt}** — © Victor Zverovich and {fmt} contributors

### JavaScript utility packages

@babel/runtime — © Sebastian McKenzie and contributors · @ide/backoff — © James Ide · @radix-ui/react-compose-refs, @radix-ui/react-slot — © WorkOS, Inc. · abort-controller, event-target-shim — © Toru Nagashima · assert, util — © Joyent, Inc. and Node.js contributors · base64-js — © Jameson Little · buffer — © Feross Aboukhadijeh and contributors · color, color-convert, color-string — © Heather Arthur · color-name — © Dmitry Ivanov · decode-uri-component — © Sam Verschueren · escape-string-regexp, filter-obj, query-string, split-on-first — © Sindre Sorhus · fast-deep-equal — © Evgeny Poberezkin · for-each, function-bind — © Raynos · generator-function — © Tiancheng "Timothy" Gu · invariant, react-is, regenerator-runtime — © Facebook, Inc. and affiliates · is-arrayish, simple-swizzle — © JD Ballard / Josh Junon · memoize-one — © Alexander Reardon · nanoid — © Andrey Sitnik · nullthrows — © Andres Suarez · promise — © Forbes Lindesay · punycode — © Mathias Bynens · react-native-is-edge-to-edge — © Mathieu Acthernoene · stacktrace-parser — © Georg Tavonius · strict-uri-encode — © Kevin Martensson · use-latest-callback, warn-once — © Satyajit Sahoo · use-sync-external-store — © Meta Platforms, Inc. · whatwg-fetch — © 2014–2023 GitHub, Inc. · whatwg-url-without-unicode — © Sebastian Mayr and contributors · and the following ECMAScript-shim utilities © Jordan Harband, the ECMAScript Shims project, and Inspect JS contributors: available-typed-arrays, call-bind, call-bind-apply-helpers, call-bound, define-data-property, define-properties, dunder-proto, es-define-property, es-errors, es-object-atoms, get-intrinsic, get-proto, gopd, has-property-descriptors, has-symbols, has-tostringtag, hasown, is-arguments, is-callable, is-generator-function, is-nan, is-regex, is-typed-array, math-intrinsics, object-is, object-keys, object.assign, possible-typed-array-names, safe-regex-test, set-function-length, which-typed-array.

<details>
<summary><strong>MIT License text</strong></summary>

> Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:
>
> The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

</details>

## 5. Software used under the ISC License

- **lucide-react-native** — © Lucide Contributors; portions © 2013–2023 Cole Bemis (Feather)
- **supercluster** — © 2021 Mapbox
- **kdbush** — © Vladimir Agafonkin
- **inherits** — © Isaac Z. Schlueter
- **semver** — © Isaac Z. Schlueter and Contributors
- **@ungap/structured-clone** — © 2021 Andrea Giammarchi

<details>
<summary><strong>ISC License text</strong></summary>

> Permission to use, copy, modify, and/or distribute this software for any purpose with or without fee is hereby granted, provided that the above copyright notice and this permission notice appear in all copies.
>
> THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF THIS SOFTWARE.

</details>

## 6. Software used under BSD licenses

**BSD 2-Clause License:**

- **libavif** — © 2019 Joe Drago. All rights reserved.
- **dav1d (libdav1d)** — © 2018–2019 VideoLAN and dav1d authors. All rights reserved.
- **webidl-conversions** — © 2014 Domenic Denicola

**BSD 3-Clause License:**

- **libwebp** — © 2010 Google Inc. / the WebM Project authors. All rights reserved.
- **glog** — © 2008 Google Inc. All rights reserved.
- **double-conversion** — © 2006–2011 the V8 project authors. All rights reserved.
- **hoist-non-react-statics** — © 2015 Yahoo! Inc. All rights reserved.
- **ieee754** — © 2008 Fair Oaks Labs, Inc.

<details>
<summary><strong>BSD 2-Clause License text</strong></summary>

> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

</details>

<details>
<summary><strong>BSD 3-Clause License text</strong></summary>

> Redistribution and use in source and binary forms, with or without modification, are permitted provided that the following conditions are met:
>
> 1. Redistributions of source code must retain the above copyright notice, this list of conditions and the following disclaimer.
> 2. Redistributions in binary form must reproduce the above copyright notice, this list of conditions and the following disclaimer in the documentation and/or other materials provided with the distribution.
> 3. Neither the name of the copyright holder nor the names of its contributors may be used to endorse or promote products derived from this software without specific prior written permission.
>
> THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT HOLDER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.

</details>

## 7. Software used under the Apache License 2.0

- **Material Design Icons** — © Pictogrammers and contributors; includes Material Design icons © Google (see §3)
- **Folly** — © Meta Platforms, Inc. and affiliates
- **fast_float** — © Daniel Lemire and fast_float contributors

Android builds additionally include: **OkHttp** and **Okio** — © Square, Inc. / Block, Inc.; **Kotlin standard library** — © JetBrains s.r.o. and Kotlin contributors; **AndroidX / Jetpack libraries** — © The Android Open Source Project.

The full Apache License 2.0 text is available at [apache.org/licenses/LICENSE-2.0](https://www.apache.org/licenses/LICENSE-2.0) and is reproduced below.

<details>
<summary><strong>Apache License 2.0 text</strong></summary>

> Apache License, Version 2.0, January 2004 — http://www.apache.org/licenses/
>
> TERMS AND CONDITIONS FOR USE, REPRODUCTION, AND DISTRIBUTION
>
> **1. Definitions.** "License" shall mean the terms and conditions for use, reproduction, and distribution as defined by Sections 1 through 9 of this document. "Licensor" shall mean the copyright owner or entity authorized by the copyright owner that is granting the License. "Legal Entity" shall mean the union of the acting entity and all other entities that control, are controlled by, or are under common control with that entity. For the purposes of this definition, "control" means (i) the power, direct or indirect, to cause the direction or management of such entity, whether by contract or otherwise, or (ii) ownership of fifty percent (50%) or more of the outstanding shares, or (iii) beneficial ownership of such entity. "You" (or "Your") shall mean an individual or Legal Entity exercising permissions granted by this License. "Source" form shall mean the preferred form for making modifications, including but not limited to software source code, documentation source, and configuration files. "Object" form shall mean any form resulting from mechanical transformation or translation of a Source form, including but not limited to compiled object code, generated documentation, and conversions to other media types. "Work" shall mean the work of authorship, whether in Source or Object form, made available under the License, as indicated by a copyright notice that is included in or attached to the work. "Derivative Works" shall mean any work, whether in Source or Object form, that is based on (or derived from) the Work and for which the editorial revisions, annotations, elaborations, or other modifications represent, as a whole, an original work of authorship. For the purposes of this License, Derivative Works shall not include works that remain separable from, or merely link (or bind by name) to the interfaces of, the Work and Derivative Works thereof. "Contribution" shall mean any work of authorship, including the original version of the Work and any modifications or additions to that Work or Derivative Works thereof, that is intentionally submitted to Licensor for inclusion in the Work by the copyright owner or by an individual or Legal Entity authorized to submit on behalf of the copyright owner. For the purposes of this definition, "submitted" means any form of electronic, verbal, or written communication sent to the Licensor or its representatives, including but not limited to communication on electronic mailing lists, source code control systems, and issue tracking systems that are managed by, or on behalf of, the Licensor for the purpose of discussing and improving the Work, but excluding communication that is conspicuously marked or otherwise designated in writing by the copyright owner as "Not a Contribution." "Contributor" shall mean Licensor and any individual or Legal Entity on behalf of whom a Contribution has been received by Licensor and subsequently incorporated within the Work.
>
> **2. Grant of Copyright License.** Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable copyright license to reproduce, prepare Derivative Works of, publicly display, publicly perform, sublicense, and distribute the Work and such Derivative Works in Source or Object form.
>
> **3. Grant of Patent License.** Subject to the terms and conditions of this License, each Contributor hereby grants to You a perpetual, worldwide, non-exclusive, no-charge, royalty-free, irrevocable (except as stated in this section) patent license to make, have made, use, offer to sell, sell, import, and otherwise transfer the Work, where such license applies only to those patent claims licensable by such Contributor that are necessarily infringed by their Contribution(s) alone or by combination of their Contribution(s) with the Work to which such Contribution(s) was submitted. If You institute patent litigation against any entity (including a cross-claim or counterclaim in a lawsuit) alleging that the Work or a Contribution incorporated within the Work constitutes direct or contributory patent infringement, then any patent licenses granted to You under this License for that Work shall terminate as of the date such litigation is filed.
>
> **4. Redistribution.** You may reproduce and distribute copies of the Work or Derivative Works thereof in any medium, with or without modifications, and in Source or Object form, provided that You meet the following conditions: (a) You must give any other recipients of the Work or Derivative Works a copy of this License; and (b) You must cause any modified files to carry prominent notices stating that You changed the files; and (c) You must retain, in the Source form of any Derivative Works that You distribute, all copyright, patent, trademark, and attribution notices from the Source form of the Work, excluding those notices that do not pertain to any part of the Derivative Works; and (d) If the Work includes a "NOTICE" text file as part of its distribution, then any Derivative Works that You distribute must include a readable copy of the attribution notices contained within such NOTICE file, excluding those notices that do not pertain to any part of the Derivative Works, in at least one of the following places: within a NOTICE text file distributed as part of the Derivative Works; within the Source form or documentation, if provided along with the Derivative Works; or, within a display generated by the Derivative Works, if and wherever such third-party notices normally appear. The contents of the NOTICE file are for informational purposes only and do not modify the License. You may add Your own attribution notices within Derivative Works that You distribute, alongside or as an addendum to the NOTICE text from the Work, provided that such additional attribution notices cannot be construed as modifying the License. You may add Your own copyright statement to Your modifications and may provide additional or different license terms and conditions for use, reproduction, or distribution of Your modifications, or for any such Derivative Works as a whole, provided Your use, reproduction, and distribution of the Work otherwise complies with the conditions stated in this License.
>
> **5. Submission of Contributions.** Unless You explicitly state otherwise, any Contribution intentionally submitted for inclusion in the Work by You to the Licensor shall be under the terms and conditions of this License, without any additional terms or conditions. Notwithstanding the above, nothing herein shall supersede or modify the terms of any separate license agreement you may have executed with Licensor regarding such Contributions.
>
> **6. Trademarks.** This License does not grant permission to use the trade names, trademarks, service marks, or product names of the Licensor, except as required for reasonable and customary use in describing the origin of the Work and reproducing the content of the NOTICE file.
>
> **7. Disclaimer of Warranty.** Unless required by applicable law or agreed to in writing, Licensor provides the Work (and each Contributor provides its Contributions) on an "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied, including, without limitation, any warranties or conditions of TITLE, NON-INFRINGEMENT, MERCHANTABILITY, or FITNESS FOR A PARTICULAR PURPOSE. You are solely responsible for determining the appropriateness of using or redistributing the Work and assume any risks associated with Your exercise of permissions under this License.
>
> **8. Limitation of Liability.** In no event and under no legal theory, whether in tort (including negligence), contract, or otherwise, unless required by applicable law (such as deliberate and grossly negligent acts) or agreed to in writing, shall any Contributor be liable to You for damages, including any direct, indirect, special, incidental, or consequential damages of any character arising as a result of this License or out of the use or inability to use the Work (including but not limited to damages for loss of goodwill, work stoppage, computer failure or malfunction, or any and all other commercial damages or losses), even if such Contributor has been advised of the possibility of such damages.
>
> **9. Accepting Warranty or Additional Liability.** While redistributing the Work or Derivative Works thereof, You may choose to offer, and charge a fee for, acceptance of support, warranty, indemnity, or other liability obligations and/or rights consistent with this License. However, in accepting such obligations, You may act only on Your own behalf and on Your sole responsibility, not on behalf of any other Contributor, and only if You agree to indemnify, defend, and hold each Contributor harmless for any liability incurred by, or claims asserted against, such Contributor by reason of your accepting any such warranty or additional liability.

</details>

## 8. Boost (Boost Software License 1.0)

The iOS build includes portions of the **Boost C++ Libraries** (distributed with React Native).

<details>
<summary><strong>Boost Software License 1.0 text</strong></summary>

> Boost Software License - Version 1.0 - August 17th, 2003
>
> Permission is hereby granted, free of charge, to any person or organization obtaining a copy of the software and accompanying documentation covered by this license (the "Software") to use, reproduce, display, distribute, execute, and transmit the Software, and to prepare derivative works of the Software, and to permit third-parties to whom the Software is furnished to do so, all subject to the following:
>
> The copyright notices in the Software and this entire statement, including the above license grant, this restriction and the following disclaimer, must be included in all copies of the Software, in whole or in part, and all derivative works of the Software, unless such copies or derivative works are solely in the form of machine-executable object code generated by a source language processor.
>
> THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE, TITLE AND NON-INFRINGEMENT. IN NO EVENT SHALL THE COPYRIGHT HOLDERS OR ANYONE DISTRIBUTING THE SOFTWARE BE LIABLE FOR ANY DAMAGES OR OTHER LIABILITY, WHETHER IN CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.

</details>

## 9. Android builds

In addition to the components above, Android builds of GeoCart include: **Fresco** — © Meta Platforms, Inc. (MIT); **Glide** — © Google, Inc. (BSD, part MIT and Apache 2.0); the Apache-2.0 components listed in §7; and map services provided by **Google Maps** via Google Play services, which are subject to the [Google Maps Platform Terms of Service](https://cloud.google.com/maps-platform/terms) — Google's required map attribution is displayed within the map itself.

## 10. Questions

License questions or attribution corrections: [unlertu@gmail.com](mailto:unlertu@gmail.com)

---

*This page was generated from a scan of the actual application bundle (Expo SDK 54 / React Native 0.81, July 12, 2026): the compiled JavaScript bundle module graph, the iOS CocoaPods dependency manifest, and bundled asset files. Components used only at build time are excluded because they are not distributed with the app.*
