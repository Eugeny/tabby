param([Parameter(Mandatory=$true)][string]$Fixture)
$ErrorActionPreference = 'Stop'
$root = Join-Path $env:TEMP ('tabby uninstall test ' + [Guid]::NewGuid())
New-Item -ItemType Directory -Path $root | Out-Null
$registrations = @(
    @{ Key = '*\shell\Tabby'; Command = 'command'; Arguments = 'paste "%V"' },
    @{ Key = 'Directory\shell\Tabby'; Command = 'command'; Arguments = 'open "%V"' },
    @{ Key = 'Directory\Background\shell\Tabby'; Command = 'command'; Arguments = 'open "%V"' },
    @{ Key = 'tabby'; Command = 'shell\open\command'; Arguments = '"%1"' }
)
$saved = @()
$results = @()
$registryChanged = $false
try {
    for ($i = 0; $i -lt $registrations.Count; $i++) {
        $key = 'HKCU\Software\Classes\' + $registrations[$i].Key
        $exists = Test-Path -LiteralPath ('Registry::HKEY_CURRENT_USER\Software\Classes\' + $registrations[$i].Key)
        $backup = "$root\$i.reg"
        if ($exists) {
            & reg.exe export $key $backup /y | Out-Null
            if ($LASTEXITCODE -or -not (Test-Path -LiteralPath $backup) -or (Get-Item -LiteralPath $backup).Length -eq 0) {
                throw "Registry export failed: $key"
            }
        }
        $saved += @{ Key = $key; Exists = $exists; File = $backup }
    }
    foreach ($case in @('owned-unquoted', 'owned-quoted', 'other-installation', 'different-command', 'upgrade', 'missing')) {
        $install = Join-Path $root $case
        $process = Start-Process $Fixture -ArgumentList '/S',"/D=$install" -Wait -PassThru
        if ($process.ExitCode) { throw "Fixture install failed: $case" }
        foreach ($registration in $registrations) {
            $key = 'Software\Classes\' + $registration.Key
            $registryChanged = $true
            [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($key, $false)
            if ($case -eq 'missing') { continue }
            $exe = "$install\Tabby.exe"
            if ($case -eq 'other-installation') { $exe = "$root\other\Tabby.exe" }
            $arguments = $registration.Arguments
            if ($case -eq 'different-command') { $arguments = '--another-command' }
            if ($case -eq 'owned-unquoted') { $command = $exe + ' ' + $arguments }
            else { $command = '"' + $exe + '" ' + $arguments }
            $entry = [Microsoft.Win32.Registry]::CurrentUser.CreateSubKey($key + '\' + $registration.Command)
            $entry.SetValue('', $command)
            $entry.Close()
        }
        $arguments = @('/S',"_?=$install")
        if ($case -eq 'upgrade') { $arguments = @('/S','--updated',"_?=$install") }
        $process = Start-Process "$install\uninstall.exe" -ArgumentList $arguments -Wait -PassThru
        if ($process.ExitCode) { throw "Fixture uninstall failed: $case" }
        $expected = $case -in @('other-installation', 'different-command', 'upgrade')
        $actual = @($registrations | ForEach-Object {
            $key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Software\Classes\' + $_.Key)
            $exists = $null -ne $key
            if ($key) { $key.Close() }
            $exists
        })
        if (@($actual | Where-Object { $_ -ne $expected }).Count) { throw "Unexpected registry state for ${case}: $actual" }
        $results += @{ Case = $case; RegistrationExists = $actual; Passed = $true }
    }
    $results | ConvertTo-Json -Depth 4
} finally {
    $restoreErrors = @()
    if ($registryChanged) {
        foreach ($entry in $saved) {
            try {
                [Microsoft.Win32.Registry]::CurrentUser.DeleteSubKeyTree($entry.Key.Substring(5), $false)
                if ($entry.Exists) {
                    & reg.exe import $entry.File | Out-Null
                    if ($LASTEXITCODE) { throw "Registry import failed: $($entry.Key)" }
                }
            } catch {
                $restoreErrors += $_.Exception.Message
            }
        }
    }
    if ($restoreErrors.Count) {
        throw "Registry restoration failed. Backups retained at ${root}: $($restoreErrors -join '; ')"
    }
    Remove-Item -LiteralPath $root -Recurse -Force
}
