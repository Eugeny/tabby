#!/bin/bash
set -e
yarn
rm app/node_modules/.yarn-integrity
cd app
yarn
cd ..
scripts/build-native.js
yarn run build:typings
yarn run build
scripts/prepackage-plugins.js
scripts/build-macos.js
