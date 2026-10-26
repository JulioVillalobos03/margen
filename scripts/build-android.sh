#!/usr/bin/env bash
set -euo pipefail
source "$(dirname "$0")/android-env.sh"
cd "$MARGEN_ROOT"
if [ ! -d "$ANDROID_HOME/platforms/android-36" ]; then
  echo "Falta Android SDK 36. Consulta docs/compilacion-android.md." >&2
  exit 1
fi
npx expo prebuild --platform android --no-install
npm run typecheck
npm test
export NODE_ENV=production
cd android
# APK de piloto: 64-bit ARM. No es una versión de publicación.
./gradlew :margen-ocr:testReleaseUnitTest :app:assembleRelease -PreactNativeArchitectures=arm64-v8a --max-workers=2 --no-daemon
cd "$MARGEN_ROOT"
mkdir -p artifacts
cp android/app/build/outputs/apk/release/app-release.apk artifacts/margen-piloto-arm64.apk
"$ANDROID_HOME/build-tools/36.0.0/apksigner" verify artifacts/margen-piloto-arm64.apk
shasum -a 256 artifacts/margen-piloto-arm64.apk > artifacts/margen-piloto-arm64.apk.sha256
echo "APK listo: $MARGEN_ROOT/artifacts/margen-piloto-arm64.apk"
