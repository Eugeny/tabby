#This script creates local release for macos

 ./scripts/install-deps.js
 ./scripts/build-native.js
 ./scripts/prepackage-plugins.js
 npm run build
 ./scripts/build-macos-arm64.js
