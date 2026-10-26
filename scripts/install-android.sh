#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/android-env.sh"
cd "$MARGEN_ROOT"
if [ ! -f artifacts/margen-piloto-arm64.apk ]; then
  echo 'Primero genera el APK: npm run build:android:pilot' >&2
  exit 1
fi
if ! command -v adb >/dev/null 2>&1; then
  echo 'Falta adb. Consulta docs/compilacion-android.md.' >&2
  exit 1
fi
if [ -n "${1:-}" ]; then
  serial="$1"
else
  devices="$(adb devices | awk 'NR>1 && $2=="device" { print $1 }')"
  count="$(printf '%s\n' "$devices" | awk 'NF { n++ } END { print n+0 }')"
  if [ "$count" != 1 ]; then
    adb devices -l
    echo 'Conecta y autoriza un solo Android, o especifica su serial: npm run install:android:pilot -- SERIAL' >&2
    exit 1
  fi
  serial="$devices"
fi
abi="$(adb -s "$serial" shell getprop ro.product.cpu.abilist | tr -d '\r')"
case "$abi" in
  *arm64-v8a*) ;;
  *) echo "Este APK requiere ARM64. Arquitecturas detectadas: $abi" >&2; exit 1 ;;
esac
adb -s "$serial" install -r artifacts/margen-piloto-arm64.apk
echo 'Instalación completada. Abre Margen en el teléfono.'
