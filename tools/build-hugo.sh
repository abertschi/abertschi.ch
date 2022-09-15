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
