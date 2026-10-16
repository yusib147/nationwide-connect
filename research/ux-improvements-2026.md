# UX Improvements for Nationwide Media Connect (2026-10-09)

Distilled from marketplace/app UX research: Material Design conversion patterns, the Jumia trust-transparency UX case study, search UX best-practice guides, the 2026 microinteractions guide, and mobile UX component pattern playbooks. Tailored to Ibrahim's direct requests (ad banner size, fake stats, bottom-nav bug, settings menu).

## The list (each = one concrete build task)

1. **Bottom nav safe-area fix:** give the fixed bottom navigation `padding-bottom: env(safe-area-inset-bottom)` plus a fallback, keep it below modals/toasts in z-index, and re-test on a notched Android (OPPO A15s class) so it never renders below the visible screen.
2. **Shrink the ad banner:** change the ad banner from `aspect-ratio: 16/10` to `16/6` with a `max-height` of ~180px, and overlay the AD badge and progress bar on the artwork instead of reserving extra vertical space for them.
3. **Remove fabricated stats:** delete the fake "12.5k+ items / 3.2k+ sellers" stats band and either compute real numbers live (count of active products from the DB) or remove the band entirely until real data exists.
4. **Settings menu:** add a Settings screen reachable from the Me tab with grouped iOS-style rows (icon + label + chevron): Dark mode toggle, Notifications, Language (English/Pidgin), Account info, Privacy, Help, Log out.
5. **Search upgrade:** add autocomplete suggestions with typo tolerance ("teeshirt" matches "t-shirt"), show a result count line ("24 results for 'chair'"), and bold the matched keyword inside result card titles.
6. **Zero-results recovery:** replace the plain "Nothing found" empty state with a recovery panel: echo the searched term, offer 2-3 related category chips, a "Clear filters" button, and show 4 popular items underneath.
7. **Sticky CTA bar on product detail:** pin Chat / Make Offer / Call to a sticky bottom bar on the product detail screen so the primary actions stay in the thumb zone while scrolling.
8. **Favorite heart micro-interaction:** on tapping a listing's heart, run a 150ms scale-pop (1.0 to 1.25 back to 1.0) with a brief checkmark flash, so the tap feels confirmed even on slow devices.
9. **Single-direction category browsing:** keep category browsing to one consistent 2-column vertical grid with a visible item count per category instead of mixing horizontal carousels and vertical lists, which the JumiaFood teardown showed users find confusing.
10. **Skeleton-to-content fade:** add a 150-200ms opacity fade when product card images resolve from shimmer skeletons instead of the current instant swap, making loading feel like one continuous motion.

## Sources

- https://dev.to/mryadavgulshan/material-design-4-in-android-ux-patterns-that-convert-3jcm (extended FAB, bottom nav 3-5 destinations, snackbars over toasts, button states)
- https://medium.com/@fateemaaleeyu42/redesigning-the-jumia-experience-a-ux-case-study-on-trust-and-delivery-transparency-c19a3a86150b (trust: verified sellers, transparency, clearer pricing)
- https://whatifdesign.co/feeds/blog/best-search-ux-design (zero-results as recovery experience, search transparency)
- https://htmlburger.com/blog/microinteractions-guide/ (microinteraction timing, motion supports interaction)
- https://fineartdesign.agency/e-commerce-ux-best-practices-a-2025-guide-to-higher-conversions-and-happier-shoppers/ (sticky CTA bars, thumb-reachable filters, typo-tolerant search, result counts)
- https://github.com/raihanetx/ui-ux-design-skill/blob/HEAD/06-component-patterns.md (bottom nav patterns: icon+label, active state, badges)
