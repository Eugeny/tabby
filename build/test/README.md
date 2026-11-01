This fixture runs the production `customUnInstall` macro in a real NSIS
uninstaller without packaging all of Tabby.

Compile from this directory:

```sh
makensis uninstallRegistration.nsi
```

Run in a disposable Windows test account:

```powershell
powershell.exe -NoProfile -ExecutionPolicy Bypass -File .\uninstallRegistration.ps1 -Fixture .\uninstallRegistration.exe
```

The runner exports any existing Tabby registrations and restores them in
`finally`. It tests quoted and unquoted commands with spaces in the installation
path, missing keys, another installation's registrations, customized commands,
and the upgrade flag. It also checks that the macro preserves `$R0`.
