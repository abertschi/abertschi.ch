#!/bin/bash
SCRIPT_DIR=$( cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
ROOT_DIR=$SCRIPT_DIR/../app/frontend
HUGO_ROOT=$SCRIPT_DIR/../hugo
HUGO_STATIC_ROOT=$HUGO_ROOT/static

set -x

cd $ROOT_DIR
npm run build

rm -rf $HUGO_STATIC_ROOT/webapp

cp -rf $ROOT_DIR/dist/webapp $HUGO_STATIC_ROOT/

html_file=$ROOT_DIR/dist/index.html
html=$(sed 's/<head>//' $html_file | sed 's/<\/head>//')
echo $html > $HUGO_ROOT/layouts/index.gen.html




