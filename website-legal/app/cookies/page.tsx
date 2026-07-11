import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Cookie Policy — GeoCart",
  description:
    "GeoCart's app uses no cookies and this website sets no tracking cookies.",
};

export default function CookiePolicyPage() {
  return (
    <main>
      <article>
        <header>
          <h1>Cookie Policy</h1>
          <p>
            <strong>Effective date:</strong> July 11, 2026
          </p>
        </header>

        <section id="app">
          <h2>1. The GeoCart app</h2>
          <p>
            The GeoCart iOS app does not use cookies. It contains no embedded
            web browser for third-party content, no advertising SDKs, and no
            analytics SDKs that set cookies or equivalent identifiers. The
            app stores your lists and settings in its own on-device storage;
            that storage is private to the app, is not shared with any
            website or other app, and is described in the{" "}
            <a href="/privacy">Privacy Policy</a>.
          </p>
        </section>

        <section id="website">
          <h2>2. This website (geocart.app)</h2>
          <p>
            This website is a static informational site. It sets no
            advertising, analytics, or tracking cookies, and it does not use
            fingerprinting or similar technologies. Because no non-essential
            cookies are used, no cookie consent banner is required and none
            is shown.
          </p>
          <p>
            Our hosting provider may process standard technical data (such as
            your IP address) transiently in server logs to deliver pages and
            protect against abuse; this is not used to identify or profile
            you.
          </p>
        </section>

        <section id="changes">
          <h2>3. If this ever changes</h2>
          <p>
            If we ever introduce cookies that require consent (for example,
            analytics on this website), we will update this page, add a
            consent mechanism before any such cookie is set, and change the
            effective date above.
          </p>
        </section>

        <section id="contact">
          <h2>4. Contact</h2>
          <p>
            Questions:{" "}
            <a href="mailto:unlertu@gmail.com">unlertu@gmail.com</a>
          </p>
        </section>
      </article>
    </main>
  );
}
