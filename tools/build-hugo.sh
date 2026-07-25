#!/usr/bin/env bash
set -euo pipefail

readonly SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
readonly PROJ_ROOT=$SCRIPT_DIR/../
readonly HUGO_ROOT=$PROJ_ROOT/hugo

readonly HUGO_VERSION=0.92.2

readonly WRK=$SCRIPT_DIR/build/hugo
mkdir -p $WRK
cd $WRK

HUGO_DOWNLOAD=$WRK/hugo.tar.gz

if [ ! -f "$HUGO_DOWNLOAD" ]; then
    curl -L "https://github.com/gohugoio/hugo/releases/download/v${HUGO_VERSION}/hugo_${HUGO_VERSION}_Linux-64bit.tar.gz" --output hugo.tar.gz
    tar -xvzf hugo.tar.gz
fi

export PATH="$PATH:$WRK/"

rm -rf $PROJ_ROOT/public

hugo --source $HUGO_ROOT --minify

FILE="$PROJ_ROOT/public/sitemap.xml"
SITEMAP="<url><!-- what could this be.. --><loc>https://abertschi.ch/pdf</loc></url>"
OLD="</urlset>"
NEW="${SITEMAP}${OLD}"
sed -i "s#${OLD}#${NEW}#g" $FILE

# copy acadmic website
echo "Copying academic content to public folder"
cp -a "$PROJ_ROOT/academic/." $PROJ_ROOT/public/

# minify
readonly MINIFY_VERSION=2.24.14
readonly MINIFY_WRK="$SCRIPT_DIR/build/minify"
readonly MINIFY_BIN="$MINIFY_WRK/minify"
readonly MINIFY_DOWNLOAD="$MINIFY_WRK/minify.tar.gz"

mkdir -p "$MINIFY_WRK"

if [ ! -x "$MINIFY_BIN" ]; then
    curl -fL \
        "https://github.com/tdewolff/minify/releases/download/v${MINIFY_VERSION}/minify_linux_amd64.tar.gz" \
        --output "$MINIFY_DOWNLOAD"

    tar -xzf "$MINIFY_DOWNLOAD" -C "$MINIFY_WRK"
    chmod +x "$MINIFY_BIN"
fi

TMP_INDEX=$(mktemp)
trap 'rm -f "$TMP_INDEX"' EXIT

"$MINIFY_BIN" \
    --output "$TMP_INDEX" \
    "$PROJ_ROOT/public/index.html"

mv "$TMP_INDEX" "$PROJ_ROOT/public/index.html"