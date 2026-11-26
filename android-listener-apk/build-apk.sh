#!/usr/bin/env bash
set -euo pipefail

# SumioPay Companion Android APK Automated Production Build Script
echo "=========================================================="
echo "  SumioPay Companion Android APK Production Compiler v2.4"
echo "=========================================================="

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ROOT_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

ANDROID_SDK="${ANDROID_HOME:-${HOME}/Library/Android/sdk}"
BUILD_TOOLS_VERSION="34.0.0"
PLATFORM_VERSION="android-34"

BUILD_TOOLS="${ANDROID_SDK}/build-tools/${BUILD_TOOLS_VERSION}"
PLATFORM_JAR="${ANDROID_SDK}/platforms/${PLATFORM_VERSION}/android.jar"
JAVAC="/opt/homebrew/opt/openjdk@17/bin/javac"
KEYTOOL="/opt/homebrew/opt/openjdk@17/bin/keytool"

# Fallbacks for standard environments
if [ ! -x "${JAVAC}" ]; then
  JAVAC="$(which javac || true)"
fi
if [ ! -x "${KEYTOOL}" ]; then
  KEYTOOL="$(which keytool || true)"
fi

echo "[1/7] Validating toolchain..."
if [ ! -f "${PLATFORM_JAR}" ]; then
  echo "ERROR: Android platform JAR not found at ${PLATFORM_JAR}"
  exit 1
fi
if [ ! -x "${BUILD_TOOLS}/aapt2" ]; then
  echo "ERROR: aapt2 not found at ${BUILD_TOOLS}/aapt2"
  exit 1
fi

BUILD_DIR="${SCRIPT_DIR}/build"
rm -rf "${BUILD_DIR}"
mkdir -p "${BUILD_DIR}/compiled_res" "${BUILD_DIR}/classes" "${BUILD_DIR}/dex"

echo "[2/7] Compiling Android resources with aapt2..."
"${BUILD_TOOLS}/aapt2" compile \
  --dir "${SCRIPT_DIR}/src/main/res" \
  -o "${BUILD_DIR}/compiled_res/"

echo "[3/7] Compiling Java source files with javac..."
"${JAVAC}" \
  -cp "${PLATFORM_JAR}" \
  -d "${BUILD_DIR}/classes" \
  "${SCRIPT_DIR}/src/main/java/com/sumiotech/sumiopay/"*.java

echo "[4/7] Generating classes.dex with d8..."
"${BUILD_TOOLS}/d8" \
  --lib "${PLATFORM_JAR}" \
  "${BUILD_DIR}/classes/com/sumiotech/sumiopay/"*.class \
  --output "${BUILD_DIR}/dex/"

echo "[5/7] Linking package and assembling unaligned APK..."
"${BUILD_TOOLS}/aapt2" link \
  -o "${BUILD_DIR}/unaligned.apk" \
  -I "${PLATFORM_JAR}" \
  --manifest "${SCRIPT_DIR}/src/main/AndroidManifest.xml" \
  "${BUILD_DIR}/compiled_res/"*.flat

echo "Adding classes.dex and Capacitor web assets to APK..."
cd "${BUILD_DIR}/dex"
zip -u "${BUILD_DIR}/unaligned.apk" classes.dex
cd "${SCRIPT_DIR}/src/main"
zip -r -u "${BUILD_DIR}/unaligned.apk" assets/
cd "${SCRIPT_DIR}"

echo "[6/7] Aligning APK (4-byte alignment with zipalign)..."
"${BUILD_TOOLS}/zipalign" -v -p 4 "${BUILD_DIR}/unaligned.apk" "${BUILD_DIR}/aligned.apk"

echo "[7/7] Cryptographically signing APK (v1, v2, v3 schemes)..."
KEYSTORE_PATH="${BUILD_DIR}/release.keystore"
rm -f "${KEYSTORE_PATH}"
"${KEYTOOL}" -genkeypair -v \
  -keystore "${KEYSTORE_PATH}" \
  -storepass sumiopay123 \
  -alias sumiopay \
  -keypass sumiopay123 \
  -keyalg RSA \
  -keysize 2048 \
  -validity 10000 \
  -dname "CN=SumioPay, OU=Fintech, O=SumioTech, L=New Delhi, ST=Delhi, C=IN"

FINAL_APK="${SCRIPT_DIR}/SumioPayListener-v2.4.apk"
FINAL_APK_V25="${SCRIPT_DIR}/SumioPayListener-v2.5.apk"
"${BUILD_TOOLS}/apksigner" sign \
  --ks "${KEYSTORE_PATH}" \
  --ks-pass pass:sumiopay123 \
  --ks-key-alias sumiopay \
  --min-sdk-version 21 \
  --v1-signing-enabled true \
  --v2-signing-enabled true \
  --v3-signing-enabled true \
  --out "${FINAL_APK}" \
  "${BUILD_DIR}/aligned.apk"

cp -f "${FINAL_APK}" "${FINAL_APK_V25}"

echo "Verifying APK integrity..."
"${BUILD_TOOLS}/apksigner" verify -v "${FINAL_APK}"

# Distribute final APK to backend and frontend download paths
echo "Distributing APK to download endpoints..."
mkdir -p "${ROOT_DIR}/backend/public/downloads" "${ROOT_DIR}/frontend/public/downloads" "${ROOT_DIR}/frontend/dist/downloads"
cp -f "${FINAL_APK}" "${ROOT_DIR}/backend/public/downloads/SumioPayListener-v2.4.apk"
cp -f "${FINAL_APK}" "${ROOT_DIR}/frontend/public/downloads/SumioPayListener-v2.4.apk"
cp -f "${FINAL_APK}" "${ROOT_DIR}/frontend/dist/downloads/SumioPayListener-v2.4.apk"
cp -f "${FINAL_APK}" "${ROOT_DIR}/backend/public/downloads/SumioPayListener-v2.5.apk"
cp -f "${FINAL_APK}" "${ROOT_DIR}/frontend/public/downloads/SumioPayListener-v2.5.apk"
cp -f "${FINAL_APK}" "${ROOT_DIR}/frontend/dist/downloads/SumioPayListener-v2.5.apk"

echo "=========================================================="
echo "  SUCCESS: SumioPayListener-v2.5.apk (and v2.4) compiled & signed!"
echo "  Location: ${FINAL_APK_V25}"
echo "  Size: $(du -h "${FINAL_APK_V25}" | awk '{print $1}')"
echo "=========================================================="
