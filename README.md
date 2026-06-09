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
| Maestro CLI | latest |
| Android device or emulator | API 28+ recommended |

### Install Maestro

```bash
curl -Ls "https://get.maestro.mobile.dev" | bash
```

Verify:

```bash
maestro --version
```

### Install the APK

```bash
# Clone the repo you forked
git clone https://github.com/<your-fork>/rnme.git
cd rnme

# Connect your device / start an emulator, then:
adb install rnme.apk
```

---

## Running Tests

### Run all flows

```bash
maestro test .maestro/
```

### Run a single flow

```bash
maestro test .maestro/flows/auth/login.yaml
```

### Run a specific folder

```bash
maestro test .maestro/flows/favorites/
```

### Watch mode (re-runs on save)

```bash
maestro test --continuous .maestro/flows/browse/browse_search.yaml
```

### Generate a test report (HTML)

```bash
maestro test .maestro/ --format junit --output results.xml
```

---

## Test Suite Structure

```
.maestro/
└── flows/
    ├── auth/
    │   ├── _login_helper.yaml       # Shared login steps (imported by other flows)
    │   ├── login.yaml               # Happy path login
    │   ├── login_errors.yaml        # Empty fields, wrong password, bad email
    │   └── session_persist.yaml     # Session survives app restart
    ├── browse/
    │   ├── tab_navigation.yaml      # Tab bar smoke test
    │   ├── browse_search.yaml       # Search happy path + empty state
    │   └── movie_detail.yaml        # Detail screen + back navigation
    ├── favorites/
    │   ├── favorites.yaml           # Add → view → remove cycle
    │   └── favorites_persistence.yaml  # Favorites survive restart (AsyncStorage)
    └── profile/
        └── profile.yaml            # Theme toggle + sign out
```

**Naming convention:** flows prefixed with `_` are helpers, not standalone test cases.

---

## Element Targeting Strategy

Maestro is used in a layered fallback pattern to keep selectors resilient:

1. **`id:` first** — if `testID` props are set in the RN source, these are the most stable
2. **`text:` fallback** — visible label text; survives layout changes, breaks only on copy changes
3. **`index: 0`** — last resort for dynamic list items with no stable ID

This avoids brittle XPath or positional-only selectors that break on minor UI changes.

---

## Coverage Summary

| Area | Scenarios Covered |
|---|---|
| Auth | Happy path login, empty submit, wrong password, malformed email, session persistence |
| Browse | Default list loads, search match, search clear, no-results empty state |
| Movie Detail | Screen opens, overview visible, favorite toggle, back navigation |
| Favorites | Add, view, remove, persistence across restart |
| Profile | Theme toggle, sign out → returns to login |
| Navigation | Full tab bar smoke test |

**Out of scope (intentional):** trailer player (WebView, excluded per task spec), backend mocking (testing against live data as instructed).

---

## What I'd Tackle Next (With More Time)

- **Element IDs in source** — add `testID` props to key interactive elements (`email-input`, `favorite-button`, `theme-toggle`) so selectors don't rely on text matching at all
- **Scroll list coverage** — test pagination / infinite scroll on Browse; currently only first visible items are targeted
- **Offline mode** — intercept network via `adb shell settings put global airplane_mode_on 1` and assert the app surfaces a meaningful error rather than crashing
- **Cross-session favorites** — verify favorites aren't shared between user accounts (logout → login as different user)
- **CI integration** — GitHub Actions workflow: spin up an emulator, install APK, run full suite, publish JUnit XML as artifact
- **Visual regression baseline** — Maestro screenshots on each flow for pixel-diff tracking

---

## Test Credentials

```
Email:    test@rnme.com
Password: Test123$$
```
