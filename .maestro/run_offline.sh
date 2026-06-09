#!/usr/bin/env bash
# Run the offline-mode test.
# Usage: .maestro/run_offline.sh [device-id]
# Example: .maestro/run_offline.sh emulator-5554
set -euo pipefail

DEVICE="${1:-emulator-5554}"
APP_ID="com.anonymous.rnme"

# Resolve app UID on the target device (needed for iptables owner-match rule)
APP_UID=$(adb -s "$DEVICE" shell "pm list packages -U | grep ${APP_ID}" \
  | grep -o 'uid:[0-9]*' | cut -d: -f2 | tr -d '[:space:]')

if [ -z "$APP_UID" ]; then
  echo "ERROR: Could not resolve UID for ${APP_ID}. Is the APK installed?"
  exit 1
fi

echo "App UID: $APP_UID"

restore_network() {
  echo "Restoring network for $APP_ID (UID $APP_UID)..."
  adb -s "$DEVICE" shell "su 0 iptables -D OUTPUT -m owner --uid-owner ${APP_UID} -j REJECT" 2>/dev/null || true
  adb -s "$DEVICE" shell "svc wifi enable" 2>/dev/null || true
  adb -s "$DEVICE" shell "svc data enable" 2>/dev/null || true
}

# Always restore network on exit (even on failure or Ctrl-C)
trap restore_network EXIT

# ── 1. Ensure app has network and log in ──────────────────────────────────────
restore_network
sleep 1

echo "Logging in (online session)..."
maestro --device "$DEVICE" test .maestro/flows/auth/login.yaml

# ── 2. Block app network via iptables ─────────────────────────────────────────
echo "Blocking network for $APP_ID..."
adb -s "$DEVICE" shell "su 0 iptables -I OUTPUT -m owner --uid-owner ${APP_UID} -j REJECT"
sleep 2

# ── 3. Run offline assertions ─────────────────────────────────────────────────
echo "Running offline assertions..."
maestro --device "$DEVICE" test .maestro/flows/browse/browse_offline.yaml
EXIT_CODE=$?

# trap handles restore on exit
echo "Done (exit $EXIT_CODE)"
exit $EXIT_CODE
