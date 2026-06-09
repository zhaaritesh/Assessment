#!/usr/bin/env bash
# Runs the movie detail + trailer test in landscape orientation.
#
# Steps:
#   1. Login via the standard helper (portrait, clearState:true)
#   2. Rotate device to landscape
#   3. Run the landscape-specific flow (clearState:false — resumes session)
#   4. Restore portrait
#
# Usage:
#   ./.maestro/run_landscape.sh                # uses first connected device
#   ./.maestro/run_landscape.sh emulator-5554  # specific device

DEVICE=${1:-}
ADB="adb${DEVICE:+ -s $DEVICE}"
MAESTRO="maestro${DEVICE:+ --device $DEVICE}"

echo "→ Step 1: Logging in (portrait)"
$MAESTRO test .maestro/flows/auth/_login_helper.yaml || { echo "Login failed"; exit 1; }

echo "→ Step 2: Rotating to landscape"
$ADB shell settings put system accelerometer_rotation 0
$ADB shell settings put system user_rotation 1
sleep 1

echo "→ Step 3: Running Trailer + Save test in landscape"
$MAESTRO test .maestro/flows/browse/movie_detail_landscape.yaml
EXIT=$?

echo "→ Step 4: Restoring portrait"
$ADB shell settings put system user_rotation 0
$ADB shell settings put system accelerometer_rotation 1

exit $EXIT
