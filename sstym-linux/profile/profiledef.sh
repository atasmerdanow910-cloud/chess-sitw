#!/usr/bin/env bash
# shellcheck disable=SC2034
# Sstym Linux - archiso profile definition

iso_name="sstym"
iso_label="SSTYM_$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y%m)"
iso_publisher="Sstym Linux <https://github.com/atasmerdanow910-cloud/chess-sitw>"
iso_application="Sstym Linux Live/Install"
iso_version="${SSTYM_VERSION:-$(date --date="@${SOURCE_DATE_EPOCH:-$(date +%s)}" +%Y.%m.%d)}"
install_dir="sstym"
pacman_conf="pacman.conf"
buildmodes=('iso')
bootmodes=('bios.syslinux'
           'uefi.grub')
airootfs_image_type="squashfs"
airootfs_image_tool_options=('-comp' 'zstd' '-Xcompression-level' '18' '-b' '1M')
bootstrap_tarball_compression=('zstd' '-c' '-T0' '--auto-threads=logical' '--long' '-19')
file_permissions=(
  ["/etc/shadow"]="0:0:400"
  ["/etc/gshadow"]="0:0:400"
  ["/root"]="0:0:750"
  ["/root/.automated_script.sh"]="0:0:755"
  ["/root/.gnupg"]="0:0:700"
  ["/etc/sudoers.d"]="0:0:750"
  ["/usr/local/bin/sstym-install"]="0:0:755"
  ["/usr/local/bin/sstym-live-session"]="0:0:755"
  ["/usr/local/bin/sstym-session"]="0:0:755"
  ["/usr/local/bin/sstym-live-setup"]="0:0:755"
  ["/usr/local/bin/sstym-autostart"]="0:0:755"
  ["/usr/local/bin/sstym-powermenu"]="0:0:755"
  ["/usr/local/bin/sstym-harden"]="0:0:755"
  ["/usr/local/bin/sstym-dock"]="0:0:755"
  ["/usr/local/bin/sstym-vpn"]="0:0:755"
  ["/usr/local/bin/sstym-flathub"]="0:0:755"
  ["/usr/local/bin/sstym-gamemode"]="0:0:755"
  ["/usr/local/bin/sstym-driver"]="0:0:755"
  ["/usr/local/bin/sstym-tools"]="0:0:755"
  ["/usr/local/bin/sstym-update"]="0:0:755"
  ["/usr/local/bin/sstym-settings"]="0:0:755"
)
