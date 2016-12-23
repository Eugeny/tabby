[![build status](http://ci.elements.tv/root/elements-benchmark/badges/master/build.svg)](http://ci.elements.tv/root/elements-benchmark/commits/master)

This repository hosts the ELEMENTS Benchmark

Build requirements:

  * Windows: NodeJS, Windows SDK, WiX on $PATH, Cygwin with ``make`` on $PATH
  * Mac: NodeJS, Xcode
  * Linux: NodeJS
  
  
Preparing:
  
  * ``npm install``
  * ``typings install``
  * ``webpack``
  
Building:
    
  * Windows: ``make package-windows`` → ``dist/Elements-Electron.exe``
  * Mac: ``make package-mac`` → ``dist/Elements-Electron.pkg``
  * Linux: ``make package-linux`` → ``dist/Elements-Electron.AppImage``
