# Driving a terminal program

Read at step 3 of the qa process when the program is a CLI or terminal UI.

Run the program in a detached tmux session, so you type into it and read its screen the way a user at a terminal does. A one-shot command that reads no keys can run straight from the shell; tmux is for anything that prompts, redraws the screen or runs until stopped.

First check `command -v tmux`, `command -v perl` and `command -v sh`. A missing one blocks terminal QA; name it in the output.

## The driver

Drive it with `scripts/tui.sh`, bundled with this skill. Start each shell call that uses it with:

```sh
export TMUX_TMPDIR="$DIR"; unset TMUX; tui() { sh <this skill's directory>/scripts/tui.sh "$@"; }
```

then run `tui <command> qa-<name> ...`. `TMUX_TMPDIR` gives the run a private tmux server, so another session's `kill-server` can't stop it mid-run; clearing `TMUX` makes raw `tmux` calls use that server too. The script refuses to run without `TMUX_TMPDIR`. The function works in bash and zsh, and calls the script through `sh` because an installed copy can lose its execute bit.

- **Start** at a fixed size, so the layout stays the same between captures. Run every scenario twice, big and small, since a layout that fits one can wrap, truncate or overlap in the other: `tui start qa-<name> 215 60 env HOME=$DIR/home PATH=$DIR/bin:$PATH PROGRAM`, then a fresh session at `80 24`. A fail at either size fails the scenario. Judge the fit by the right edge: each frame's right border and each row's last word show in full. `tui` prints icons as `[U+XXXX]`, which widens the row, so judge width on `tmux capture-pane -p -t qa-<name>`. `start` keeps the pane after the program exits, so its last screen and exit status stay readable.
- **Type** with `tui keys qa-<name> KEY...`: text, or a key name such as `Enter`, `Up`, `Down`, `Tab`, `Escape`, `BSpace`, `C-c`. Send text that could read as a key name (a path, the word `Enter`) with `-l '<text>'`: the argument after `-l` is literal. `tui keys` escapes a trailing `;`; a raw `tmux send-keys` needs it written as `'\;'`.
- **Press and read:** for a key whose result draws at once (a move, a scroll), use `tui press qa-<name> KEY...`. It prints the screen once it stops changing, so no `sleep` is needed. It exits 1 on a screen that keeps changing, such as a clock: read that one with `tui wait`.
- **Wait and read** after every slow step (startup, a sync, a save) with `tui wait qa-<name> '<expected text>' [SECONDS]`. It polls until the text shows and prints the screen, or exits 1 with the last screen once the limit (10 seconds by default) passes or the program exits. Never use a fixed `sleep` instead. Pick text that fits on one screen line. `tui gone qa-<name> '<text>' [SECONDS]` waits for text to disappear. `tui show qa-<name>` prints the screen without waiting. When color matters, `tui colors qa-<name>` prints each run as `ROW COLOR "TEXT"` (`#rrggbb`, a palette index like `c3`, or `default`, plus `+bold`). Use `tmux capture-pane -p -S - -t qa-<name>` for the scrollback.
- **Exit status:** `tmux display -p -t qa-<name> '#{pane_dead_status}'` once the program exits.
- **Stop** with `tui stop qa-<name>`.

## Unhappy paths a terminal program adds

- An error exits non-zero and prints its message to stderr.
- `C-c` midway exits cleanly and leaves the terminal usable. Run this one in a plain shell so the shell comes back to show it: `tmux new-session -d -s qa-<name> -x 215 -y 60`, write `exec env HOME=$DIR/home "PATH=$DIR/bin:$PATH" PROGRAM` to `$DIR/run.sh`, and type `sh $DIR/run.sh` with `tmux send-keys`. The environment goes in the script because the login shell rebuilds `PATH`.
- Output piped into `cat` (not a TTY) has no color codes and no prompts.
- A terminal UI redraws when the window shrinks mid-run: start big, then `tui resize qa-<name> 80 24`, which prints the screen once the redraw settles.
- Text pasted as well as typed, when the change reads text: write it to `$DIR/paste.txt`, then `tmux load-buffer -b qa $DIR/paste.txt` and `tmux paste-buffer -p -d -b qa -t qa-<name>` (`-p` uses bracketed paste when the program asks for it). Include a newline in the text: a pasted newline often submits early or breaks the redraw.
- Two instances against the same `$DIR/home` when the change writes shared state: a config file, a database, a lock.
