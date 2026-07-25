#!/bin/bash
set -euo pipefail

SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$SCRIPT_DIR/../app/frontend
HUGO_ROOT=$SCRIPT_DIR/../hugo
HUGO_STATIC_ROOT=$HUGO_ROOT/static
ASSETS=$HUGO_ROOT/assets/generated

set -x

cd $ROOT_DIR
npm ci --include=dev
npm run build

rm -rf $HUGO_STATIC_ROOT/webapp

cp -rf $ROOT_DIR/dist/webapp $HUGO_STATIC_ROOT/

html_file=$ROOT_DIR/dist/index.html
html=$(sed 's/<head>//' $html_file | sed 's/<\/head>//')

mkdir -p $ASSETS
echo $html > $ASSETS/index.gen.html




