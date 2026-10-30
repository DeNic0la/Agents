# Driving a web app

Read at step 3 of the qa process when the program is a web app.

Use a browser tool the session already has: a browser-automation server (DevTools or Playwright based), a browser extension, or the host's own. Keep the same driver for follow-ups unless it lacks a capability a check needs; then use another available driver for that check and name the driver on each result. Use the tool's own commands; write a scratch driver only when repeated actions need something the tool lacks. When the repo already depends on Playwright or Cypress, a scratch script in `$DIR` that uses it works too. With no usable driver, every browser scenario is **blocked**: name the tool to connect, and QA the rest.

- **Start** with a driver preflight: check that it can open an isolated profile. Reuse a supplied preview only after verifying that its process serves this worktree and renders the current change; a URL that answers isn't enough. Otherwise start your own dev server in the background, wait until its URL answers, and confirm the browser opens it. Keep working startup commands and temporary config paths in `$DIR` for follow-ups. A failed preflight blocks browser scenarios until its cause is fixed; don't repeat the same launch unchanged. Use an isolated profile where the tool has one. A driver that controls the user's own signed-in browser can't run a scenario that would act on a real account: that scenario is **blocked**.
- **Temporary Vite config:** when a scratch TypeScript config sits outside the project's `"type": "module"` scope, use `.mts` and explicit extensions for local imports. Add only the canonical paths of the project and the shared dependency directories it needs to `server.fs.allow`.
- **Qualify** the driver before running scenarios. For viewport checks, read back the page's actual viewport size after resizing; a resize command that succeeded proves nothing. For request checks, confirm you can read the network log. A missing capability blocks the checks that need it.
- **Act** through the page as a user does: click, type, pick options, submit, go back, reload. Find elements from the page's accessibility snapshot, and take a screenshot to see the layout. Reach every state through the page: running script in the page is for diagnosing a fail, and a state set up or read by script proves nothing about the UI. A native `alert` or `confirm` blocks the page until answered: answer it with the tool's dialog handling, or mark the scenario **blocked** when the tool has none.
- **Wait** after each action for the text the scenario expects before judging the page, and screenshot short-lived UI, such as a toast, as soon as the wait returns.
- **Check** after each action: the expected text and state, the console for errors, and the network log for failed requests.
- **Capture** a screenshot of each visual result into `$DIR`, so the output can cite it and a pull request can show it.
- **Stop** by closing the tabs you opened and stopping only the server you started. A caller-supplied preview is the caller's to clean up.

## Unhappy paths a web app adds

- A form submitted empty, with invalid values, and twice in a row.
- A reload or the back button midway through a flow.
- The flow done by keyboard alone: Tab through it, Enter to submit.
- A narrow viewport (375 px) when the change touches layout, and the dark color scheme when it touches styling (the tool's media or device emulation).
- Each loading and error state the change adds, forced through the tool: a slow or offline network, a request answered with a 500.
- The same record edited in two tabs.
