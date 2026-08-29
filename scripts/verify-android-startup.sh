#!/usr/bin/env bash
set -uo pipefail

log_file="android-startup.log"
current_log="android-startup-current.log"

capture_log() {
  adb logcat -d -v threadtime > "$log_file" || true
}

run_required() {
  local label="$1"
  shift

  echo "[android-startup] $label"
  "$@"
  local status=$?
  if [ "$status" -ne 0 ]; then
    echo "[android-startup] $label failed with exit code $status"
    capture_log
    exit "$status"
  fi
}

run_optional() {
  local label="$1"
  shift

  echo "[android-startup] $label"
  if ! "$@"; then
    echo "[android-startup] $label is unavailable on this emulator; continuing."
  fi
}

trap capture_log EXIT

run_required 'Install APK' adb install -r android/app/build/outputs/apk/debug/app-debug.apk
run_optional 'Disable Wi-Fi' adb shell svc wifi disable
run_optional 'Disable mobile data' adb shell svc data disable
run_required 'Clear logcat' adb logcat -c
run_required 'Stop app' adb shell am force-stop com.xingya.kidslearning
run_required 'Start app' adb shell am start -W -n com.xingya.kidslearning/.MainActivity

ready=false
for attempt in $(seq 1 30); do
  run_required 'Read startup log' adb logcat -d -v brief > "$current_log"
  if grep -Fq '[xingya] startup-ready AdventureMapScene' "$current_log"; then
    ready=true
    break
  fi
  sleep 1
done

capture_log

if grep -Eq 'JavaScript Error|Uncaught TypeError|FATAL EXCEPTION' "$log_file"; then
  echo 'Android startup emitted a fatal error.'
  exit 1
fi

if [ "$ready" != true ]; then
  echo 'Android did not reach AdventureMapScene while offline.'
  exit 1
fi

echo 'Android reached AdventureMapScene while offline.'