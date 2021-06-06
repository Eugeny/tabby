:: Copyright (c) 2012 Martin Ridgers
:: License: http://opensource.org/licenses/MIT

@echo off
set clink_profile_arg=
set clink_quiet_arg=

:: Mimic cmd.exe's behaviour when starting from the start menu.
if /i "%1"=="startmenu" (
    cd /d "%userprofile%"
    shift /1
)

:: Check for the --profile option.
if /i "%1"=="--profile" (
    set clink_profile_arg=--profile "%~2"
    shift /1
    shift /1
)

:: Check for the --quiet option.
if /i "%1"=="--quiet" (
    set clink_quiet_arg= --quiet
    shift /1
)

:: If the .bat is run without any arguments, then start a cmd.exe instance.
if "%1"=="" (
    call :launch
    goto :end
)

:: Pass through to appropriate loader.
if /i "%processor_architecture%"=="x86" (
        "%~dp0\clink_x86.exe" %*
) else if /i "%processor_architecture%"=="amd64" (
    if defined processor_architew6432 (
        "%~dp0\clink_x86.exe" %*
    ) else (
        "%~dp0\clink_x64.exe" %*
    )
)

:end
set clink_profile_arg=
set clink_quiet_arg=
goto :eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:launch
start "Clink" cmd.exe /s /k ""%~dpnx0" inject %clink_profile_arg%%clink_quiet_arg%"
exit /b 0
