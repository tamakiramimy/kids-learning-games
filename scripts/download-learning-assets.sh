#!/usr/bin/env bash
set -euo pipefail

asset_dir="public/assets/openmoji"
base_url="https://openmoji.org/data/color/svg"

mkdir -p "$asset_dir"

assets=(
  "boy:1F466"
  "woman:1F469"
  "waving-hand:1F44B"
  "school:1F3EB"
  "books:1F4DA"
  "red-apple:1F34E"
  "watermelon:1F349"
  "pizza:1F355"
  "dog:1F436"
  "cat:1F431"
  "fox:1F98A"
  "car:1F697"
  "bus:1F68C"
  "bicycle:1F6B2"
  "sunrise:1F305"
  "beach:1F3D6"
)

for asset in "${assets[@]}"; do
  name="${asset%%:*}"
  codepoint="${asset##*:}"
  target="$asset_dir/$name.svg"
  curl --fail --location --silent --show-error \
    "$base_url/$codepoint.svg" \
    --output "$target"
  printf 'Downloaded %s\n' "$target"
done