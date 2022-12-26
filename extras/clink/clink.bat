:: Copyright (c) 2012 Martin Ridgers
:: License: http://opensource.org/licenses/MIT

@echo off
setlocal enableextensions
set clink_profile_arg=
set clink_quiet_arg=

:: Mimic cmd.exe's behaviour when starting from the start menu.
if /i "%1"=="startmenu" (
    cd /d "%userprofile%"
    shift
)

:: Check for the --profile option.
if /i "%1"=="--profile" (
    set clink_profile_arg=--profile "%~2"
    shift
    shift
)

:: Check for the --quiet option.
if /i "%1"=="--quiet" (
    set clink_quiet_arg= --quiet
    shift
)

:: If the .bat is run without any arguments, then start a cmd.exe instance.
if "%1"=="" (
    call :launch
    goto :end
)

:: Test for autorun.
if defined CLINK_NOAUTORUN if /i "%1"=="inject" if /i "%2"=="--autorun" goto :end

:: Endlocal before inject tags the prompt.
endlocal

:: Pass through to appropriate loader.
if /i "%processor_architecture%"=="x86" (
        "%~dp0\clink_x86.exe" %*
) else if /i "%processor_architecture%"=="arm64" (
        "%~dp0\clink_arm64.exe" %*
) else if /i "%processor_architecture%"=="amd64" (
    if defined processor_architew6432 (
        "%~dp0\clink_x86.exe" %*
    ) else (
        "%~dp0\clink_x64.exe" %*
    )
)

:end
goto :eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:launch
setlocal
set WT_PROFILE_ID=
set WT_SESSION=
start "Clink" cmd.exe /s /k ""%~dpnx0" inject %clink_profile_arg%%clink_quiet_arg%"
endlocal
exit /b 0
