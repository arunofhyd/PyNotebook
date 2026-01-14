# Production Readiness Checklist

This file contains manual actions required to finalize the move to production.

## SEO & Visibility

- [ ] **Google Search Console**:
    - Add `https://pynotebooks.vercel.app` (or your custom domain) as a property.
    - Submit `sitemap.xml` in the "Sitemaps" section.
    - Use "URL Inspection" to verify that Google can render your page (since it's a client-side React app).

- [ ] **Bing Webmaster Tools**:
    - Import your site from GSC to Bing Webmaster Tools for extra coverage.

- [ ] **Social Media Verification**:
    - **Facebook**: Use the [Sharing Debugger](https://developers.facebook.com/tools/debug/) to verify the Open Graph tags.
    - **Twitter/X**: Use the [Card Validator](https://cards-dev.twitter.com/validator) to check how links appear.

## Analytics & Monitoring

- [ ] **Google Analytics**:
    - Verify you have access to the property `G-R5NREN74YY` used in `index.html`.
    - Check "Realtime" view while visiting the site to ensure data is flowing.

- [ ] **Error Tracking**:
    - Consider integrating Sentry or LogRocket for tracking runtime errors in production, as the current `ErrorBoundary` only displays errors to the user.

## Security & Domains

- [ ] **Custom Domain (Optional)**:
    - If you purchase a domain (e.g., `pynotebook.com`):
        - Update `sitemap.xml` URLs.
        - Update `robots.txt` Sitemap URL.
        - Update `<link rel="canonical">` in `index.html`.
        - Update JSON-LD `url` values in `index.html`.
        - Update Firebase Auth "Authorized Domains" list.

- [ ] **Content Security Policy (CSP)**:
    - Open the browser console (F12) in production.
    - Check for any "Refused to load..." messages.
    - If you add new external scripts/images, you may need to update the `Content-Security-Policy` meta tag in `index.html`.

## Firebase

- [ ] **Firestore Rules**:
    - Review `firestore.rules` in the Firebase Console to ensure they match the file in this repo.
    - Monitor "Rules Monitor" for denied permission spikes.
    - Ensure `pynotebooks.vercel.app` is added to "Authorized Domains" in Firebase Authentication settings.
