# Release Checklist

## Blocking Before Public Submission

- [ ] Replace the contact placeholder in `PRIVACY.md` and publish it at a public HTTPS URL.
- [ ] Add encryption at rest or a user-controlled master password for saved profiles and AI API keys. They currently reside in `chrome.storage.local`.
- [ ] Test every AI provider/model presented as supporting AI fill. Test a vision-capable model separately for image analysis.
- [ ] Test on real form sites, including an iframe form, a React-controlled form, a custom select, and a form with a file input.
- [ ] Create redacted real-product screenshots for the store listing.

## Ready In This Repository

- [x] Manifest V3 package
- [x] Local bundled third-party dependencies and license notices
- [x] Narrow permission explanation
- [x] Privacy policy draft and store listing draft
- [x] Automated unit and syntax tests
