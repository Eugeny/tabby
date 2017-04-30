MAC_WS="/tmp/elements-build"
MAC_OUTPUT="./dist/Elements-Electron.pkg"
FULL_VERSION=$(shell python -c 'import subprocess; v = subprocess.check_output("git describe --tags --long", shell=True).strip()[1:]; print(v.split("-0-g")[0])')
SHORT_VERSION=$(shell python -c 'import subprocess; v = subprocess.check_output("git describe --tags --long", shell=True).strip()[1:].split("-")[0]; print(v)')

builtin_plugins = terminus-core terminus-settings terminus-terminal

all: run

run:
	DEV=1 TERMINUS_PLUGINS=$$PWD ./node_modules/.bin/electron ./app --debug

lint:
	tslint -c tslint.json app/src/*.ts app/src/**/*.ts

build:
	DEV=1 ./node_modules/.bin/webpack --progress --display-modules

watch:
	DEV=1 ./node_modules/.bin/webpack --progress -w


build-windows:
	echo :: Building application
	./node_modules/.bin/build --dir --win --em.version=$(FULL_VERSION)
	cp ./app/assets/img/disk.ico dist/win-unpacked/

build-mac:
	echo :: Building application
	./node_modules/.bin/build --dir --mac --em.version=$(FULL_VERSION)

build-linux:
	echo :: Building application
	mkdir builtin-plugins || true
	echo '{}' > builtin-plugins/package.json

	cd builtin-plugins && for dir in $(builtin_plugins) ; do \
		npm install ../$$dir; \
	done

	cd builtin-plugins && npm dedupe
	./node_modules/.bin/electron-rebuild -f -m builtin-plugins -w node-pty,font-manager

	./node_modules/.bin/build --linux --em.version=$(FULL_VERSION)
	rm -r builtin-plugins || true

package-windows-app:
	echo :: Building app MSI $(SHORT_VERSION)
	heat dir dist/win-unpacked/ -cg Files -gg -scom -sreg -sfrag -srd -dr INSTALLDIR -var var.SourceDir -out build/files.wxs
	candle -dSourceDir=dist\\win-unpacked -dProductVersion=$(SHORT_VERSION) -arch x64 -o dist/ build/files.wxs build/windows/elements.wxs
	light -o dist/elements-app.msi dist/files.wixobj dist/elements.wixobj
	build/windows/signtool.exe sign /f "build\\certificates\\Code Signing.p12" dist/elements-app.msi

package-windows-bundle:
	echo :: Building installer
	candle -dVersion=$(SHORT_VERSION) -ext WixBalExtension -arch x64 -o dist/build.wixobj build/windows/build.wxs
	light -ext WixBalExtension -o bundle.exe dist/build.wixobj
	insignia -ib bundle.exe -o engine.exe
	build/windows/signtool.exe sign /f "build\\certificates\\Code Signing.p12" engine.exe
	insignia -ab engine.exe bundle.exe -o dist/Elements-Electron.exe
	build/windows/signtool.exe sign /f "build\\certificates\\Code Signing.p12" dist/Elements-Electron.exe
	rm engine.exe bundle.exe || true

package-windows: build-windows package-windows-app package-windows-bundle

package-mac: driver-mac build-mac
	rm -rf $(MAC_WS) || true
	mkdir -p $(MAC_WS)
	mkdir -p $(MAC_WS)/app/Applications
	mkdir -p $(MAC_WS)/driver/Library/Extensions
	cp -Rv dist/mac/ELEMENTS.app $(MAC_WS)/app/Applications/
	cp -Rv dist/ElementsDriver.kext $(MAC_WS)/driver/Library/Extensions
	pkgbuild --root $(MAC_WS)/app \
            --component-plist ./build/mac/Elements.component.plist \
			--version $(SHORT_VERSION) \
            --scripts ./build/mac \
            $(MAC_WS)/Elements.pkg
	pkgbuild --root $(MAC_WS)/driver \
            --component-plist ./build/mac/ElementsDriver.component.plist \
            --scripts ./build/mac \
            $(MAC_WS)/ElementsDriver.pkg
	cp ./build/mac/AFPTuner.pkg $(MAC_WS)/

	productbuild --distribution "./build/mac/Distribution.xml"  \
           --package-path $(MAC_WS) \
		   --version $(SHORT_VERSION) \
           --sign "Developer ID Installer: Syslink GmbH (V4JSMC46SY)" \
           $(MAC_OUTPUT)

.PHONY: run native build coverage
