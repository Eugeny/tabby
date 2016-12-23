#!/bin/bash
set -e

cat > /Library/LaunchDaemons/com.elements.VolumesFix.plist << EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
<key>KeepAlive</key>
<false/>
<key>Label</key>
<string>com.elements.VolumesFix</string>
<key>ProgramArguments</key>
<array>
<string>/bin/bash</string>
<string>-c</string>
<string>sleep 3; chmod 777 /Volumes</string>
</array>
<key>RunAtLoad</key>
<true/>
<key>StandardErrorPath</key>
<string>/dev/null</string>
<key>StandardOutPath</key>
<string>/dev/null</string>
<key>UserName</key>
<string>root</string>
</dict>
</plist>
EOF

chmod 600 /Library/LaunchDaemons/com.elements.VolumesFix.plist

cat > /etc/nsmb.conf << EOF
[default]
minauth=none
streams=yes
soft=yes
notify_off=yes
port445=no_netbios
signing_required=false
EOF

launchctl load -w /Library/LaunchDaemons/com.elements.VolumesFix.plist
launchctl start com.elements.VolumesFix
