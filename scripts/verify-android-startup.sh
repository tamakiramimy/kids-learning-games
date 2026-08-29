#!/usr/bin/env bash
set -euo pipefail

log_file="android-startup.log"
current_log="android-startup-current.log"

capture_log() {
  adb logcat -d -v threadtime > "$log_file" || true
}

trap capture_log EXIT

adb install -r android/app/build/outputs/apk/debug/app-debug.apk
adb shell svc wifi disable
adb shell svc data disable
adb logcat -c
adb shell am force-stop com.xingya.kidslearning
adb shell am start -W -n com.xingya.kidslearning/.MainActivity

ready=false
for attempt in $(seq 1 30); do
  adb logcat -d -v brief > "$current_log"
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