#!/usr/bin/env bash
# Source this file; changes apply only to the current shell/build.
MARGEN_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
export ANDROID_HOME="${MARGEN_ANDROID_SDK:-$MARGEN_ROOT/.tooling/android-sdk}"
export ANDROID_SDK_ROOT="$ANDROID_HOME"
export GRADLE_USER_HOME="$MARGEN_ROOT/.tooling/gradle"
if [ -d "$MARGEN_ROOT/.tooling/jdk21/Contents/Home" ]; then
  export JAVA_HOME="$MARGEN_ROOT/.tooling/jdk21/Contents/Home"
fi
export PATH="${JAVA_HOME:+$JAVA_HOME/bin:}$ANDROID_HOME/platform-tools:$ANDROID_HOME/cmdline-tools/latest/bin:$PATH"
