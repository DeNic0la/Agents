# Smoke test for install.ps1 and the agents command on native Windows. It works on a
# copy of this repo and temporary homes, so your own setup is never touched. Run it
# in both editions; each runs the installer with itself:
#
#   powershell -ExecutionPolicy Bypass -File tests\smoke.ps1
#   pwsh -File tests\smoke.ps1
#
# The install is tested twice: with symlinks, and with the copies used when
# symlinks aren't allowed (forced with AGENTS_NO_SYMLINKS).
[CmdletBinding()]
param()

$ErrorActionPreference = 'Stop'
$Repo = Split-Path $PSScriptRoot
$Tmp = Join-Path ([System.IO.Path]::GetTempPath()) ('agents-smoke-' + [System.IO.Path]::GetRandomFileName())
$PsExe = (Get-Process -Id $PID).Path
$Failures = 0
$Out = @()

function Test-That([string]$What, [bool]$Ok) {
    if ($Ok) { Write-Host "pass    $What"; return }
    Write-Host "FAIL    $What" -ForegroundColor Red
    $script:Failures++
    $script:Out | Select-Object -Last 5 | ForEach-Object { Write-Host "        $_" }
}

# Runs a native command, leaving its output in $Out; $true on exit code 0. 'Continue'
# because Windows PowerShell 5.1 turns stderr into an exception under 'Stop'.
function Invoke-Native([string]$Exe, [string[]]$Arguments) {
    $ErrorActionPreference = 'Continue'
    $script:Out = @(& $Exe @Arguments 2>&1 | ForEach-Object { "$_" })
    $LASTEXITCODE -eq 0
}

function Invoke-Install([string]$RepoCopy, [string]$HomeDir, [string[]]$Extra = @()) {
    Invoke-Native $PsExe (@('-NoProfile', '-ExecutionPolicy', 'Bypass', '-File', "$RepoCopy\install.ps1", '-HomeDir', $HomeDir) + $Extra)
}

function Test-NoBackup { -not ($Out -match '^backup') }
function Test-AllOk { -not ($Out -notmatch '^(ok |Done )') }
function Test-Gone([string]$Path) { -not (Get-Item -LiteralPath $Path -Force -ErrorAction SilentlyContinue) }

# A copy without .git, so the test can change the preset.
function New-RepoCopy([string]$To) {
    New-Item -ItemType Directory -Path $To | Out-Null
    Get-ChildItem -LiteralPath $Repo -Force | Where-Object Name -ne '.git' |
        Copy-Item -Destination $To -Recurse -Force
}

function Get-Snapshot([string]$Dir) {
    (Get-ChildItem -LiteralPath $Dir -Recurse -File -Force | Where-Object FullName -notlike "$Dir\.git\*" |
        Sort-Object FullName | ForEach-Object { $_.FullName + ':' + (Get-FileHash -LiteralPath $_.FullName).Hash }) -join '|'
}

function Test-Project([string]$RepoCopy, [string]$Bin) {
    Write-Host '== project (agents through the Git Bash shim)'
    $agentsCmd = Join-Path $Bin 'agents.cmd'
    $skills = Get-ChildItem -LiteralPath "$RepoCopy\preset\skills" -Directory
    $tailored = $skills | Where-Object { Test-Path -LiteralPath "$($_.FullName)\GENERATE.md" } | Select-Object -First 1 -ExpandProperty Name
    $global = $skills | Where-Object { -not (Test-Path -LiteralPath "$($_.FullName)\GENERATE.md") } | Select-Object -First 1 -ExpandProperty Name
    $agent = Get-ChildItem -LiteralPath "$RepoCopy\preset\agents" -Filter *.md | Select-Object -First 1 -ExpandProperty BaseName
    $proj = Join-Path $Tmp 'project'
    New-Item -ItemType Directory -Path $proj | Out-Null
    Push-Location $proj
    try {
        Invoke-Native git @('init', '-q') | Out-Null
        # The copy's preset was changed above, so only that check finishes is tested here.
        Invoke-Native $agentsCmd @('check') | Out-Null
        Test-That 'agents check runs' ([bool]($Out -match '^(ok - |\d+ problem)'))
        $items = @("skills/$tailored", "agents/$agent")
        $files = @('.agents\preset.txt', ".agents\recipes\skills\$tailored.md", ".claude\agents\$agent.md",
                   ".github\agents\$agent.agent.md", ".codex\agents\$agent.toml")
        if ($global) {
            $items += "skills/$global"
            $files += ".agents\skills\$global\SKILL.md", ".claude\skills\$global\SKILL.md"
        }
        Test-That 'add succeeds' (Invoke-Native $agentsCmd (@('add') + $items))
        foreach ($f in $files) { Test-That "add creates $f" (Test-Path -LiteralPath "$proj\$f") }
        $agentsMd = [System.IO.File]::ReadAllText("$proj\AGENTS.md")
        Test-That 'AGENTS.md has the managed block' ($agentsMd.Contains('<!-- agents-preset:start -->'))
        Test-That 'AGENTS.md has LF line endings' (-not $agentsMd.Contains("`r`n"))
        Test-That 'CLAUDE.md imports AGENTS.md' ([System.IO.File]::ReadAllText("$proj\CLAUDE.md").Contains('@AGENTS.md'))
        $before = Get-Snapshot $proj
        Test-That 'remove --dry-run succeeds' (Invoke-Native $agentsCmd @('remove', '--dry-run', "agents/$agent"))
        Test-That 'remove --dry-run changes nothing' ((Get-Snapshot $proj) -eq $before)
        Invoke-Native git @('add', '-A') | Out-Null
        Invoke-Native git @('-c', 'user.name=smoke', '-c', 'user.email=smoke@example.invalid', '-c', 'core.autocrlf=false', 'commit', '-qm', 'setup') | Out-Null
        Test-That 'sync succeeds' (Invoke-Native $agentsCmd @('sync'))
        Invoke-Native git @('status', '--porcelain') | Out-Null
        Test-That 'sync changes nothing' ($Out.Count -eq 0)
        $selected = [System.IO.File]::ReadAllLines("$proj\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }
        Test-That 'removing every item succeeds' (Invoke-Native $agentsCmd (@('remove') + $selected))
        $left = @(Get-ChildItem -LiteralPath $proj -Force | Select-Object -ExpandProperty Name)
        Test-That 'removing every item leaves the project as it was' ($left.Count -eq 1 -and $left[0] -eq '.git')
    } finally {
        Pop-Location
    }
}

function Test-Install([string]$Mode) {
    Write-Host "== global install with $Mode"
    $repoCopy = Join-Path $Tmp "repo-$Mode"
    $homeDir = Join-Path $Tmp "home-$Mode"
    $bin = Join-Path $Tmp "bin-$Mode"
    New-RepoCopy $repoCopy
    New-Item -ItemType Directory -Path $homeDir | Out-Null
    $env:AGENTS_BIN_DIR = $bin
    $env:AGENTS_NO_SYMLINKS = if ($Mode -eq 'copies') { '1' } else { $null }

    Test-That 'install succeeds' (Invoke-Install $repoCopy $homeDir)
    Test-That 'install moves nothing aside' (Test-NoBackup)
    if ($Mode -eq 'copies') { Test-That 'install copies files' ([bool]($Out -match '^copied ')) }
    Test-That 'agents shim is installed' (Test-Path -LiteralPath "$bin\agents.cmd")
    Test-That 'second install reports only ok' ((Invoke-Install $repoCopy $homeDir) -and (Test-AllOk))

    $agent = Get-ChildItem -LiteralPath "$repoCopy\preset\agents" -Filter *.md | Select-Object -First 1 -ExpandProperty BaseName
    Remove-Item -LiteralPath "$repoCopy\preset\agents\$agent.md"
    $index = "$repoCopy\preset\concepts\INDEX.md"
    [System.IO.File]::AppendAllText($index, "changed`n")
    Test-That 'install after preset changes succeeds' (Invoke-Install $repoCopy $homeDir)
    Test-That 'install after preset changes moves nothing aside' (Test-NoBackup)
    Test-That 'deleted subagent is removed for Claude' (Test-Gone "$homeDir\.claude\agents\$agent.md")
    Test-That 'deleted subagent is removed for Copilot' (Test-Gone "$homeDir\.copilot\agents\$agent.agent.md")
    Test-That 'deleted subagent is removed for Codex' (Test-Gone "$homeDir\.codex\agents\$agent.toml")
    Test-That 'changed file is current' ((Get-FileHash -LiteralPath $index).Hash -eq (Get-FileHash -LiteralPath "$homeDir\.agents\concepts\INDEX.md").Hash)

    if ($Mode -eq 'links') { Test-Project $repoCopy $bin }

    Write-Host "== uninstall with $Mode"
    $edited = "$homeDir\.agents\concepts\INDEX.md"
    if ($Mode -eq 'copies') { [System.IO.File]::AppendAllText($edited, "edited in the home folder`n") }
    Test-That 'uninstall succeeds' (Invoke-Install $repoCopy $homeDir @('-Uninstall'))
    $left = @(Get-ChildItem -LiteralPath $homeDir, $bin -Recurse -Force -ErrorAction SilentlyContinue |
        Where-Object { (-not $_.PSIsContainer -or $_.LinkType) -and $_.Name -notlike '*.bak.*' })
    Test-That 'uninstall leaves no files' ($left.Count -eq 0)
    if ($Mode -eq 'copies') {
        Test-That 'uninstall keeps an edited copy as a backup' ([bool](Get-ChildItem -LiteralPath (Split-Path $edited) -Filter 'INDEX.md.bak.*'))
    }
}

foreach ($name in 'CLAUDE_CONFIG_DIR', 'CODEX_HOME', 'COPILOT_HOME') {
    Remove-Item -LiteralPath "Env:$name" -ErrorAction SilentlyContinue
}
Write-Host "PowerShell $($PSVersionTable.PSVersion) ($PsExe)"
New-Item -ItemType Directory -Path $Tmp | Out-Null
try {
    Test-Install 'links'
    Test-Install 'copies'
} finally {
    Remove-Item -LiteralPath $Tmp -Recurse -Force -ErrorAction SilentlyContinue
}

Write-Host ''
if ($Failures -gt 0) { Write-Host "$Failures check(s) failed"; exit 1 }
Write-Host 'smoke test passed'
