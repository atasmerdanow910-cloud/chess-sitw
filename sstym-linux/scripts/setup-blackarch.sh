#!/usr/bin/env bash
# Configure the BlackArch repository + keyring on an Arch build host.
# Verifies the keyring signature over HTTPS (works behind proxies) before trusting it.
set -euo pipefail
SIGNERS="8F9A9793CB8591147C2EC70566E0CDBD1E01F333 A0917C4147A37007CB54C1CFD295AA940EFDDF62 4345771566D76038C7FEB43863EC0ADBEA87E4E3 F9A6E68A711354D84A9B91637533BAFE69A25079"
tmp=$(mktemp -d); cd "$tmp"
repo=https://blackarch.org/blackarch/blackarch/os/x86_64
curl -sfL -O "$repo/blackarch.db"
PKG=$(bsdtar -xOf blackarch.db 'blackarch-keyring-*/desc' | awk '/^%FILENAME%$/ {getline; print; exit}')
curl -sfL -O "$repo/$PKG"; curl -sfL -O "$repo/$PKG.sig"
export GNUPGHOME="$tmp/gnupg"; mkdir -m700 "$GNUPGHOME"
for f in $SIGNERS; do
  curl -sf "https://keyserver.ubuntu.com/pks/lookup?op=get&search=0x$f" | gpg --import 2>/dev/null || true
done
signer=$(gpg --status-fd 1 --verify "$PKG.sig" "$PKG" 2>/dev/null | awk '$2=="VALIDSIG"{print $NF}')
gpgconf --kill all || true; unset GNUPGHOME
echo "$SIGNERS" | tr ' ' '\n' | grep -qx "$signer" || { echo "UNTRUSTED keyring signer: $signer" >&2; exit 1; }
echo "[+] keyring $PKG verified (signer $signer)"
pacman-key --init
mkdir -p pkg && bsdtar -xf "$PKG" -C pkg usr/share/pacman/keyrings
cp pkg/usr/share/pacman/keyrings/* /usr/share/pacman/keyrings/
pacman-key --populate blackarch
pacman -U --noconfirm --overwrite '/usr/share/pacman/keyrings/blackarch*' "$PKG"
echo 'Server = https://www.blackarch.org/blackarch/$repo/os/$arch' > /etc/pacman.d/blackarch-mirrorlist
grep -q '^\[blackarch\]' /etc/pacman.conf || printf '\n[blackarch]\nInclude = /etc/pacman.d/blackarch-mirrorlist\n' >> /etc/pacman.conf
# ensure multilib is on (base list uses it for some tools)
if ! grep -q '^\[multilib\]' /etc/pacman.conf; then
  printf '\n[multilib]\nInclude = /etc/pacman.d/mirrorlist\n' >> /etc/pacman.conf
fi
pacman -Sy
echo "[+] BlackArch ready: $(pacman -Sgq blackarch 2>/dev/null | wc -l) packages available"
