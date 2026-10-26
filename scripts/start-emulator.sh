#!/usr/bin/env bash
set -euo pipefail
sdk="${MARGEN_EMULATOR_SDK:-$HOME/Library/Android/sdk}"
if [ ! -x "$sdk/emulator/emulator" ]; then
  echo 'No se encontró el emulador de Android Studio. Define MARGEN_EMULATOR_SDK.' >&2
  exit 1
fi
exec "$sdk/emulator/emulator" -avd Margen_API35 -no-audio -gpu software -cores 4 -memory 3072
