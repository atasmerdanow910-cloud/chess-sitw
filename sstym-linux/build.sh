#!/usr/bin/env bash
# Sstym Linux ISO builder.
#
#   sudo ./build.sh test   # small live ISO: desktop + everyday basics + a few tools
#   sudo ./build.sh full   # full ISO: + office/media apps, gaming (Steam, Wine,
#                          #   Lutris…), core security toolkit
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

P="$HERE/packages"
case "$EDITION" in
  test) LISTS=("$P/base.x86_64" "$P/comms.list" "$P/vpn.list" "$P/test.tools") ;;
  full) LISTS=("$P/base.x86_64" "$P/comms.list" "$P/vpn.list" "$P/apps.list"
               "$P/gaming.list" "$P/pentest-core.list") ;;
  *) echo "usage: $0 {test|full}"; exit 2 ;;
esac

[ "$(id -u)" = 0 ] || { echo "run as root"; exit 1; }
command -v mkarchiso >/dev/null || { echo "mkarchiso not found (install archiso)"; exit 1; }

echo "==> Preparing profile for '$EDITION' edition"
rm -rf "$WORK"
mkdir -p "$WORK" "$OUT"
PROFILE="$WORK/profile"
cp -a "$PROFILE_SRC" "$PROFILE"

# Assemble packages.x86_64 from the edition's lists (comments stripped)
strip() { sed -e 's/#.*//' -e 's/[[:space:]]*$//' -e 's/^[[:space:]]*//' "$@" | grep -v '^$'; }
strip "${LISTS[@]}" | sort -u > "$PROFILE/packages.x86_64"
echo "==> $(wc -l < "$PROFILE/packages.x86_64") packages in this edition"

# ── AUR packages (Tor Browser, VPN clients…) ─────────────────────────────
# Built here with yay as an unprivileged user, then served to mkarchiso from a
# local repository. A package that fails to build is skipped, not fatal.
# Set SSTYM_AUR=0 to skip this stage (e.g. offline builds).
if [ "${SSTYM_AUR:-1}" = 1 ] && [ -f "$P/aur.list" ]; then
  echo "==> Building AUR packages"
  LOCALREPO="$WORK/localrepo"; mkdir -p "$LOCALREPO"
  pacman -S --noconfirm --needed base-devel git yay >/dev/null
  id builder &>/dev/null || useradd -m builder
  echo "builder ALL=(ALL) NOPASSWD: ALL" > /etc/sudoers.d/99-sstym-builder
  chmod 440 /etc/sudoers.d/99-sstym-builder
  built=()
  for pkg in $(strip "$P/aur.list"); do
    echo "==> AUR: $pkg"
    if sudo -u builder -H yay -S --noconfirm --needed --pgpfetch \
         --answerclean None --answerdiff None --answeredit None \
         --builddir /home/builder/aur "$pkg"; then
      built+=("$pkg")
    else
      echo "!! AUR build failed for $pkg — skipping it"
    fi
  done
  find /home/builder/aur -name '*.pkg.tar.zst' -exec cp -n {} "$LOCALREPO/" \; 2>/dev/null || true
  if [ "${#built[@]}" -gt 0 ] && ls "$LOCALREPO"/*.pkg.tar.zst >/dev/null 2>&1; then
    repo-add -q "$LOCALREPO/sstym-local.db.tar.gz" "$LOCALREPO"/*.pkg.tar.zst
    printf '\n[sstym-local]\nSigLevel = Optional TrustAll\nServer = file://%s\n' "$LOCALREPO" >> "$PROFILE/pacman.conf"
    printf '%s\n' "${built[@]}" >> "$PROFILE/packages.x86_64"
    echo "==> AUR packages included: ${built[*]}"
  else
    echo "==> No AUR packages built"
  fi
fi

echo "==> Running mkarchiso (this downloads packages and builds the squashfs)"
mkarchiso -v -w "$WORK/work" -o "$OUT" "$PROFILE"

ISO=$(ls -t "$OUT"/*.iso | head -1)
NEW="$OUT/sstym-$EDITION-$SSTYM_VERSION-x86_64.iso"
[ "$ISO" = "$NEW" ] || mv -f "$ISO" "$NEW"
( cd "$OUT" && sha256sum "$(basename "$NEW")" > "$(basename "$NEW").sha256" )
echo "==> Done: $NEW"
ls -lh "$NEW"*
