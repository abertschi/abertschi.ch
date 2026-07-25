PWD=$$(pwd)
SCRIPT_DIR=$(shell cd -- "$( dirname -- "${BASH_SOURCE[0]}" )" &> /dev/null && pwd )
PROJ_ROOT=$(SCRIPT_DIR)
TOOLS_DIR=$(PROJ_ROOT)/tools

build: webapp/build hugo/build

hugo/build: webapp/build
	echo "===> building hugo assets"
	sh -c "'$(TOOLS_DIR)/build-hugo.sh'"

hugo/develop: webapp/build
	hugo --source "$(PROJ_ROOT)/hugo" server --disableFastRender &


webapp/setup:
	echo "===> setup webapp"
	npm --prefix "$(PROJ_ROOT)/app/frontend" install

webapp/build:
	echo "===> building webapp"
	sh -c "'$(TOOLS_DIR)/build-webapp.sh'"

webapp/develop:
	npm --prefix "$(PROJ_ROOT)/app/frontend" run serve &


academic/develop:
	kill -9 "$(lsof -ti TCP:8000)" || true
	python -m http.server --directory "$(PROJ_ROOT)/academic" 8000 &


serve-build: build
	kill -9 "$(lsof -ti TCP:8080)" || true
	python -m http.server --directory "$(PROJ_ROOT)/public" 8080 &

