# Windows wallpaper backdrop

Uses [`TryCreateBlurredWallpaperBackdropBrush`](https://learn.microsoft.com/en-us/uwp/api/windows.ui.composition.compositor.trycreateblurredwallpaperbackdropbrush)
behind Chromium. Requires a Windows 11 SDK (22000+) to build; `scripts/build-native.mjs`
copies the addon to `app/dist/wallpaper.node`. Other platforms do not build or load it.
