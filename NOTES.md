# Test Focus & Decisions

## What I focused on first — and why

**Auth flows came first.** Everything downstream depends on login working. I covered the happy path plus three common failure modes (empty submit, wrong password, malformed email) and added a session persistence test — because `redux-persist` is explicitly in the stack and a broken persist config would silently affect every other flow.

**Favorites persistence second.** The task calls out `redux-persist` + AsyncStorage explicitly. If favorites vanish on restart, that's a data-loss bug users would notice immediately. Testing the full add → restart → verify cycle catches that without mocking.

**Selector strategy.** The app doesn't currently expose `testID` props (common in Expo projects). I used a layered fallback: `id:` first (future-proofing), `text:` second (resilient to layout changes), `index: 0` last resort for list items. Text selectors survive component restructuring; they only break on copy changes, which are easier to track.

**Search edge cases over UI polish.** I prioritised empty-state handling (no results, cleared search) over things like scroll position or image loading, because logic bugs in search ranking/filtering are harder to spot manually.

## What I skipped and why

- **Trailer player** — explicitly out of scope (WebView)
- **Backend mocking** — task says test against live data
- **Exact text assertions on movie titles** — TMDb live data means titles can change; I assert structural presence, not specific content

## What's next with more time

1. Add `testID` props to source — most impactful single change for selector stability
2. Offline mode test via ADB airplane mode toggle
3. Cross-account favorites isolation test
4. GitHub Actions CI: emulator + ADB + `maestro test` + JUnit report artifact
5. Scroll/pagination coverage on the Browse list
