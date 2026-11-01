!macro customInit
  nsExec::Exec '"$LOCALAPPDATA\tabby\Update.exe" --uninstall -s'
!macroend

!macro removeOwnedTabbyRegistration KEY COMMAND_KEY ARGUMENTS
  ReadRegStr $R0 HKCU "Software\Classes\${KEY}\${COMMAND_KEY}" ""
  ${If} $R0 == '$INSTDIR\${APP_EXECUTABLE_FILENAME} ${ARGUMENTS}'
  ${OrIf} $R0 == '"$INSTDIR\${APP_EXECUTABLE_FILENAME}" ${ARGUMENTS}'
    DeleteRegKey HKCU "Software\Classes\${KEY}"
  ${EndIf}
!macroend

!macro customUnInstall
  ; Keep handlers during upgrades, which may replace the executable at the
  ; same path rather than remove the installation.
  ${IfNot} ${isUpdated}
    Push $R0
    !insertmacro removeOwnedTabbyRegistration "*\shell\Tabby" "command" 'paste "%V"'
    !insertmacro removeOwnedTabbyRegistration "Directory\shell\Tabby" "command" 'open "%V"'
    !insertmacro removeOwnedTabbyRegistration "Directory\Background\shell\Tabby" "command" 'open "%V"'
    !insertmacro removeOwnedTabbyRegistration "tabby" "shell\open\command" '"%1"'
    Pop $R0
  ${EndIf}
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
