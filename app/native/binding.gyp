{
  "targets": [{
    "target_name": "wallpaper",
    "sources": ["wallpaper.cpp"],
    "msvs_settings": {
      "VCCLCompilerTool": {
        "ExceptionHandling": 1
      }
    },
    "libraries": ["windowsapp.lib", "CoreMessaging.lib"]
  }]
}
