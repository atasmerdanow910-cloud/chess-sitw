#!/usr/bin/env bash
# Сборка SystemMarket.apk официальными инструментами Android SDK (без Gradle):
# aapt2 (ресурсы) → javac → d8 (dex) → zipalign → apksigner.
# Запускается в GitHub Actions (.github/workflows/android-apk.yml), где SDK уже установлен.
set -euo pipefail
cd "$(dirname "$0")"

SDK="${ANDROID_HOME:-${ANDROID_SDK_ROOT:-}}"
[ -d "$SDK" ] || { echo "Нет Android SDK (переменная ANDROID_HOME)"; exit 1; }
BT=$(ls -d "$SDK"/build-tools/*/ | sort -V | tail -1)
JAR="$(ls -d "$SDK"/platforms/android-*/ | sort -V | tail -1)android.jar"
MIN=21
TARGET=34
VERSION_CODE="${VERSION_CODE:-1}"
VERSION_NAME="${VERSION_NAME:-1.0}"
echo "build-tools: $BT"
echo "android.jar: $JAR"

OUT=build
rm -rf "$OUT"
mkdir -p "$OUT/classes" "$OUT/dex"

"$BT/aapt2" compile --dir res -o "$OUT/res.zip"
"$BT/aapt2" link -o "$OUT/base.apk" -I "$JAR" --manifest AndroidManifest.xml \
  --min-sdk-version "$MIN" --target-sdk-version "$TARGET" \
  --version-code "$VERSION_CODE" --version-name "$VERSION_NAME" "$OUT/res.zip"

javac -proc:none -source 8 -target 8 -encoding UTF-8 -Xlint:-options \
  -bootclasspath "$JAR" -d "$OUT/classes" $(find src -name '*.java')
"$BT/d8" --release --min-api "$MIN" --lib "$JAR" --output "$OUT/dex" $(find "$OUT/classes" -name '*.class')

cp "$OUT/base.apk" "$OUT/unsigned.apk"
(cd "$OUT/dex" && zip -q -X ../unsigned.apk classes.dex)
"$BT/zipalign" -f -p 4 "$OUT/unsigned.apk" "$OUT/aligned.apk"

# Ключ подписи: из секретов репозитория (если их добавили), иначе новый для этой сборки.
KS="$OUT/release.p12"
if [ -n "${ANDROID_KEYSTORE_B64:-}" ] && [ -n "${ANDROID_KEYSTORE_PASS:-}" ]; then
  printf '%s' "$ANDROID_KEYSTORE_B64" | base64 -d > "$KS"
  PASS="$ANDROID_KEYSTORE_PASS"
else
  PASS=$(openssl rand -hex 16)
  keytool -genkeypair -keystore "$KS" -storetype PKCS12 -storepass "$PASS" -keypass "$PASS" \
    -alias systemmarket -keyalg RSA -keysize 2048 -validity 10000 \
    -dname "CN=SystemMarket, O=SystemMarket, C=TM" >/dev/null 2>&1
fi
"$BT/apksigner" sign --ks "$KS" --ks-pass "pass:$PASS" --ks-key-alias systemmarket \
  --out "$OUT/SystemMarket.apk" "$OUT/aligned.apk"
rm -f "$KS"

"$BT/apksigner" verify --verbose "$OUT/SystemMarket.apk"
"$BT/aapt2" dump badging "$OUT/SystemMarket.apk" | head -25
ls -la "$OUT/SystemMarket.apk"
