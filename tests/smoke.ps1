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

# Writes text with LF line endings, creating the folder.
function Write-Lf([string]$Path, [string]$Text) {
    New-Item -ItemType Directory -Force -Path (Split-Path $Path) | Out-Null
    [System.IO.File]::WriteAllText($Path, $Text.Replace("`r`n", "`n"))
}
function Read-Text([string]$Path) { [System.IO.File]::ReadAllText($Path) }
function Test-Has([string]$Path, [string]$Text) { (Test-Path -LiteralPath $Path) -and (Read-Text $Path).Contains($Text) }
# The first position of each text, which must be in the order given.
function Test-InOrder([string]$Path, [string[]]$Texts) {
    $text = Read-Text $Path
    $pos = -1
    foreach ($t in $Texts) {
        $i = $text.IndexOf($t, [StringComparison]::Ordinal)
        if ($i -le $pos) { return $false }
        $pos = $i
    }
    $true
}

function Invoke-Commit([string]$Dir, [string]$Message, [string[]]$Extra = @()) {
    Invoke-Native git (@('-C', $Dir, '-c', 'user.name=smoke', '-c', 'user.email=smoke@example.invalid', 'commit', '-qm', $Message) + $Extra) | Out-Null
}
# A git repository with one empty commit, so "git status" shows what agents changed.
function New-Repo([string]$Dir) {
    New-Item -ItemType Directory -Path $Dir | Out-Null
    Invoke-Native git @('-C', $Dir, 'init', '-q') | Out-Null
    Invoke-Native git @('-C', $Dir, 'config', 'core.autocrlf', 'false') | Out-Null
    Invoke-Commit $Dir 'init' @('--allow-empty')
}
function Test-Clean([string]$Dir) {
    Invoke-Native git @('-C', $Dir, 'status', '--porcelain') | Out-Null
    $Out.Count -eq 0
}
# The lines of the managed block in a repository's exclude file.
function Get-Excluded([string]$Dir) {
    $inBlock = $false
    foreach ($l in [System.IO.File]::ReadAllLines("$Dir\.git\info\exclude")) {
        if ($l -eq '# agents-preset:start') { $inBlock = $true; continue }
        if ($l -eq '# agents-preset:end') { $inBlock = $false; continue }
        if ($inBlock) { $l }
    }
}
function Test-Excludes([string]$Dir, [string]$Line) { @(Get-Excluded $Dir) -ccontains $Line }
# Runs the agents command in a folder; the output is left in $Out.
function Invoke-Agents([string]$Dir, [string[]]$Arguments) {
    Push-Location $Dir
    try { Invoke-Native $script:AgentsCmd $Arguments } finally { Pop-Location }
}
# Runs agents with some environment variables set for the call (a hashtable, name to value).
function Invoke-AgentsEnv([string]$Dir, [string[]]$Arguments, [hashtable]$Env) {
    $saved = @{}
    foreach ($k in $Env.Keys) {
        $saved[$k] = [Environment]::GetEnvironmentVariable($k)
        [Environment]::SetEnvironmentVariable($k, $Env[$k])
    }
    try { Invoke-Agents $Dir $Arguments } finally {
        foreach ($k in $saved.Keys) { [Environment]::SetEnvironmentVariable($k, $saved[$k]) }
    }
}
# A JSON tool agents can use, by the name AGENTS_JSON_TOOL takes.
function Test-Tool([string]$Tool) {
    if (-not (Get-Command $Tool -ErrorAction SilentlyContinue)) { return $false }
    if ($Tool -eq 'node') { return (Invoke-Native $Tool @('--version')) }
    Invoke-Native $Tool @('-c', 'import json')
}

# The settings-in-a-level checks for one JSON tool: the merge has its own code per tool.
function Test-Settings([string]$Tool, [string]$HomeDir) {
    $e = @{ AGENTS_JSON_TOOL = $Tool }
    $st = Join-Path $Tmp "settings-$Tool"
    New-Repo $st
    Test-That "[$Tool] add for the settings test succeeds" (Invoke-AgentsEnv $st @('add', '--project', "smoke-set-$Tool", 'agents/smoke-agent') $e)
    Write-Lf "$HomeDir\.agents\local\projects\smoke-set-$Tool\settings\claude.json" '{"permissions": {"deny": ["Write(**)"]}, "model": "project"}'
    Write-Lf "$st\.agents\levels\settings\claude.json" '{"permissions": {"deny": ["Edit(**)", "Write(**)"]}, "model": "checkout"}'
    Test-That "[$Tool] sync with settings levels succeeds" (Invoke-AgentsEnv $st @('sync') $e)
    $settingsFile = "$st\.claude\settings.local.json"
    Test-That "[$Tool] a deny rule in a level produces .claude/settings.local.json" ((Test-Has $settingsFile 'Edit(**)') -and (Test-Has $settingsFile 'Write(**)'))
    Test-That "[$Tool] arrays are concatenated without duplicates" (([regex]::Matches((Read-Text $settingsFile), [regex]::Escape('Write(**)'))).Count -eq 1)
    Test-That "[$Tool] the more specific level wins a plain value" (Test-Has $settingsFile '"checkout"')
    Test-That "[$Tool] the settings file is excluded" (Test-Excludes $st '/.claude/settings.local.json')
    Test-That "[$Tool] git status stays empty with settings" (Test-Clean $st)
    $before = Get-Snapshot $st
    Test-That "[$Tool] sync with unchanged settings succeeds" (Invoke-AgentsEnv $st @('sync') $e)
    Test-That "[$Tool] sync with unchanged settings changes nothing" ((Get-Snapshot $st) -eq $before)
    Remove-Item -LiteralPath "$st\.agents\levels\settings\claude.json"
    Test-That "[$Tool] sync after the checkout settings level is gone succeeds" (Invoke-AgentsEnv $st @('sync') $e)
    Test-That "[$Tool] the settings file follows its levels" (-not (Test-Has $settingsFile 'Edit(**)') -and (Test-Has $settingsFile 'Write(**)'))
    # A file the owner edited after agents wrote it is not overwritten.
    Write-Lf $settingsFile '{"edited": true}'
    Write-Lf "$st\.agents\levels\settings\claude.json" '{"model": "again"}'
    Test-That "[$Tool] sync with an edited settings file succeeds" (Invoke-AgentsEnv $st @('sync') $e)
    Test-That "[$Tool] an edited settings file is left alone" ((Read-Text $settingsFile) -eq '{"edited": true}')
    Test-That "[$Tool] an edited settings file gets a warning" ([bool]($Out -match '^warning: \.claude/settings\.local\.json'))

    $st2 = Join-Path $Tmp "settings-own-$Tool"
    New-Repo $st2
    Write-Lf "$st2\.claude\settings.local.json" '{"mine": true}'
    Write-Lf "$st2\.agents\levels\settings\claude.json" '{"permissions": {"deny": ["Write(**)"]}}'
    Test-That "[$Tool] add with an existing settings file succeeds" (Invoke-AgentsEnv $st2 @('add', 'agents/smoke-agent') $e)
    Test-That "[$Tool] an existing settings file is left alone" ((Read-Text "$st2\.claude\settings.local.json") -eq '{"mine": true}')
    Test-That "[$Tool] an existing settings file gets a warning and the rules to add" (([bool]($Out -match '^warning: \.claude/settings\.local\.json')) -and [bool]($Out -match [regex]::Escape('Write(**)')))
    Test-That "[$Tool] an existing settings file is not excluded" (-not (Test-Excludes $st2 '/.claude/settings.local.json'))

    # Malformed JSON in a level: a warning, and nothing is written.
    $st3 = Join-Path $Tmp "settings-bad-$Tool"
    New-Repo $st3
    Write-Lf "$st3\.agents\levels\settings\claude.json" '{"permissions": '
    Test-That "[$Tool] add with a malformed settings level succeeds" (Invoke-AgentsEnv $st3 @('add', 'agents/smoke-agent') $e)
    Test-That "[$Tool] a malformed settings level warns" ([bool]($Out -match "couldn't merge"))
    Test-That "[$Tool] a malformed settings level writes no settings file" (Test-Gone "$st3\.claude\settings.local.json")

    # A settings file the repository tracks is never changed.
    $st4 = Join-Path $Tmp "settings-tracked-$Tool"
    New-Repo $st4
    Write-Lf "$st4\.claude\settings.local.json" '{"tracked": true}'
    Invoke-Native git @('-C', $st4, 'add', '.claude/settings.local.json') | Out-Null
    Invoke-Commit $st4 'track the settings'
    Write-Lf "$st4\.agents\levels\settings\claude.json" '{"permissions": {"deny": ["Write(**)"]}}'
    Test-That "[$Tool] add with a tracked settings file succeeds" (Invoke-AgentsEnv $st4 @('add', 'agents/smoke-agent') $e)
    Test-That "[$Tool] a tracked settings file is left alone" ((Read-Text "$st4\.claude\settings.local.json") -eq '{"tracked": true}')
    Test-That "[$Tool] a tracked settings file gets a warning" ([bool]($Out -match '^warning: \.claude/settings\.local\.json'))
    Test-That "[$Tool] git status stays empty with a tracked settings file" (Test-Clean $st4)
}

function Test-Project([string]$RepoCopy, [string]$Bin, [string]$HomeDir) {
    Write-Host '== project (agents through the Git Bash shim)'
    # agents keeps its checkout list and the machine store in ~/.agents/local; keep them in the temporary home.
    # git must not read the developer's own configuration either: a global ignore file would hide
    # a broken exclude block from the "git status stays empty" checks.
    $gitEnv = 'HOME', 'GIT_CONFIG_GLOBAL', 'GIT_CONFIG_NOSYSTEM', 'XDG_CONFIG_HOME'
    $savedEnv = @{}
    foreach ($k in $gitEnv) { $savedEnv[$k] = [Environment]::GetEnvironmentVariable($k) }
    $emptyConfig = Join-Path $Tmp 'gitconfig'
    [System.IO.File]::WriteAllText($emptyConfig, '')
    $env:HOME = $HomeDir
    $env:GIT_CONFIG_GLOBAL = $emptyConfig
    $env:GIT_CONFIG_NOSYSTEM = '1'
    $env:XDG_CONFIG_HOME = Join-Path $Tmp 'xdg'
    try {
    $script:AgentsCmd = Join-Path $Bin 'agents.cmd'
    $agentsCmd = $script:AgentsCmd
    $checkouts = "$HomeDir\.agents\local\checkouts"
    $oldList = "$HomeDir\.agents\local\projects"
    $skills = Get-ChildItem -LiteralPath "$RepoCopy\preset\skills" -Directory
    $tailored = $skills | Where-Object { Test-Path -LiteralPath "$($_.FullName)\GENERATE.md" } | Select-Object -First 1 -ExpandProperty Name
    $global = $skills | Where-Object { -not (Test-Path -LiteralPath "$($_.FullName)\GENERATE.md") } | Select-Object -First 1 -ExpandProperty Name
    $agent = Get-ChildItem -LiteralPath "$RepoCopy\preset\agents" -Filter *.md | Select-Object -First 1 -ExpandProperty BaseName
    $preset = "$RepoCopy\preset"

    # A sample tailored skill and a sample tailored subagent, both with a specifics recipe.
    Write-Lf "$preset\skills\smoke-skill\SKILL.md" @'
---
name: smoke-skill
description: Use in the smoke test.
---

# Smoke skill

> **Repo version first:** if this repository has `.agents/skills/smoke-skill/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

CORE-SENTENCE-A applies here.
CORE-SENTENCE-B applies here.
CORE-SENTENCE-C applies here.
DUP-LINE then DUP-LINE again.
'@
    Write-Lf "$preset\skills\smoke-skill\GENERATE.md" @'
---
description: Recipe for the smoke skill.
output: specifics
---

# smoke-skill (recipe)

Write the specifics.
'@
    Write-Lf "$preset\skills\smoke-skill\references\extra.md" "# Extra`n`nSupporting file of the smoke skill.`n"
    Write-Lf "$preset\agents\smoke-agent.md" @'
---
name: smoke-agent
description: Smoke test subagent.
model: haiku
---

You are the smoke agent. AGENT-CORE-SENTENCE stays.
AGENT-DROP-ME goes.
'@
    Write-Lf "$preset\agents\recipes\smoke-agent.md" @'
---
description: Recipe for the smoke subagent.
output: specifics
---

# smoke-agent (recipe)

Write the specifics.
'@

    # A sample skill for removals that overlap or build on each other.
    Write-Lf "$preset\skills\smoke-order\SKILL.md" @'
---
name: smoke-order
description: Use in the smoke test.
---

# Smoke order

> **Repo version first:** if this repository has `.agents/skills/smoke-order/SKILL.md`, follow that file instead of this one. It's tailored to the repository.

ORDER-A-ONE here.
ORDER-B-TWO here.
'@
    Write-Lf "$preset\skills\smoke-order\GENERATE.md" @'
---
description: Recipe for the order sample.
output: specifics
---

# smoke-order (recipe)

Write the specifics.
'@

    $proj = Join-Path $Tmp 'project'
    New-Repo $proj
    # The copy's preset was changed above, so only that check finishes is tested here.
    Invoke-Agents $proj @('check') | Out-Null
    Test-That 'agents check runs' ([bool]($Out -match '^(ok - |\d+ problem)'))
    Test-That 'agents check finds no problem in the sample recipe' (-not ($Out -match 'agents/recipes/smoke-agent'))
    Write-Lf "$preset\agents\recipes\smoke-bad.md" "---`ndescription: A recipe without the output field.`n---`n"
    Invoke-Agents $proj @('check') | Out-Null
    Test-That 'agents check runs with a bad recipe' ([bool]($Out -match '^(ok - |\d+ problem)'))
    Test-That 'agents check names the recipe without output: specifics' ([bool]($Out -match 'agents/recipes/smoke-bad\.md.*output: specifics'))
    Remove-Item -LiteralPath "$preset\agents\recipes\smoke-bad.md"

    # The old list of checkouts, a file called projects, becomes checkouts.
    New-Item -ItemType Directory -Force -Path "$HomeDir\.agents\local" | Out-Null
    Write-Lf $oldList "$Tmp/old-listed`n"
    $items = @("skills/$tailored", "agents/$agent")
    $files = @('.agents\preset.txt', '.agents\project', ".agents\recipes\skills\$tailored.md", ".claude\agents\$agent.md",
               ".github\agents\$agent.agent.md", ".codex\agents\$agent.toml")
    if ($global) {
        $items += "skills/$global"
        $files += ".agents\skills\$global\SKILL.md", ".claude\skills\$global\SKILL.md"
    }
    Test-That 'add succeeds' (Invoke-Agents $proj (@('add') + $items))
    foreach ($f in $files) { Test-That "add creates $f" (Test-Path -LiteralPath "$proj\$f") }
    Test-That 'add lists the project for update' ((Test-Path -LiteralPath $checkouts) -and [bool](@(Get-Content -LiteralPath $checkouts) -match '/project$'))
    Test-That 'add moves the old checkout list to checkouts' ((Test-Gone $oldList) -and (Test-Has $checkouts "$Tmp/old-listed"))
    Test-That 'add names the project after the folder when there is no origin' ((Read-Text "$proj\.agents\project") -eq "name=project`nstore=machine`n")
    $agentsMd = Read-Text "$proj\AGENTS.md"
    Test-That 'AGENTS.md has the managed block' ($agentsMd.Contains('<!-- agents-preset:start -->'))
    Test-That 'AGENTS.md has LF line endings' (-not $agentsMd.Contains("`r`n"))
    Test-That 'CLAUDE.md imports AGENTS.md' ((Read-Text "$proj\CLAUDE.md").Contains('@AGENTS.md'))
    Test-That 'add leaves git status empty' (Test-Clean $proj)
    Test-That 'the exclude block lists .agents/' (Test-Excludes $proj '/.agents/')
    Test-That 'the exclude block lists the subagent copies' ((Test-Excludes $proj "/.claude/agents/$agent.md") -and (Test-Excludes $proj "/.codex/agents/$agent.toml"))
    Test-That 'the exclude block lists AGENTS.md and CLAUDE.md' ((Test-Excludes $proj '/AGENTS.md') -and (Test-Excludes $proj '/CLAUDE.md'))
    $before = Get-Snapshot $proj
    $excludeBefore = Read-Text "$proj\.git\info\exclude"
    Test-That 'remove --dry-run succeeds' (Invoke-Agents $proj @('remove', '--dry-run', "agents/$agent"))
    Test-That 'remove --dry-run reports the exclude block' ([bool]($Out -match 'exclude block'))
    Test-That 'remove --dry-run changes nothing' ((Get-Snapshot $proj) -eq $before)
    Test-That 'remove --dry-run leaves the exclude block alone' ((Read-Text "$proj\.git\info\exclude") -eq $excludeBefore)
    Test-That 'sync succeeds' (Invoke-Agents $proj @('sync'))
    Test-That 'sync changes nothing' (((Get-Snapshot $proj) -eq $before) -and (Test-Clean $proj))
    Test-That 'sync leaves the exclude block alone' ((Read-Text "$proj\.git\info\exclude") -eq $excludeBefore)
    # A line the owner wrote in the exclude file stays, in and after the block.
    [System.IO.File]::AppendAllText("$proj\.git\info\exclude", "owner-line`n")
    Test-That 'sync after an owner edit succeeds' (Invoke-Agents $proj @('sync'))
    Test-That 'lines outside the block are never changed' (Test-Has "$proj\.git\info\exclude" "owner-line`n")

    Write-Host '== tracked files (agents through the Git Bash shim)'
    # A preset path the repository tracks (committed earlier): warned about, never changed.
    $p2 = Join-Path $Tmp 'committed'
    New-Repo $p2
    Invoke-Agents $p2 @('add', "agents/$agent") | Out-Null
    Invoke-Native git @('-C', $p2, 'add', '-f', ".claude/agents/$agent.md") | Out-Null
    Invoke-Commit $p2 'track a preset file'
    [System.IO.File]::AppendAllText("$p2\.claude\agents\$agent.md", "own edit`n")
    $before = Get-Snapshot $p2
    Test-That 'sync with a tracked preset path succeeds' (Invoke-Agents $p2 @('sync'))
    Test-That 'sync warns how to stop tracking a preset path' ([bool]($Out -match [regex]::Escape("git rm -r --cached .claude/agents/$agent.md")))
    Test-That 'sync changes nothing in a tracked preset path' ((Get-Snapshot $p2) -eq $before)
    Invoke-Native git @('-C', $p2, 'ls-files') | Out-Null
    Test-That 'sync never runs git rm' ($Out -contains ".claude/agents/$agent.md")

    # A repository that tracks AGENTS.md: the block goes into CLAUDE.local.md.
    $p3 = Join-Path $Tmp 'tracks-agents-md'
    New-Repo $p3
    Write-Lf "$p3\AGENTS.md" "# Own rules`n"
    Invoke-Native git @('-C', $p3, 'add', 'AGENTS.md') | Out-Null
    Invoke-Commit $p3 'own rules'
    Test-That 'add in a repository that tracks AGENTS.md succeeds' (Invoke-Agents $p3 @('add', "skills/$tailored"))
    Test-That 'add leaves a tracked AGENTS.md unchanged' ((Read-Text "$p3\AGENTS.md") -eq "# Own rules`n")
    Test-That 'the block goes into CLAUDE.local.md' (Test-Has "$p3\CLAUDE.local.md" '<!-- agents-preset:start -->')
    Test-That 'CLAUDE.local.md imports AGENTS.md' (Test-Has "$p3\CLAUDE.local.md" '@AGENTS.md')
    Test-That 'git status stays empty with a tracked AGENTS.md' (Test-Clean $p3)
    Test-That 'the exclude block lists CLAUDE.local.md and not AGENTS.md' ((Test-Excludes $p3 '/CLAUDE.local.md') -and -not (Test-Excludes $p3 '/AGENTS.md'))
    Test-That 'no CLAUDE.md is written beside CLAUDE.local.md' (Test-Gone "$p3\CLAUDE.md")

    # Only CLAUDE.md tracked: the block stays in AGENTS.md, CLAUDE.local.md imports it.
    $p4 = Join-Path $Tmp 'tracks-claude-md'
    New-Repo $p4
    Write-Lf "$p4\CLAUDE.md" "# Own claude rules`n"
    Invoke-Native git @('-C', $p4, 'add', 'CLAUDE.md') | Out-Null
    Invoke-Commit $p4 'own claude rules'
    Test-That 'add in a repository that tracks CLAUDE.md succeeds' (Invoke-Agents $p4 @('add', "skills/$tailored"))
    Test-That 'add leaves a tracked CLAUDE.md unchanged' ((Read-Text "$p4\CLAUDE.md") -eq "# Own claude rules`n")
    Test-That 'the block stays in AGENTS.md' (Test-Has "$p4\AGENTS.md" '<!-- agents-preset:start -->')
    Test-That 'CLAUDE.local.md imports AGENTS.md' (Test-Has "$p4\CLAUDE.local.md" '@AGENTS.md')
    Test-That 'git status stays empty with a tracked CLAUDE.md' (Test-Clean $p4)
    # A tracked CLAUDE.md that imports AGENTS.md needs no CLAUDE.local.md.
    $p4b = Join-Path $Tmp 'claude-md-imports'
    New-Repo $p4b
    Write-Lf "$p4b\CLAUDE.md" "@AGENTS.md`n"
    Invoke-Native git @('-C', $p4b, 'add', 'CLAUDE.md') | Out-Null
    Invoke-Commit $p4b 'own claude rules'
    Invoke-Agents $p4b @('add', "skills/$tailored") | Out-Null
    Test-That 'a tracked CLAUDE.md that imports AGENTS.md gets no CLAUDE.local.md' (Test-Gone "$p4b\CLAUDE.local.md")

    # A managed block inside a tracked file: warned about, left as it is.
    $p5 = Join-Path $Tmp 'block-in-tracked'
    New-Repo $p5
    Invoke-Agents $p5 @('add', "skills/$tailored") | Out-Null
    Invoke-Native git @('-C', $p5, 'add', '-f', 'AGENTS.md') | Out-Null
    Invoke-Commit $p5 'track AGENTS.md with the block'
    $trackedText = Read-Text "$p5\AGENTS.md"
    Test-That 'sync with a block in a tracked file succeeds' (Invoke-Agents $p5 @('sync'))
    Test-That 'sync warns about a block in a tracked file' ([bool]($Out -match 'AGENTS\.md.*remove the block and commit, or keep it'))
    Test-That 'sync leaves a tracked file with a block as it is' ((Read-Text "$p5\AGENTS.md") -eq $trackedText)

    Write-Host '== tailored items (agents through the Git Bash shim)'
    $tp = Join-Path $Tmp 'tailored'
    New-Repo $tp
    Invoke-Native git @('-C', $tp, 'remote', 'add', 'origin', 'https://example.invalid/team/Smoke-Repo.git') | Out-Null
    Test-That 'add tailored items succeeds' (Invoke-Agents $tp @('add', 'skills/smoke-skill', 'agents/smoke-agent'))
    Test-That 'the project is named after the origin' ((Read-Text "$tp\.agents\project") -eq "name=smoke-repo`nstore=machine`n")
    Test-That 'without level files the skill has no repo version yet' (Test-Gone "$tp\.agents\skills\smoke-skill")
    Test-That 'without level files the subagent is the core' ((Read-Text "$tp\.claude\agents\smoke-agent.md") -eq (Read-Text "$preset\agents\smoke-agent.md"))
    Test-That 'the recipes are copied' ((Test-Path -LiteralPath "$tp\.agents\recipes\skills\smoke-skill.md") -and (Test-Path -LiteralPath "$tp\.agents\recipes\agents\smoke-agent.md"))
    Test-That 'AGENTS.md names the recipe and the level paths' ((Test-Has "$tp\AGENTS.md" '.agents/recipes/skills/smoke-skill.md') -and (Test-Has "$tp\AGENTS.md" '.agents/levels/skills/smoke-skill.md') -and (Test-Has "$tp\AGENTS.md" '~/.agents/local/projects/smoke-repo/skills/smoke-skill.md'))

    $store = "$HomeDir\.agents\local\projects\smoke-repo"
    Write-Lf "$store\skills\smoke-skill.md" @'
PROJECT-LEVEL-TEXT

## Removed from the core

### Drop sentence A
Core text: "CORE-SENTENCE-A applies here."
Replacement: "REPLACED-A"
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: the sentence is wrong here

### Two cases only
Core text: "CORE-SENTENCE-B applies here."
Replacement: ""
Cases:
1. first case
2. second case
Review: other-model, 2026-11-16, agreed: fine

### Not agreed
Core text: "CORE-SENTENCE-C applies here."
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, rejected: it is needed

### Twice
Core text: "DUP-LINE"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Stale
Core text: "TEXT THAT IS NOT IN THE CORE"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Multi line
Core text: "DUP-LINE then
DUP-LINE again."
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine
'@
    Write-Lf "$tp\.agents\levels\skills\smoke-skill.md" "CHECKOUT-LEVEL-TEXT`n"
    Write-Lf "$store\agents\smoke-agent.md" @'
AGENT-PROJECT-TEXT

## Removed from the core

### Drop the agent line
Core text: "AGENT-DROP-ME goes."
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine
'@
    Write-Lf "$tp\.agents\levels\agents\smoke-agent.md" "AGENT-CHECKOUT-TEXT`n"
    $skillMd = "$tp\.agents\skills\smoke-skill\SKILL.md"
    Test-That 'sync composes the levels' (Invoke-Agents $tp @('sync'))
    $warnings = $Out
    Test-That 'the composed skill has the core, the project and the checkout level in this order' (Test-InOrder $skillMd @('CORE-SENTENCE-B applies here.', '## In this project', 'PROJECT-LEVEL-TEXT', '## In this checkout', 'CHECKOUT-LEVEL-TEXT', 'the more specific one wins'))
    Test-That 'the composed skill keeps its frontmatter first' ((Read-Text $skillMd).StartsWith("---`n"))
    Test-That 'the composed skill drops the repo-version notice' (-not (Test-Has $skillMd 'Repo version first'))
    Test-That "the composed skill carries the core's supporting files" (Test-Path -LiteralPath "$tp\.agents\skills\smoke-skill\references\extra.md")
    Test-That 'the composed skill has no recipe inside' (Test-Gone "$tp\.agents\skills\smoke-skill\GENERATE.md")
    Test-That 'the composed skill is mirrored for Claude Code' (Test-Has "$tp\.claude\skills\smoke-skill\SKILL.md" 'CHECKOUT-LEVEL-TEXT')
    Test-That 'the removal section is not copied' (-not (Test-Has $skillMd 'Removed from the core'))
    Test-That 'a valid removal applies' ((Test-Has $skillMd 'REPLACED-A') -and -not (Test-Has $skillMd 'CORE-SENTENCE-A applies here.'))
    Test-That 'a removal with two cases does not apply' (Test-Has $skillMd 'CORE-SENTENCE-B applies here.')
    Test-That 'a removal with two cases warns' ([bool]($warnings -match 'smoke-skill.*"Two cases only".*3 cases'))
    Test-That 'a removal without agreed does not apply' (Test-Has $skillMd 'CORE-SENTENCE-C applies here.')
    Test-That 'a removal without agreed warns' ([bool]($warnings -match 'smoke-skill.*"Not agreed".*agreed'))
    Test-That 'a removal whose core text occurs twice does not apply' (Test-Has $skillMd 'DUP-LINE then DUP-LINE again.')
    Test-That 'a removal whose core text occurs twice warns' ([bool]($warnings -match 'smoke-skill.*"Twice".*2 times'))
    Test-That 'a removal whose core text is not there warns' ([bool]($warnings -match 'smoke-skill.*"Stale".*not in the core'))
    Test-That 'a removal whose quoted text runs over two lines warns about the line, not the core' ([bool]($warnings -match 'smoke-skill.*"Multi line".*one line'))
    foreach ($f in '.claude\agents\smoke-agent.md', '.github\agents\smoke-agent.agent.md', '.codex\agents\smoke-agent.toml') {
        Test-That "the composed subagent $f has the core, the project and the checkout level in this order" (Test-InOrder "$tp\$f" @('AGENT-CORE-SENTENCE stays.', '## In this project', 'AGENT-PROJECT-TEXT', '## In this checkout', 'AGENT-CHECKOUT-TEXT', 'the more specific one wins'))
        Test-That "the composed subagent $f applies its removal" (-not (Test-Has "$tp\$f" 'AGENT-DROP-ME'))
    }
    Test-That 'the composed subagent keeps its frontmatter' ((Read-Text "$tp\.claude\agents\smoke-agent.md").StartsWith("---`n"))
    Test-That 'the composed subagent keeps its model' (Test-Has "$tp\.claude\agents\smoke-agent.md" 'model: haiku')
    Test-That 'git status stays empty with composed items' (Test-Clean $tp)
    Test-That 'the exclude block lists the composed items' ((Test-Excludes $tp '/.claude/skills/smoke-skill') -and (Test-Excludes $tp '/.github/agents/smoke-agent.agent.md'))
    $before = Get-Snapshot $tp
    Test-That 'a second sync succeeds' (Invoke-Agents $tp @('sync'))
    Test-That 'a second sync changes nothing' ((Get-Snapshot $tp) -eq $before)

    # A change to the core shows up on the next sync.
    [System.IO.File]::AppendAllText("$preset\skills\smoke-skill\SKILL.md", "NEWCORE-LINE`n")
    [System.IO.File]::AppendAllText("$preset\agents\smoke-agent.md", "NEWCORE-AGENT-LINE`n")
    Test-That 'sync after a core change succeeds' (Invoke-Agents $tp @('sync'))
    Test-That 'a core change reaches the composed skill' (Test-Has $skillMd 'NEWCORE-LINE')
    Test-That 'a core change reaches the composed subagent' (Test-Has "$tp\.claude\agents\smoke-agent.md" 'NEWCORE-AGENT-LINE')
    Test-That 'a core change reaches the Codex agent' (Test-Has "$tp\.codex\agents\smoke-agent.toml" 'NEWCORE-AGENT-LINE')

    # A removal whose core text changed no longer applies.
    $core = Read-Text "$preset\skills\smoke-skill\SKILL.md"
    [System.IO.File]::WriteAllText("$preset\skills\smoke-skill\SKILL.md", $core.Replace('CORE-SENTENCE-A applies here.', 'CORE-SENTENCE-A was reworded.'))
    Test-That 'sync after the removed core text changed succeeds' (Invoke-Agents $tp @('sync'))
    Test-That 'a removal whose core text changed does not apply' ((Test-Has $skillMd 'CORE-SENTENCE-A was reworded.') -and -not (Test-Has $skillMd 'REPLACED-A'))
    Test-That 'a removal whose core text changed warns' ([bool]($Out -match 'smoke-skill.*"Drop sentence A".*not in the core'))

    # No level file left: the items behave as before.
    Remove-Item -LiteralPath "$store\skills\smoke-skill.md", "$tp\.agents\levels\skills\smoke-skill.md", "$store\agents\smoke-agent.md", "$tp\.agents\levels\agents\smoke-agent.md"
    Test-That 'sync without level files succeeds' (Invoke-Agents $tp @('sync'))
    Test-That 'without level files the composed skill is gone' ((Test-Gone "$tp\.agents\skills\smoke-skill") -and (Test-Gone "$tp\.claude\skills\smoke-skill"))
    Test-That 'without level files the subagent is the core again' ((Read-Text "$tp\.claude\agents\smoke-agent.md") -eq (Read-Text "$preset\agents\smoke-agent.md"))

    Write-Host '== composition edge cases (agents through the Git Bash shim)'
    # Removals are checked against the core, not against the text earlier removals made.
    $to = Join-Path $Tmp 'order'
    New-Repo $to
    Test-That 'add for the order test succeeds' (Invoke-Agents $to @('add', '--project', 'smoke-order', 'skills/smoke-order'))
    Write-Lf "$HomeDir\.agents\local\projects\smoke-order\skills\smoke-order.md" @'
ORDER-PROJECT-TEXT

## Removed from the core

### Grow A
Core text: "ORDER-A-ONE here."
Replacement: "ORDER-B-TWO here. ORDER-B-TWO here. ONLY-IN-REPLACEMENT"
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Reword B
Core text: "ORDER-B-TWO here."
Replacement: "B-REWORDED"
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Only in a replacement
Core text: "ONLY-IN-REPLACEMENT"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine

### Overlap
Core text: "A-ONE here"
Replacement: ""
Cases:
1. first case
2. second case
3. third case
Review: other-model, 2026-11-16, agreed: fine
'@
    Test-That 'sync with removals that build on each other succeeds' (Invoke-Agents $to @('sync'))
    $orderOut = $Out
    $orderMd = "$to\.agents\skills\smoke-order\SKILL.md"
    Test-That 'a removal is not refused because an earlier replacement repeated its core text' ((Test-Has $orderMd 'B-REWORDED') -and ([regex]::Matches((Read-Text $orderMd), [regex]::Escape('ORDER-B-TWO here.'))).Count -eq 2)
    Test-That 'text that only an earlier replacement brought in is not removed' (Test-Has $orderMd 'ONLY-IN-REPLACEMENT')
    Test-That 'a removal for text that is only in a replacement warns it is not in the core' ([bool]($orderOut -match 'smoke-order.*"Only in a replacement".*not in the core'))
    Test-That 'a removal that overlaps an earlier one warns' ([bool]($orderOut -match 'smoke-order.*"Overlap".*overlaps'))
    Test-That 'the earlier of two overlapping removals applies' (-not (Test-Has $orderMd 'ORDER-A-ONE here.'))

    # A level file with no text composes nothing.
    $tb = Join-Path $Tmp 'blank'
    New-Repo $tb
    Test-That 'add for the blank level test succeeds' (Invoke-Agents $tb @('add', '--project', 'smoke-blank', 'skills/smoke-skill', 'agents/smoke-agent'))
    Write-Lf "$tb\.agents\levels\skills\smoke-skill.md" "`n  `n`n"
    Write-Lf "$tb\.agents\levels\agents\smoke-agent.md" "`n`n"
    Test-That 'sync with blank level files succeeds' (Invoke-Agents $tb @('sync'))
    Test-That 'a blank level composes no skill' (Test-Gone "$tb\.agents\skills\smoke-skill")
    Test-That 'a blank level leaves the subagent as the core' ((Read-Text "$tb\.claude\agents\smoke-agent.md") -eq (Read-Text "$preset\agents\smoke-agent.md"))
    Test-That 'a blank level counts as no level' ([bool]($Out -match 'No level yet'))
    # A level that looks like a whole file is warned about.
    Write-Lf "$tb\.agents\levels\agents\smoke-agent.md" "---`nname: x`n---`n> **Repo version first:** x`nBODY-OF-LEVEL`n"
    Test-That 'sync with a level that has frontmatter succeeds' (Invoke-Agents $tb @('sync'))
    Test-That 'a level that starts with frontmatter warns' ([bool]($Out -match 'starts with frontmatter'))
    Test-That 'a level with the repo-version notice warns' ([bool]($Out -match 'holds the "Repo version first" notice'))
    Test-That 'the level is still composed' (Test-Has "$tb\.claude\agents\smoke-agent.md" 'BODY-OF-LEVEL')

    Write-Host '== exclude block edge cases (agents through the Git Bash shim)'
    # A marker without its partner: the file is left alone.
    $p6 = Join-Path $Tmp 'unbalanced'
    New-Repo $p6
    Invoke-Agents $p6 @('add', "agents/$agent") | Out-Null
    $excl6 = "$p6\.git\info\exclude"
    [System.IO.File]::WriteAllLines($excl6, [string[]]@([System.IO.File]::ReadAllLines($excl6) | Where-Object { $_ -ne '# agents-preset:end' }))
    [System.IO.File]::AppendAllText($excl6, "my-ignored-dir/`n")
    $before = Read-Text $excl6
    Test-That 'sync with an end marker missing succeeds' (Invoke-Agents $p6 @('sync'))
    Test-That 'sync leaves an exclude file with an unbalanced marker as it is' ((Read-Text $excl6) -eq $before)
    Test-That 'sync warns about the marker' ([bool]($Out -match 'block marker'))

    # A repository that tracks files in .agents/: exact paths, so the owner's new files stay visible.
    $p7 = Join-Path $Tmp 'tracks-agents-dir'
    New-Repo $p7
    Write-Lf "$p7\.agents\skills\own-skill\SKILL.md" "# Own skill`n"
    Invoke-Native git @('-C', $p7, 'add', '.agents') | Out-Null
    Invoke-Commit $p7 'own agents folder'
    Test-That 'add in a repository that tracks files in .agents succeeds' (Invoke-Agents $p7 @('add', "agents/$agent"))
    Test-That 'git status stays empty with a tracked .agents folder' (Test-Clean $p7)
    Test-That 'the exclude block does not hide the whole .agents folder' (-not (Test-Excludes $p7 '/.agents/'))
    Test-That 'the exclude block lists the manifest' (Test-Excludes $p7 '/.agents/preset.txt')
    Write-Lf "$p7\.agents\skills\new-skill\SKILL.md" "# New skill`n"
    Invoke-Native git @('-C', $p7, 'status', '--porcelain') | Out-Null
    Test-That 'a new file the owner adds to a tracked .agents folder stays visible' (($Out -join "`n") -eq '?? .agents/skills/new-skill/')

    # The last item goes, but the owner's levels stay hidden.
    $p8 = Join-Path $Tmp 'levels-left'
    New-Repo $p8
    Invoke-Agents $p8 @('add', '--project', 'smoke-left', 'skills/smoke-skill') | Out-Null
    Write-Lf "$p8\.agents\levels\skills\smoke-skill.md" "LEFT-LEVEL`n"
    Invoke-Agents $p8 @('sync') | Out-Null
    $selected8 = [System.IO.File]::ReadAllLines("$p8\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }
    Test-That 'removing the last item succeeds' (Invoke-Agents $p8 (@('remove') + $selected8))
    Test-That "the owner's levels are kept" (Test-Path -LiteralPath "$p8\.agents\levels\skills\smoke-skill.md")
    Test-That "the owner's levels stay out of git status" (Test-Clean $p8)
    Test-That 'the exclude block keeps hiding .agents/' (Test-Excludes $p8 '/.agents/')

    # State files the repository tracks are not deleted with the last item.
    $p9 = Join-Path $Tmp 'tracks-state'
    New-Repo $p9
    Invoke-Agents $p9 @('add', "agents/$agent") | Out-Null
    Invoke-Native git @('-C', $p9, 'add', '-f', '.agents/preset.txt', '.agents/project') | Out-Null
    Invoke-Commit $p9 'track the state'
    $selected9 = [System.IO.File]::ReadAllLines("$p9\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }
    Test-That 'removing the last item with tracked state files succeeds' (Invoke-Agents $p9 (@('remove') + $selected9))
    Test-That 'tracked state files are not deleted' ((Test-Path -LiteralPath "$p9\.agents\preset.txt") -and (Test-Path -LiteralPath "$p9\.agents\project"))
    Invoke-Native git @('-C', $p9, 'status', '--porcelain') | Out-Null
    Test-That 'git status shows no deleted file' (-not [bool]($Out -match '^( D|D )'))
    Test-That 'a tracked manifest no longer lists any item' (@([System.IO.File]::ReadAllLines("$p9\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }).Count -eq 0)

    # Linked worktrees share one exclude file: each one's paths stay hidden while it needs them.
    $wr = Join-Path $Tmp 'wt-main'
    $wt = Join-Path $Tmp 'wt-linked'
    New-Repo $wr
    Invoke-Native git @('-C', $wr, 'worktree', 'add', '-q', $wt, '-b', 'wt-branch') | Out-Null
    Invoke-Agents $wr @('add', "agents/$agent") | Out-Null
    Invoke-Agents $wt @('add', "agents/$agent", 'skills/smoke-skill') | Out-Null
    Test-That 'the main checkout is clean' (Test-Clean $wr)
    Test-That 'a linked worktree is clean' (Test-Clean $wt)
    $selectedWr = [System.IO.File]::ReadAllLines("$wr\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }
    Test-That 'removing everything in the main checkout succeeds' (Invoke-Agents $wr (@('remove') + $selectedWr))
    Test-That 'the main checkout is clean after that' (Test-Clean $wr)
    Test-That 'a linked worktree stays clean when the main checkout drops its items' (Test-Clean $wt)
    Test-That 'the shared exclude block still lists what the worktree needs' (Test-Excludes $wr "/.codex/agents/$agent.toml")
    $selectedWt = [System.IO.File]::ReadAllLines("$wt\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }
    Test-That 'removing everything in the worktree succeeds' (Invoke-Agents $wt (@('remove') + $selectedWt))
    Test-That 'the shared exclude block goes when no checkout needs it' (-not (Test-Has "$wr\.git\info\exclude" 'agents-preset'))
    Test-That 'both are clean at the end' ((Test-Clean $wr) -and (Test-Clean $wt))

    # Both checkout lists exist: they are joined, so the machine store's folder can be created.
    $h2 = Join-Path $Tmp 'home2'
    New-Item -ItemType Directory -Force -Path "$h2\.agents\local" | Out-Null
    Write-Lf "$h2\.agents\local\projects" "$Tmp/old-a`n"
    Write-Lf "$h2\.agents\local\checkouts" "$Tmp/new-b`n"
    $pj = Join-Path $Tmp 'both-lists'
    New-Repo $pj
    $env:HOME = $h2
    try { $okBoth = Invoke-Agents $pj @('add', '--project', 'smoke-both', 'skills/smoke-skill') } finally { $env:HOME = $HomeDir }
    Test-That 'add with both checkout lists succeeds' $okBoth
    Test-That 'both checkout lists are joined into checkouts' ((Test-Has "$h2\.agents\local\checkouts" "$Tmp/old-a") -and (Test-Has "$h2\.agents\local\checkouts" "$Tmp/new-b"))
    Test-That 'the old list file is gone, so the project store can be created' (-not (Test-Path -LiteralPath "$h2\.agents\local\projects" -PathType Leaf))

    Write-Host '== project name and store (agents through the Git Bash shim)'
    $sp = Join-Path $Tmp 'shared'
    New-Repo $sp
    Test-That 'an invalid project name is refused' (-not (Invoke-Agents $sp @('add', '--project', '../x', 'skills/smoke-skill')))
    Test-That 'an invalid project name is named in the message' ([bool]($Out -match 'invalid project name'))
    Test-That 'an invalid project name changes nothing' (@(Get-ChildItem -LiteralPath $sp -Force | Where-Object Name -ne '.git').Count -eq 0)
    Test-That 'a project name starting with a dot is refused' (-not (Invoke-Agents $sp @('add', '--project', '.hidden', 'skills/smoke-skill')))
    Test-That 'an unknown store is refused' (-not (Invoke-Agents $sp @('add', '--store', 'nowhere', 'skills/smoke-skill')))
    Test-That 'add --project --store agents succeeds' (Invoke-Agents $sp @('add', '--project', 'smoke-shared', '--store', 'agents', 'skills/smoke-skill'))
    Test-That '.agents/project records the name and the store' ((Read-Text "$sp\.agents\project") -eq "name=smoke-shared`nstore=agents`n")
    Write-Lf "$RepoCopy\projects\smoke-shared\skills\smoke-skill.md" "SHARED-PROJECT-TEXT`n"
    Test-That 'sync with the agents store succeeds' (Invoke-Agents $sp @('sync'))
    Test-That 'the project level comes from projects/<name>/ in the repo' (Test-Has "$sp\.agents\skills\smoke-skill\SKILL.md" 'SHARED-PROJECT-TEXT')
    Test-That 'the machine store is not used for it' (Test-Gone "$HomeDir\.agents\local\projects\smoke-shared")
    Test-That 'AGENTS.md names the agents store' (Test-Has "$sp\AGENTS.md" 'projects/smoke-shared/skills/smoke-skill.md')

    Write-Host '== settings in a level (agents through the Git Bash shim)'
    # The merge runs once per JSON tool that is installed, because each tool has its own code path.
    $toolsRun = 0
    foreach ($t in 'node', 'python3', 'python') {
        if (Test-Tool $t) { $toolsRun++; Test-Settings $t $HomeDir } else { Write-Host "skip    settings tests with ${t}: not installed" }
    }
    # Without any JSON tool the settings can't be merged: a warning, no file. Tested with a tool that doesn't exist.
    $st5 = Join-Path $Tmp 'settings-notool'
    New-Repo $st5
    Write-Lf "$st5\.agents\levels\settings\claude.json" '{"permissions": {"deny": ["Write(**)"]}}'
    Test-That 'add without a JSON tool succeeds' (Invoke-AgentsEnv $st5 @('add', 'agents/smoke-agent') @{ AGENTS_JSON_TOOL = 'nosuchtool' })
    Test-That 'without a JSON tool the settings are skipped with a warning' ([bool]($Out -match 'settings in a level are skipped'))
    Test-That 'without a JSON tool no settings file is written' (Test-Gone "$st5\.claude\settings.local.json")
    Test-That 'at least one JSON tool is installed to test the settings merge' ($toolsRun -gt 0)

    Write-Host '== removing everything (agents through the Git Bash shim)'
    # Only the first project is listed from here on.
    $selected = [System.IO.File]::ReadAllLines("$proj\.agents\preset.txt") | Where-Object { $_ -notmatch '^#' }
    Test-That 'removing every item succeeds' (Invoke-Agents $proj (@('remove') + $selected))
    $left = @(Get-ChildItem -LiteralPath $proj -Force | Select-Object -ExpandProperty Name)
    Test-That 'removing every item leaves the project as it was' ($left.Count -eq 1 -and $left[0] -eq '.git')
    Test-That 'removing every item removes the exclude block' (-not (Test-Has "$proj\.git\info\exclude" 'agents-preset'))
    Test-That "removing every item keeps the owner's exclude lines" (Test-Has "$proj\.git\info\exclude" 'owner-line')
    Test-That 'removing every item leaves git status empty' (Test-Clean $proj)
    Test-That 'removing every item drops the project from the update list' (-not [bool](@(Get-Content -LiteralPath $checkouts -ErrorAction SilentlyContinue) -match '/project$'))
    } finally {
        foreach ($k in $gitEnv) { [Environment]::SetEnvironmentVariable($k, $savedEnv[$k]) }
        # Only the install's own files may be left for the uninstall check.
        Remove-Item -LiteralPath $checkouts, "$HomeDir\.agents\local\projects" -Recurse -Force -ErrorAction SilentlyContinue
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

    Write-Host "== environment with $Mode"
    $envFile = "$repoCopy\tools\environments\smoke\claude\settings.json"
    $machineEnv = "$homeDir\.agents\local\environment"
    $settings = "$homeDir\.claude\settings.json"
    New-Item -ItemType Directory -Force -Path (Split-Path $envFile), (Split-Path $machineEnv) | Out-Null
    [System.IO.File]::WriteAllText($envFile, "{`"smoke`": `"environment`"}`n")
    [System.IO.File]::WriteAllText($machineEnv, "smoke`r`n")
    Test-That 'install with an environment succeeds' (Invoke-Install $repoCopy $homeDir)
    Test-That 'install with an environment moves nothing aside' (Test-NoBackup)
    Test-That "the environment's file replaces the default" ((Get-FileHash -LiteralPath $settings).Hash -eq (Get-FileHash -LiteralPath $envFile).Hash)
    [System.IO.File]::WriteAllText($machineEnv, "..\claude`n")
    Test-That 'install with an invalid environment name succeeds' (Invoke-Install $repoCopy $homeDir)
    Test-That 'an invalid environment name keeps the default' ((Get-FileHash -LiteralPath $settings).Hash -eq (Get-FileHash -LiteralPath "$repoCopy\tools\claude\settings.json").Hash)
    Test-That 'an invalid environment name prints a warning' ([bool]($Out -match '^warning: ignoring'))
    [System.IO.File]::WriteAllText($machineEnv, "smoke`n", (New-Object System.Text.UTF8Encoding $true))
    Test-That 'install with a BOM before the environment name succeeds' (Invoke-Install $repoCopy $homeDir)
    Test-That 'a BOM before the environment name is ignored' ((Get-FileHash -LiteralPath $settings).Hash -eq (Get-FileHash -LiteralPath $envFile).Hash)
    [System.IO.File]::WriteAllText($machineEnv, "nosuch`n")
    Test-That 'install with an unknown environment succeeds' (Invoke-Install $repoCopy $homeDir)
    Test-That 'an unknown environment prints a warning' ([bool]($Out -match "^warning: there's no tools/environments/nosuch"))
    Remove-Item -LiteralPath $machineEnv

    if ($Mode -eq 'links') { Test-Project $repoCopy $bin $homeDir }

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
