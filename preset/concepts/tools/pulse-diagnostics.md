# Pulse Diagnostics

A read-only Windows 10/11 (x64) diagnostics app that explains the Windows Event Log in plain language: crashes, blue screens, unexpected restarts, failed services, driver and hardware errors, plus live system health. Fully offline. Homepage: https://github.com/Regncreative/PulseDiagnostics. License: MIT.

It's a desktop app with a background service (`PulseService`), not a CLI, and it has no agent interface (its MCP bridge was removed in 1.3). Agents use it through the reports it exports.

## Use when

- on Windows, the user asks why the PC crashed, restarted, froze or showed a blue screen
- the user wants a crash history or a health report for a Windows machine, or to read an `.evtx` exported from another PC in plain language

Not on Linux, macOS or WSL guests, and not for application logs.

## Install

Check: `Get-Service PulseService` in PowerShell (installed if it exists; `Status` should be `Running`).

Installing registers a Windows service, so it always needs administrator approval (a UAC prompt). Ask for that separately, and let the user run the installer themselves.

1. Microsoft Store: https://apps.microsoft.com/detail/9PNDTLNTJ82T (`winget install --id 9PNDTLNTJ82T --source msstore`). Updates come through the Store.
2. GitHub release: `PulseDiagnostics-Setup-<version>-windows-x64.exe` from https://github.com/Regncreative/PulseDiagnostics/releases/latest. Check it against the release's `SHA256SUMS.txt` with `Get-FileHash <file> -Algorithm SHA256` before the user runs it. Releases aren't code-signed yet, so SmartScreen may warn.

## Run

1. Ask the user to open Pulse Diagnostics and export the report the task needs (Reports: Health, Timeline, crash history, Diagnostics or inventory) as **JSON**, or CSV for a Timeline view.
2. Exports land in `Downloads\Pulse` (older versions: `Documents\Pulse`). Read the newest matching file there.
3. For an `.evtx` from another PC, the user opens it in Pulse's Timeline and exports the view the same way.

Without Pulse, or when the user doesn't want to install it, read the Event Log directly with PowerShell instead, for example `Get-WinEvent -FilterHashtable @{LogName='System'; Level=1,2; StartTime=(Get-Date).AddDays(-7)}`.

## Limits

- Windows only, x64, and the service needs admin rights to install.
- Never stop, restart or uninstall `PulseService`, or change Pulse's settings, without asking.
- Exports mask user and computer names, paths, SIDs, IP and MAC addresses and serial numbers by default. Don't ask the user to turn the masking off unless the task needs it, and don't commit exports.
