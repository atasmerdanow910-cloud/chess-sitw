/* Sstym Linux — Calamares installer slideshow */
import QtQuick 2.0
import calamares.slideshow 1.0

Presentation {
    id: presentation

    function onActivate() { presentation.startAutoAdvance(); }
    function onLeave() { presentation.stopAutoAdvance(); }

    Timer {
        id: advanceTimer
        interval: 20000
        running: false
        repeat: true
        onTriggered: presentation.goToNextSlide()
    }
    function startAutoAdvance() { advanceTimer.running = true; }
    function stopAutoAdvance() { advanceTimer.running = false; }

    Slide {
        Rectangle {
            anchors.fill: parent
            color: "#0a0e18"
            Column {
                anchors.centerIn: parent
                spacing: 18
                Image { source: "logo.png"; width: 160; height: 160
                        anchors.horizontalCenter: parent.horizontalCenter
                        fillMode: Image.PreserveAspectFit }
                Text { text: "Welcome to Sstym Linux"; color: "#e6ecff"
                       font.pixelSize: 30; font.bold: true
                       anchors.horizontalCenter: parent.horizontalCenter }
                Text { text: "A Hyprland pentest distro · hack · learn · build"
                       color: "#00e5ff"; font.pixelSize: 16
                       anchors.horizontalCenter: parent.horizontalCenter }
            }
        }
    }

    Slide {
        Rectangle {
            anchors.fill: parent; color: "#0a0e18"
            Column {
                anchors.centerIn: parent; spacing: 14; width: parent.width * 0.7
                Text { text: "500+ security tools out of the box"
                       color: "#e6ecff"; font.pixelSize: 24; font.bold: true
                       anchors.horizontalCenter: parent.horizontalCenter }
                Text { text: "Recon · scanning · web · wireless · forensics · reversing — powered by the BlackArch repository and ready the moment you boot."
                       color: "#c6ccdb"; font.pixelSize: 15; wrapMode: Text.WordWrap
                       horizontalAlignment: Text.AlignHCenter; width: parent.width }
            }
        }
    }

    Slide {
        Rectangle {
            anchors.fill: parent; color: "#0a0e18"
            Column {
                anchors.centerIn: parent; spacing: 14; width: parent.width * 0.7
                Text { text: "A modern Wayland desktop"
                       color: "#e6ecff"; font.pixelSize: 24; font.bold: true
                       anchors.horizontalCenter: parent.horizontalCenter }
                Text { text: "Hyprland compositor, Waybar, Rofi and a neon theme. Fresh rolling-release packages and the yay / paru AUR helpers included."
                       color: "#c6ccdb"; font.pixelSize: 15; wrapMode: Text.WordWrap
                       horizontalAlignment: Text.AlignHCenter; width: parent.width }
            }
        }
    }
}
