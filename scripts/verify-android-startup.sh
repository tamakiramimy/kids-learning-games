#!/usr/bin/env bash
set -uo pipefail

log_file="android-startup.log"
current_log="android-startup-current.log"
app_pid=""

capture_log() {
  if [ -n "$app_pid" ]; then
    adb logcat -d -v threadtime --pid="$app_pid" > "$log_file" || true
  else
    adb logcat -d -v threadtime > "$log_file" || true
  fi
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
app_pid="$(adb shell pidof com.xingya.kidslearning | tr -d '\r')"
if [ -z "$app_pid" ]; then
  echo '[android-startup] App process did not start.'
  exit 1
fi
echo "[android-startup] App PID: $app_pid"

ready=false
for attempt in $(seq 1 90); do
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
  grep -E 'Capacitor|chromium|AndroidRuntime|xingya|FATAL|Exception|Error' "$current_log" | tail -n 100 || true
  adb shell dumpsys activity activities | grep -E 'mResumedActivity|topResumedActivity|com.xingya.kidslearning' | head -n 40 || true
  exit 1
fi

echo 'Android reached AdventureMapScene while offline.'