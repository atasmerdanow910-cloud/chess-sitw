<div align="center">

<img src="branding/out/logo-256.png" width="140" alt="Sstym Linux logo">

# Sstym Linux

**Everyday desktop · gaming · security** — `hack · learn · build`

Arch-based · macOS-style Hyprland desktop · Steam & Proton · BlackArch tools · graphical installer

</div>

---

Sstym Linux is a custom Arch-based distribution built with
[`archiso`](https://gitlab.archlinux.org/archlinux/archiso). It boots into a
macOS-style **Hyprland** desktop (menu bar, dock, Launchpad, frosted glass)
and aims to be comfortable for everyday use, good for gaming and ready for
security work, with fresh rolling-release packages and AUR access.

## What's inside

| | |
|---|---|
| **Desktop** | Hyprland with a macOS look: top menu bar (Waybar), dock with favourites (nwg-dock), Launchpad (nwg-drawer), Spotlight search (rofi), frosted blur, Big Sur–style wallpaper |
| **Everyday** | Firefox, Thunar, Flathub **App Store** (GNOME Software), LibreOffice, Telegram, Discord, VLC, GIMP, OBS, KeePassXC, qBittorrent, printers, Timeshift backups |
| **Gaming** | Steam (Proton), Lutris, Wine-staging + winetricks, Protontricks, GameMode, MangoHud + GOverlay, Gamescope, Prism Launcher, 32-bit Vulkan drivers, one-click NVIDIA driver installer, **Game mode** (SUPER+G) |
| **Security** | Core toolkit (nmap, Wireshark, Metasploit, Burp Suite, ZAP, sqlmap, hashcat, John, Hydra, Ghidra, radare2, Volatility, Lynis…) plus **Sstym Tools**: install any of 2800+ BlackArch tools by category |
| **Protection** | ufw firewall on by default (deny incoming), hardened kernel sysctls, Wi-Fi MAC randomisation, no listening services |
| **No lag** | zram compressed swap, tuned sysctls, lighter blur, automatic low-effects mode in VMs, Game mode |
| **Packages** | pacman, AUR via `yay`/`paru`, Flatpak/Flathub |
| **Installer** | Calamares, branded "Install Sstym Linux" |

## Editions

| Edition | Contents | Use |
|---|---|---|
| **test** | Desktop + everyday basics + a few tools (~2.8 GB) | Try it in a VM first |
| **full** | Everything above: apps, gaming, security toolkit (~4 GB) | The real thing to flash to USB |

## Download

ISOs are published on this repo's **Releases** page by the
[`Build Sstym Linux ISO`](../.github/workflows/build-iso.yml) workflow.
Release files are limited to 2 GB, so larger ISOs come in `*.partNN` pieces:

```bash
cat sstym-full-*.iso.part* > sstym-full.iso
sha256sum -c sstym-full-*.iso.sha256
```

### Try it on Fedora first (VM)

```bash
sudo dnf install @virtualization        # virt-manager / QEMU / GNOME Boxes
qemu-system-x86_64 -enable-kvm -m 6144 -smp 4 -vga virtio -display gtk,gl=on \
  -cdrom sstym-test-*.iso
```
In a VM Sstym switches off heavy effects automatically so it stays smooth.

### Flash to USB

```bash
lsblk                                          # find your USB stick, e.g. /dev/sdb
sudo dd if=sstym-full.iso of=/dev/sdX bs=4M status=progress oflag=sync
```
Boot from the USB stick (Secure Boot off), try the live desktop, then click
**Install Sstym Linux**. ⚠️ `dd` erases the whole target device — double-check `sdX`.

## Shortcuts

| Keys | Action |
|---|---|
| `Super`+`Space` | Spotlight search |
| `Super`+`A` | Launchpad (all apps) |
| `Super`+`I` | Sstym Settings (Wi-Fi, Bluetooth, sound, displays, drivers, firewall, App Store…) |
| `Super`+`G` | Game mode on/off |
| `Super`+`U` | Update everything (pacman + AUR + Flatpak) |
| `Super`+`Return` | Terminal |
| `Super`+`B` / `E` | Browser / Files |
| `Super`+`Q` | Close window |
| `Super`+`1…0` | Workspaces |
| `Super`+`L` | Lock screen |
| `Super`+`Shift`+`I` | Install to disk |
| `Alt`+`Shift` | Switch keyboard layout (EN/RU) |

Live user: **`sstym`**, no password, passwordless `sudo`.

## Build it yourself

Needs an **Arch Linux** host or container with `archiso`:

```bash
sudo ./sstym-linux/scripts/setup-blackarch.sh   # BlackArch repo + verified keyring
sudo ./sstym-linux/build.sh test                # or: full
```

## Layout

```
sstym-linux/
├── build.sh                     # mkarchiso wrapper (test|full)
├── scripts/setup-blackarch.sh
├── branding/                    # logo.svg, render.py, macwall.py, generated art
├── packages/
│   ├── base.x86_64              # system, desktop, security, everyday basics
│   ├── apps.list                # office / media / chat (full)
│   ├── gaming.list              # Steam, Wine, Lutris, GameMode… (full)
│   ├── pentest-core.list        # core security toolkit (full)
│   └── test.tools               # small tool set (test)
└── profile/                     # archiso profile (airootfs overlay, boot menus, Calamares)
```

## Credits

Built on [Arch Linux](https://archlinux.org), [archiso](https://gitlab.archlinux.org/archlinux/archiso),
[Hyprland](https://hypr.land), [BlackArch](https://blackarch.org), [Calamares](https://calamares.io)
and the nwg-shell tools. Sstym Linux is an independent project, not affiliated with any of them.
Use security tools only on systems you own or are authorised to test.
