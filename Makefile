MAC_WS="/tmp/elements-build"
MAC_OUTPUT="./dist/Elements-Electron.pkg"
FULL_VERSION=$(shell python -c 'import subprocess; v = subprocess.check_output("git describe --tags --long", shell=True).strip()[1:]; print(v.split("-0-g")[0])')
SHORT_VERSION=$(shell python -c 'import subprocess; v = subprocess.check_output("git describe --tags --long", shell=True).strip()[1:].split("-")[0]; print(v)')

all: run

run:
	DEV=1 TERMINUS_PLUGINS=`realpath .` ./node_modules/.bin/electron ./app --debug

lint:
	tslint -c tslint.json app/src/*.ts app/src/**/*.ts

build:
	DEV=1 ./node_modules/.bin/webpack --progress --display-modules

watch:
	DEV=1 ./node_modules/.bin/webpack --progress -w


build-native:
	./node_modules/.bin/electron-rebuild -f -w terminus-terminal/node_modules/node-pty -m terminus-terminal
	./node_modules/.bin/electron-rebuild -f -w terminus-terminal/node_modules/font-manager -m terminus-terminal

build-native-windows:
	echo :: Building native extensions
	rm -r ./native/windows/build || true
	cd native/windows && node-gyp rebuild --target=1.4.12 --arch=x64 --dist-url=https://atom.io/download/atom-shell
	mkdir native/build || true
	cp ./native/windows/build/Release/elements-native.node ./app/

build-native-mac:
	echo :: Building native extensions
	rm -r ./native/mac/build || true
	cd native/mac && node-gyp rebuild --target=1.4.12 --arch=x64 --dist-url=https://atom.io/download/atom-shell
	mkdir native/build || true
	cp ./native/mac/build/Release/elements-native.node ./app/

build-native-linux:
	echo :: Building native extensions
	rm -r ./native/linux/build || true
	cd native/linux && node-gyp rebuild --target=1.4.12 --arch=x64 --dist-url=https://atom.io/download/atom-shell
	mkdir native/build || true
	cp ./native/linux/build/Release/elements-native.node ./app/

build-windows: build-native-windows
	echo :: Building application
	./node_modules/.bin/build --dir --win --em.version=$(FULL_VERSION)
	cp ./app/assets/img/disk.ico dist/win-unpacked/

build-mac: build-native-mac
	echo :: Building application
	./node_modules/.bin/build --dir --mac --em.version=$(FULL_VERSION)

build-linux: build-native-linux
	echo :: Building application
	./node_modules/.bin/build --linux --em.version=$(FULL_VERSION)

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
