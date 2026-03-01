!macro customInit
  nsExec::Exec '"$LOCALAPPDATA\tabby\Update.exe" --uninstall -s'
!macroend

!macro customInstall
  ; Install Visual C++ Redistributable if vcruntime140.dll is missing.
  ; Native modules (node-pty) require it; without it Tabby shows the
  ; splash screen but the terminal never loads. See #10734, #10782.
  IfFileExists "$SYSDIR\vcruntime140.dll" vcredist_installed
    DetailPrint "Installing Visual C++ Redistributable..."
    File /oname=$PLUGINSDIR\vc_redist.exe "${BUILD_RESOURCES_DIR}\vc_redist.exe"
    ExecWait '"$PLUGINSDIR\vc_redist.exe" /install /quiet /norestart' $1
    DetailPrint "Visual C++ Redistributable exit code: $1"
  vcredist_installed:
!macroend
