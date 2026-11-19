-- Sstym Linux — Hyprland configuration (macOS-style desktop)
-- Hyprland 0.57+ uses Lua. Docs: https://wiki.hypr.land/configuring/

-------------------------
---- PERFORMANCE MODE ----
-------------------------
-- SSTYM_LOWFX=1 is set by sstym-session in VMs / software rendering:
--   heavy effects off so the desktop never lags.
-- Game mode (SUPER+G) creates $XDG_RUNTIME_DIR/sstym-gamemode and reloads:
--   every effect off, no gaps/rounding, maximum FPS.
local lowfx = os.getenv("SSTYM_LOWFX") == "1"
local gamemode = false
do
    local f = io.open((os.getenv("XDG_RUNTIME_DIR") or "/tmp") .. "/sstym-gamemode", "r")
    if f then gamemode = true; f:close() end
end
local fx = not (lowfx or gamemode)      -- fancy effects on?

------------------
---- MONITORS ----
------------------
hl.monitor({ output = "", mode = "preferred", position = "auto", scale = "auto" })

---------------------
---- MY PROGRAMS ----
---------------------
local terminal  = "kitty"
local fileMgr   = "thunar"
local browser   = "firefox"
local spotlight = "rofi -show drun"
local launchpad = "nwg-drawer"
local lock      = "hyprlock"

-------------------
---- AUTOSTART ----
-------------------
hl.on("hyprland.start", function()
    hl.exec_cmd("/usr/local/bin/sstym-autostart")
end)

-------------------------------
---- ENVIRONMENT VARIABLES ----
-------------------------------
hl.env("XCURSOR_SIZE", "24")
hl.env("HYPRCURSOR_SIZE", "24")
hl.env("XDG_CURRENT_DESKTOP", "Hyprland")
hl.env("XDG_SESSION_TYPE", "wayland")
hl.env("XDG_SESSION_DESKTOP", "Hyprland")
hl.env("QT_QPA_PLATFORM", "wayland;xcb")
hl.env("QT_QPA_PLATFORMTHEME", "qt6ct")
hl.env("GDK_BACKEND", "wayland,x11")
hl.env("MOZ_ENABLE_WAYLAND", "1")

-----------------------
---- LOOK AND FEEL ----
-----------------------
-- macOS-like: generous gaps, big rounding, frosted-glass blur, soft shadows
hl.config({
    general = {
        gaps_in  = gamemode and 0 or 6,
        gaps_out = gamemode and 0 or 14,
        border_size = gamemode and 1 or 2,
        col = {
            active_border   = { colors = { "rgba(ffffff66)", "rgba(00e5ff88)" }, angle = 45 },
            inactive_border = "rgba(ffffff14)",
        },
        resize_on_border = true,
        -- only windows with the `immediate` rule (games) may tear → lower input lag
        allow_tearing = true,
        layout = "dwindle",
    },

    decoration = {
        rounding = gamemode and 0 or 14,
        active_opacity   = 1.0,
        inactive_opacity = fx and 0.93 or 1.0,
        dim_inactive = fx,
        dim_strength = 0.06,
        shadow = {
            enabled = fx,
            range = 30,
            render_power = 3,
            color = "rgba(00000099)",
            color_inactive = "rgba(0000004d)",
        },
        blur = {
            enabled = fx,
            size = 6,
            passes = 2,
            new_optimizations = true,
            ignore_opacity = true,
            xray = false,
            vibrancy = 0.20,
            vibrancy_darkness = 0.1,
            popups = true,
        },
    },

    animations = { enabled = fx },

    dwindle = { preserve_split = true },
    master  = { new_status = "master" },

    misc = {
        force_default_wallpaper = 0,
        disable_hyprland_logo   = true,
        disable_splash_rendering = true,
        focus_on_activate = true,
    },

    cursor = {
        no_hardware_cursors = 2,   -- auto: software cursor only where needed (VMs)
    },

    input = {
        kb_layout  = "us,ru",
        kb_options = "grp:alt_shift_toggle",
        follow_mouse = 1,
        sensitivity = 0,
        touchpad = {
            natural_scroll = true,
            tap_to_click = true,
            disable_while_typing = true,
        },
    },
})

-- macOS-like easing
hl.curve("macease", { type = "bezier", points = { {0.22, 1.0}, {0.36, 1.0} } })
hl.curve("macpop",  { type = "bezier", points = { {0.34, 1.56}, {0.64, 1.0} } })
hl.curve("linear",  { type = "bezier", points = { {0, 0}, {1, 1} } })

hl.animation({ leaf = "global",     enabled = true, speed = 8,   bezier = "default" })
hl.animation({ leaf = "windowsIn",  enabled = true, speed = 4.5, bezier = "macpop",  style = "popin 70%" })
hl.animation({ leaf = "windowsOut", enabled = true, speed = 3.5, bezier = "macease", style = "popin 70%" })
hl.animation({ leaf = "windowsMove",enabled = true, speed = 4.5, bezier = "macease" })
hl.animation({ leaf = "border",     enabled = true, speed = 8,   bezier = "macease" })
hl.animation({ leaf = "fade",       enabled = true, speed = 5,   bezier = "macease" })
hl.animation({ leaf = "layers",     enabled = true, speed = 4,   bezier = "macease", style = "fade" })
hl.animation({ leaf = "workspaces", enabled = true, speed = 5,   bezier = "macease", style = "slide" })

-- 3-finger swipe between workspaces
hl.gesture({ fingers = 3, direction = "horizontal", action = "workspace" })

---------------------
---- KEYBINDINGS ----
---------------------
local mod = "SUPER"

hl.bind(mod .. " + Return",    hl.dsp.exec_cmd(terminal))
hl.bind(mod .. " + Q",         hl.dsp.window.close())
hl.bind(mod .. " + SHIFT + Q", hl.dsp.exit())
hl.bind(mod .. " + E",         hl.dsp.exec_cmd(fileMgr))
hl.bind(mod .. " + B",         hl.dsp.exec_cmd(browser))
hl.bind(mod .. " + V",         hl.dsp.window.float({ action = "toggle" }))
hl.bind(mod .. " + Space",     hl.dsp.exec_cmd(spotlight))     -- Spotlight
hl.bind(mod .. " + R",         hl.dsp.exec_cmd(spotlight))
hl.bind(mod .. " + A",         hl.dsp.exec_cmd(launchpad))     -- Launchpad
hl.bind(mod .. " + L",         hl.dsp.exec_cmd(lock))
hl.bind(mod .. " + F",         hl.dsp.window.fullscreen())
hl.bind(mod .. " + P",         hl.dsp.window.pseudo())
hl.bind(mod .. " + J",         hl.dsp.layout("togglesplit"))
hl.bind(mod .. " + I",         hl.dsp.exec_cmd("sstym-settings"))        -- Settings
hl.bind(mod .. " + G",         hl.dsp.exec_cmd("sstym-gamemode toggle")) -- Game mode
hl.bind(mod .. " + U",         hl.dsp.exec_cmd("sstym-update"))          -- Update all
hl.bind(mod .. " + N",         hl.dsp.exec_cmd("sstym-vpn"))             -- VPN / unblock
hl.bind(mod .. " + SHIFT + I", hl.dsp.exec_cmd("sstym-install"))
hl.bind(mod .. " + SHIFT + S", hl.dsp.exec_cmd('grim -g "$(slurp)" - | swappy -f -'))
hl.bind("Print",               hl.dsp.exec_cmd("grim - | wl-copy"))

-- focus
hl.bind(mod .. " + left",  hl.dsp.focus({ direction = "left" }))
hl.bind(mod .. " + right", hl.dsp.focus({ direction = "right" }))
hl.bind(mod .. " + up",    hl.dsp.focus({ direction = "up" }))
hl.bind(mod .. " + down",  hl.dsp.focus({ direction = "down" }))

-- workspaces 1-10
for i = 1, 10 do
    local key = i % 10
    hl.bind(mod .. " + " .. key,             hl.dsp.focus({ workspace = i }))
    hl.bind(mod .. " + SHIFT + " .. key,     hl.dsp.window.move({ workspace = i }))
end
hl.bind(mod .. " + mouse_down", hl.dsp.focus({ workspace = "e+1" }))
hl.bind(mod .. " + mouse_up",   hl.dsp.focus({ workspace = "e-1" }))

-- move / resize with mouse
hl.bind(mod .. " + mouse:272", hl.dsp.window.drag(),   { mouse = true })
hl.bind(mod .. " + mouse:273", hl.dsp.window.resize(), { mouse = true })

-- laptop media keys
hl.bind("XF86AudioRaiseVolume",  hl.dsp.exec_cmd("wpctl set-volume -l 1 @DEFAULT_AUDIO_SINK@ 5%+"), { locked = true, repeating = true })
hl.bind("XF86AudioLowerVolume",  hl.dsp.exec_cmd("wpctl set-volume @DEFAULT_AUDIO_SINK@ 5%-"),      { locked = true, repeating = true })
hl.bind("XF86AudioMute",         hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SINK@ toggle"),     { locked = true })
hl.bind("XF86AudioMicMute",      hl.dsp.exec_cmd("wpctl set-mute @DEFAULT_AUDIO_SOURCE@ toggle"),   { locked = true })
hl.bind("XF86MonBrightnessUp",   hl.dsp.exec_cmd("brightnessctl -e4 -n2 set 5%+"),                  { locked = true, repeating = true })
hl.bind("XF86MonBrightnessDown", hl.dsp.exec_cmd("brightnessctl -e4 -n2 set 5%-"),                  { locked = true, repeating = true })
hl.bind("XF86AudioNext",  hl.dsp.exec_cmd("playerctl next"),       { locked = true })
hl.bind("XF86AudioPlay",  hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioPause", hl.dsp.exec_cmd("playerctl play-pause"), { locked = true })
hl.bind("XF86AudioPrev",  hl.dsp.exec_cmd("playerctl previous"),   { locked = true })

--------------------------------
---- WINDOWS AND WORKSPACES ----
--------------------------------
hl.window_rule({ name = "no-maximize",   match = { class = ".*" }, suppress_event = "maximize" })
-- frosted-glass terminal & file manager
hl.window_rule({ name = "glass-kitty",   match = { class = "^(kitty)$" },  opacity = "0.90 0.84" })
hl.window_rule({ name = "glass-thunar",  match = { class = "^(thunar)$" }, opacity = "0.96 0.90" })
-- dialogs & tools float centered
hl.window_rule({ name = "float-calamares", match = { class = "^(org.kde.calamares|calamares)$" }, float = true, center = true })
hl.window_rule({ name = "float-pavu",    match = { class = "^(org.pulseaudio.pavucontrol|pavucontrol)$" }, float = true })
hl.window_rule({ name = "float-nm",      match = { class = "^(nm-connection-editor)$" }, float = true })
hl.window_rule({ name = "float-blueman", match = { class = "^(blueman-manager)$" }, float = true })
hl.window_rule({ name = "sstym-term",    match = { class = "^(sstym-term)$" }, float = true, size = "900 560", center = true })
-- media and games: always fully opaque
hl.window_rule({ name = "opaque-media",  match = { class = "^(firefox|vlc|mpv|com.obsproject.Studio|chromium|tor browser|Tor Browser)$" }, opacity = "1.0 override 1.0 override" })
-- gaming: fully opaque + allowed to tear for the lowest latency
hl.window_rule({ name = "games-steam",   match = { class = "^(steam_app_.*)$" }, immediate = true, opacity = "1.0 override 1.0 override" })
hl.window_rule({ name = "games-scope",   match = { class = "^(gamescope)$" },     immediate = true, opacity = "1.0 override 1.0 override" })
hl.window_rule({ name = "steam-friends", match = { class = "^(steam)$", title = "^(Friends List|Steam Settings)$" }, float = true })
-- XWayland drag fix (from upstream defaults)
hl.window_rule({
    name  = "fix-xwayland-drags",
    match = { class = "^$", title = "^$", xwayland = true, float = true, fullscreen = false, pin = false },
    no_focus = true,
})

-- frosted menu bar, dock and Launchpad
hl.layer_rule({ name = "blur-waybar",  match = { namespace = "^(waybar)$" },       blur = true, ignore_alpha = 0.2 })
hl.layer_rule({ name = "blur-dock",    match = { namespace = "^(nwg-dock)$" },     blur = true, ignore_alpha = 0.2 })
hl.layer_rule({ name = "blur-drawer",  match = { namespace = "^(nwg-drawer)$" },   blur = true })
hl.layer_rule({ name = "blur-rofi",    match = { namespace = "^(rofi)$" },         blur = true, ignore_alpha = 0.2 })
hl.layer_rule({ name = "blur-notify",  match = { namespace = "^(notifications)$" }, blur = true, ignore_alpha = 0.2 })
