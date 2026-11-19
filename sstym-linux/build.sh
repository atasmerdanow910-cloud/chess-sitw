#!/usr/bin/env bash
# Sstym Linux ISO builder.
#
#   sudo ./build.sh test   # small live ISO (desktop + ~16 tools) — fast
#   sudo ./build.sh full   # full live ISO (desktop + 500+ tools)
#
# Requirements (Arch): archiso grub edk2-ovmf squashfs-tools
# The BlackArch repository + keyring must be configured in the build host's
# /etc/pacman.conf (scripts/setup-blackarch.sh does this).
set -euo pipefail

EDITION="${1:-test}"
HERE="$(cd "$(dirname "$0")" && pwd)"
PROFILE_SRC="$HERE/profile"
WORK="${WORK:-/var/tmp/sstym-build/$EDITION}"
OUT="${OUT:-$HERE/out}"
export SSTYM_VERSION="${SSTYM_VERSION:-$(date +%Y.%m.%d)}"

case "$EDITION" in
  test) TOOLS="$HERE/packages/test.tools" ;;
  full) TOOLS="$HERE/packages/full.tools" ;;
  *) echo "usage: $0 {test|full}"; exit 2 ;;
esac

[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
command -v mkarchiso >/dev/null || { echo "mkarchiso not found (install archiso)"; exit 1; }

echo "==> Preparing profile for '$EDITION' edition"
rm -rf "$WORK"
mkdir -p "$WORK" "$OUT"
PROFILE="$WORK/profile"
cp -a "$PROFILE_SRC" "$PROFILE"

# Assemble packages.x86_64 = base + edition tools (comments stripped)
{
  grep -vhE '^\s*#|^\s*$' "$HERE/packages/base.x86_64"
  grep -vhE '^\s*#|^\s*$' "$TOOLS"
} | sort -u > "$PROFILE/packages.x86_64"
echo "==> $(wc -l < "$PROFILE/packages.x86_64") packages in this edition"

echo "==> Running mkarchiso (this downloads packages and builds the squashfs)"
mkarchiso -v -w "$WORK/work" -o "$OUT" "$PROFILE"

ISO=$(ls -t "$OUT"/*.iso | head -1)
NEW="$OUT/sstym-$EDITION-$SSTYM_VERSION-x86_64.iso"
[ "$ISO" = "$NEW" ] || mv -f "$ISO" "$NEW"
( cd "$OUT" && sha256sum "$(basename "$NEW")" > "$(basename "$NEW").sha256" )
echo "==> Done: $NEW"
ls -lh "$NEW"*
