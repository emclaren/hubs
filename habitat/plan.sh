pkg_name=hubs
pkg_origin=mozillareality
pkg_maintainer="Mozilla Mixed Reality <mixreality@mozilla.com>"

pkg_version="1.0.0"
pkg_license=('MPLv2')
pkg_description="Duck-powered web-based social VR."
pkg_upstream_url="https://hubs.mozilla.com/"
pkg_build_deps=(
    core/coreutils
    core/bash
    core/node10
    core/git
)

pkg_deps=(
    core/aws-cli # AWS cli used for run hook when uploading to S3
)

do_build() {
  ln -s "$(hab pkg path core/coreutils)/bin/env" /usr/bin/env

  # main client
  npm ci --verbose --no-progress
  npm rebuild node-sass # HACK sometimes node-sass build fails
  npm rebuild node-sass # HACK sometimes node-sass build fails
  npm rebuild node-sass # HACK sometimes node-sass build fails

  # We inject a random token into the build for the base assets path
  export BASE_ASSETS_PATH="$(echo "base_assets_path" | sha256sum | cut -d' ' -f1)/" # HACK need a trailing slash so webpack'ed semantics line up
  export BUILD_VERSION="${pkg_version}.$(echo $pkg_prefix | cut -d '/' -f 7)"

  npm run build

  # admin
  cd admin
  npm ci --verbose --no-progress
  npm rebuild node-sass # HACK sometimes node-sass build fails
  npm rebuild node-sass # HACK sometimes node-sass build fails
  npm rebuild node-sass # HACK sometimes node-sass build fails

  npm run build
  cp -R dist/* ../dist # it will get packaged with the rest of the stuff, below
  cd ..

  mkdir -p dist/pages
  mv dist/*.html dist/pages
  mv dist/hub.service.js dist/pages
  mv dist/manifest.webmanifest dist/pages
}

do_install() {
  cp -R dist "${pkg_prefix}"
}
