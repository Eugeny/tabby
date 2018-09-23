:: Copyright (c) 2012 Martin Ridgers
::
:: Permission is hereby granted, free of charge, to any person obtaining a copy
:: of this software and associated documentation files (the "Software"), to deal
:: in the Software without restriction, including without limitation the rights
:: to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
:: copies of the Software, and to permit persons to whom the Software is
:: furnished to do so, subject to the following conditions:
::
:: The above copyright notice and this permission notice shall be included in
:: all copies or substantial portions of the Software.
::
:: THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
:: IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
:: FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
:: AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
:: LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
:: OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
:: SOFTWARE.

@echo off

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
goto :eof

::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::::
:launch
start "Clink" cmd.exe /s /k ""%~dpnx0" inject %clink_profile_arg%"
exit /b 0
