# RNME — QA Automation Test Suite

Automated E2E tests for the RNME Android movie browsing app, written with [Maestro](https://maestro.mobile.dev).

## Why Maestro

| Factor | Reasoning |
|---|---|
| Zero native build step | Works directly against the APK via ADB — no app rebuild, no SDK wiring |
| YAML flows | Human-readable, easy for any engineer to maintain or extend without coding |
| React Native-friendly | Handles async rendering and RN's bridge delays well (`waitForAnimationToEnd`) |
| Fast feedback loop | `maestro test` on a single flow runs in seconds |
| CI-ready | Single binary, exits non-zero on failure — drops straight into any pipeline |

Alternatives considered: **Appium** (more powerful but heavy setup, slower iteration), **Detox** (requires app rebuild with test runner, doesn't work with pre-built APK), **WebdriverIO** (good for web-heavy RN but overkill here).

---

## Prerequisites

| Requirement | Version |
|---|---|
| Java | 11+ |
| Android SDK / ADB | any recent |
| Maestro CLI | latest (`curl -Ls "https://get.maestro.mobile.dev" \| bash`) |
| Android device or emulator | API 28+ recommended |

### Install the APK

```bash
git clone https://github.com/zhaaritesh/Assessment.git
cd Assessment
adb install rnme.apk
```

---

## Running Tests

```bash
# Full suite (Maestro 2.6 does not recurse subdirectories automatically)
maestro test \
  .maestro/flows/auth/login.yaml \
  .maestro/flows/auth/login_errors.yaml \
  .maestro/flows/auth/guest_login.yaml \
  .maestro/flows/auth/session_persist.yaml \
  .maestro/flows/browse/tab_navigation.yaml \
  .maestro/flows/browse/browse_search.yaml \
  .maestro/flows/browse/browse_search_edge.yaml \
  .maestro/flows/browse/movie_detail.yaml \
  .maestro/flows/browse/movie_detail_orientation.yaml \
  .maestro/flows/favorites/favorites.yaml \
  .maestro/flows/favorites/favorites_persistence.yaml \
  .maestro/flows/favorites/favorites_from_favorites.yaml \
  .maestro/flows/favorites/favorites_saved_state.yaml \
  .maestro/flows/profile/profile.yaml \
  .maestro/flows/profile/profile_content.yaml

# Single flow
maestro test .maestro/flows/auth/login.yaml

# Landscape orientation test (Maestro 2.6 has no native rotation command — ADB wrapper provided)
.maestro/run_landscape.sh                          # default device
.maestro/run_landscape.sh emulator-5554            # specific device

# Offline mode test (logs in online, blocks network via iptables, asserts offline UI)
.maestro/run_offline.sh                            # default device
.maestro/run_offline.sh emulator-5554              # specific device

# Watch mode (re-runs on save)
maestro test --continuous .maestro/flows/browse/browse_search.yaml

# JUnit XML report (for CI)
maestro test --format junit --output results.xml \
  .maestro/flows/auth/login.yaml [... all flows as above]
```

---

## Configuration

Credentials and app ID are defined as `env:` defaults inside each flow that uses them. Override at runtime via CLI flags — no file edits needed:

```bash
# Run with a different test account
maestro test \
  --env TEST_EMAIL=other@test.com \
  --env TEST_PASSWORD=MyPass123 \
  .maestro/

# Run against a different app variant (e.g. debug build)
maestro test \
  --env APP_ID=com.example.rnme.debug \
  .maestro/flows/auth/login.yaml
```

Default values (used when no `--env` flag is provided):

| Variable | Default |
|---|---|
| `TEST_EMAIL` | `test@rnme.com` |
| `TEST_PASSWORD` | `Test123$$` |

---

## Test Suite Structure

```
.maestro/
└── flows/
    ├── auth/
    │   ├── _login_helper.yaml            # Shared login steps — imported by all flows that need auth
    │   ├── login.yaml                    # Happy path: credentials → Browse tab
    │   ├── login_errors.yaml             # 8 error cases: empty, bad format, short pw, wrong creds, server errors
    │   ├── guest_login.yaml              # Anonymous login, guest profile indicator, sign-out
    │   └── session_persist.yaml          # Session survives cold restart (redux-persist)
    ├── browse/
    │   ├── tab_navigation.yaml              # Tab bar smoke: Browse → Favorites → Profile → Browse
    │   ├── browse_search.yaml               # Search: match, clear, no-results empty state
    │   ├── browse_search_edge.yaml          # Edge cases: min-char hint, case-insensitive, special chars
    │   ├── browse_offline.yaml              # Offline banner + cached list (run via run_offline.sh)
    │   ├── movie_detail.yaml                # Detail screen: RELEASED/RATING/RUNTIME, Save/Saved toggle
    │   └── movie_detail_orientation.yaml    # Trailer button (portrait + landscape via ADB wrapper)
    ├── favorites/
    │   ├── favorites.yaml                # Add → view in tab → remove → empty state
    │   ├── favorites_persistence.yaml    # Favorites survive app restart (AsyncStorage)
    │   ├── favorites_from_favorites.yaml # Open detail from Favorites tab — back returns to Favorites
    │   └── favorites_saved_state.yaml    # Re-opening a saved movie shows Saved immediately (Redux state)
    └── profile/
        ├── profile.yaml                  # Theme toggle (Light/Dark/System), tab persistence, sign-out
        └── profile_content.yaml          # Content: email shown correctly, all sections present
```

**Naming convention:** flows prefixed with `_` are shared helpers, not standalone test cases.

---

## Element Targeting Strategy

The APK has no `testID`/`resource-id` props on most elements, so selectors are built in a priority order designed to survive minor UI changes:

| Priority | Selector | When used | Fragility |
|---|---|---|---|
| 1 | `id:` | Only when `testID` is set in source | Most stable |
| 2 | `text:` | Visible label or placeholder text | Breaks on copy changes only |
| 3 | `label:` | Accessibility text (`accessibilityLabel`) | Stable if a11y is maintained |
| 4 | `point:` | Dynamic list items with no stable text (movie rows) | Breaks on layout changes |

**Key discovery documented:** The password `EditText` has no `resource-id` and `secureTextEntry` masks input. It's targeted via `tapOn: text: "••••••••"` — the literal placeholder value visible in Android's accessibility tree. Verified via `maestro hierarchy`.

**Keyboard handling:** After typing the password, the soft keyboard covers the "Log in" button (the button exits the accessibility tree while the keyboard is active). A `- hideKeyboard` step is added before every "Log in" tap to dismiss the keyboard first. This pattern was confirmed via `maestro hierarchy` inspection.

**Dynamic list items** (movie rows) are tapped by coordinate. Coordinates differ by screen because list headers push cards to different vertical positions:
- Browse list (has "Popular right now" header): `point: "50%, 32%"`
- Favorites list (shorter header): `point: "50%, 20%"`

Both verified against the live accessibility tree on Pixel 6 (1080×2400). Intentionally tests *any* movie rather than a hardcoded title.

---

## What I Focused On & Why

**Auth first.** Everything downstream depends on login working. I covered the happy path, eight validation/error states, anonymous login, and session persistence — because `redux-persist` is explicitly in the stack and a broken persist config would silently break every other flow.

**Favorites persistence second.** The task calls out `redux-persist` + AsyncStorage explicitly. If saved movies vanish on restart, that's a data-loss bug users notice immediately. I tested the full add → restart → verify cycle, plus in-session state consistency (re-opening a saved movie should show "Saved" without re-saving).

**Search edge cases over UI polish.** I prioritised boundary behaviour (min-char threshold, case-insensitivity, special characters, empty state) over things like scroll position or image loading — logic bugs in search are harder to spot manually than layout issues.

**Structural assertions, not value-based.** TMDb live data changes daily, so movie assertions target section headers (RELEASED, RATING, RUNTIME) rather than specific titles or numbers. This makes the suite resilient to data drift without mocking.

**What I skipped intentionally:**
- Trailer WebView *content* — explicitly out of scope; only asserting the player opens and back works
- Backend mocking — task says test against live data
- Exact movie title assertions — TMDb data is dynamic; structural presence is sufficient

---

## Coverage Summary

| Area | What's Tested |
|---|---|
| **Auth — happy path** | Email + password login → lands on Browse |
| **Auth — validation errors** | Empty form, email-only, password-only, invalid format, short password (< 6 chars) |
| **Auth — server errors** | Wrong password, non-existent email → "Invalid login credentials" |
| **Auth — guard** | Login screen stays on validation failure; no navigation to Browse |
| **Auth — guest** | Anonymous login → Browse accessible; Profile shows "Guest" not email; sign-out works |
| **Auth — session** | Session persists across cold restart; login screen not shown when already authenticated |
| **Browse — list** | Movie list loads with "Popular right now"; tab active after login |
| **Browse — search** | Match found, clear restores list, no-results empty state |
| **Browse — search edge** | 1-char input triggers hint (MIN_SEARCH_CHARS=2); case-insensitive; special chars don't crash |
| **Movie Detail — metadata** | RELEASED, RATING, RUNTIME sections visible; Trailer and Save buttons present |
| **Movie Detail — Save/Saved toggle** | Save toggles to Saved and back; re-opening saved movie shows Saved immediately |
| **Movie Detail — Trailer** | Trailer button opens player (RELEASED no longer visible); back returns to detail |
| **Movie Detail — Landscape** | Same Trailer + Save interactions verified in landscape via `run_landscape.sh` |
| **Movie Detail — Favorites entry** | Opened from Favorites tab shows "Saved" immediately; back → Favorites (not Browse) |
| **Favorites — CRUD** | Add, view in tab, remove, empty state ("No saved films yet") |
| **Favorites — persistence** | Saved movies survive app restart (AsyncStorage/redux-persist) |
| **Favorites — session state** | Re-opening a saved movie shows "Saved" without re-save (Redux store consistent) |
| **Profile — actions** | Theme toggle (Light/Dark/System), theme persists on tab switch, sign-out → Login |
| **Profile — content** | Email displayed correctly, "SIGNED IN AS" section, all theme options rendered |
| **Navigation** | Full tab bar smoke test across all three tabs |
| **Offline — Browse** | Offline banner shown when network unavailable; cached movie list still visible; tab navigation works offline (run via `run_offline.sh`) |

**Out of scope (intentional):**
- Trailer WebView *content* — video playback and controls are not asserted; only that the player opens and back navigation works
- Backend mocking — testing against live Supabase/TMDb as instructed
- Visual / pixel-level assertions — not supported by Maestro without additional tooling

---

## Known Issues / Limitations

| Issue | Impact | Workaround / Path to Fix |
|---|---|---|
| No `testID`/`resource-id` on most elements | List-item taps use coordinates (`point: "50%, 32%"`) — fragile if layout reflows | Add `testID` props in source and rebuild APK |
| Password field has no stable ID | Targeted via `"••••••••"` placeholder text — breaks if placeholder string changes | Add `testID="password-input"` to the `TextInput` in `LoginScreen.tsx` |
| Live TMDb data | Movie titles and metadata change daily; all movie assertions are structural (RELEASED, RATING, RUNTIME) not value-based | Pin specific movie IDs in a staging API key if needed |
| Supabase network dependency | Login-error cases 6–7 make real API calls; flaky on slow or offline networks | Add `extendedWaitUntil` with a longer timeout, or stub in CI with a Supabase local instance |
| Theme change not auto-diffed | Screenshots are captured after each theme tap but not pixel-compared | Integrate Percy or Applitools for visual regression on top of the captured screenshots |
| Image content unverifiable | Maestro cannot assert that poster or backdrop images actually loaded (only that the screen is rendered) | Add visual regression tooling |
| Trailer WebView content | Video controls and playback are not assertable via Maestro | Espresso Web or Playwright for WebView-internal assertions |
| Landscape orientation via Maestro | Maestro 2.6 has no native rotation command — orientation is set with `adb shell` before running `run_landscape.sh` | Will be resolved natively in a future Maestro release |
| Offline test on emulators | Emulator virtual network does not respond to `svc wifi disable`/airplane-mode broadcasts on Android 12+; `run_offline.sh` uses `iptables --uid-owner` to block the app's traffic, which triggers the offline UI correctly | Works as-is on emulators with root; physical devices use standard airplane mode toggle |

---

## What I'd Tackle Next

- **CI pipeline** — GitHub Actions: spin up emulator, install APK, run full suite, publish JUnit XML as artifact
- **`testID` props in source** — add to password field, save button, theme toggle so selectors are ID-based instead of text/coordinate-based
- **Cross-account isolation** — sign out, create a second guest session, verify first user's favorites are not visible
- **Scroll / pagination** — scroll Browse list to bottom and assert next page loads
- **Visual regression** — Maestro screenshot on each flow as a baseline; diff on subsequent runs to catch unintended UI changes

---

## AI Tooling Disclosure

Cursor / Claude was used to accelerate: hierarchy inspection, flow scaffolding, and iterating on selector strategies. All test logic, priorities, and decisions were driven by manual exploration of the app and analysis of the Android accessibility tree via `maestro hierarchy`.

---

## Test Credentials

```
Email:    test@rnme.com
Password: Test123$$
```
