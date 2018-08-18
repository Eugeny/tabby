#!/bin/bash
set -ev

yarn install
scripts/install-deps.js

scripts/build-native.js
yarn run build
scripts/prepackage-plugins.js
scripts/build-$BUILD_FOR.js

if [ "${STAGE}" = "deploy" ]; then
  docker run -v $(pwd):$(pwd) -t snapcore:snapcraft sh -c "apt update -qq && cd $(pwd) && snapcraft && snapcraft push dist/*.snap --release edge"
fi
