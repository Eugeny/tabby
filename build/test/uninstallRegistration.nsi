; Compile with makensis, then run uninstallRegistration.ps1 in a disposable
; Windows test account. This inserts the production cleanup macro into a real
; NSIS uninstaller without packaging the rest of Tabby.
!include LogicLib.nsh
!include FileFunc.nsh
!define APP_EXECUTABLE_FILENAME "Tabby.exe"
Var updated
!define isUpdated '$updated == "true"'
!include "../installer.nsh"

Name "Tabby registry cleanup test"
OutFile "uninstallRegistration.exe"
RequestExecutionLevel user
SilentInstall silent
SilentUnInstall silent

Section
  CreateDirectory "$INSTDIR"
  WriteUninstaller "$INSTDIR\uninstall.exe"
SectionEnd

Function un.onInit
  SetRegView 64
  StrCpy $updated "false"
  ${GetParameters} $R1
  ClearErrors
  ${GetOptions} $R1 "--updated" $R2
  ${IfNot} ${Errors}
    StrCpy $updated "true"
  ${EndIf}
FunctionEnd

Section "Uninstall"
  StrCpy $R0 "preserved"
  !insertmacro customUnInstall
  ${If} $R0 != "preserved"
    SetErrorLevel 1
  ${EndIf}
SectionEnd
