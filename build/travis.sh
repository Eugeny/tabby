#!/bin/bash
set -e
cd app
yarn
cd ..
rm app/node_modules/.yarn-integrity
yarn
scripts/build-native.js
yarn run build:typings
yarn run build
scripts/prepackage-plugins.js
scripts/build-macos.js
