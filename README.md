# MTA:SA Script Engineer

<div align="center">
    <img src="images/icon.png" alt="MTA:SA Script Engineer Logo" width="128" height="128">
    <br>
    <br>
    <a href="https://marketplace.visualstudio.com/items?itemName=MTAScriptEngineer.mta-script-engineer">
        <img src="https://img.shields.io/visual-studio-marketplace/v/MTAScriptEngineer.mta-script-engineer?color=orange&label=VS%20Code%20Marketplace" alt="Version">
    </a>
    <a href="https://marketplace.visualstudio.com/items?itemName=MTAScriptEngineer.mta-script-engineer">
        <img src="https://img.shields.io/visual-studio-marketplace/i/MTAScriptEngineer.mta-script-engineer?color=blue&label=Installs" alt="Installs">
    </a>
</div>

<br>

**MTA:SA Script Engineer** is a VSCode Extension the ultimate toolkit for Multi Theft Auto developers. It supercharges your workflow by providing intelligent autocompletion for `exports`, instant "Go to Definition" navigation, and essential code snippets—all designed to keep you in the flow state.

No more checking `meta.xml` manually. No more guessing function arguments.

---

## 🚀 Features

### 1. Intelligent Export Autocompletion
Automatically finds exported functions from any resource in your workspace.
* **Trigger:** Type `exports.resourceName:` or `exports['resourceName']:`
* **Smart Parsing:** Reads the target resource's `meta.xml` and Lua files to find function names *and* their arguments.
* **Performance:** Uses smart caching to ensure instant results, even in large projects.

### 2. Go to Definition (Ctrl + Click)
Navigate through your project with ease.
* Hold **Ctrl** (or Cmd) and click on any exported function name (e.g., `exports.admin:ban`).
* Instantly jumps to the exact file and line number where the function is defined in the source resource.

### 3. Productivity Snippets
Write boilerplate code in milliseconds.
* **`addcommandhandlerclient`** → Generates a full client-side command handler.
* **`addcommandhandlerserver`** → Generates a server-side handler with `player` and `command` arguments.
* **`addeventhandler`** → Scaffold a handler for any event name and target element.
* **`initevent`** → Register a custom event and attach its handler.
* **`triggerclientevent` / `triggerserverevent`** → Quickly emit events between client and server.
* **`cx` / `cxformat` / `cxx` / `cxxformat`** → Output chat messages (server/client) with optional formatting.
* **`dbquery` / `dbqueryowl`** → Async database query templates (generic and OwlGaming).
* **`exports`** → Call another resource's exported function.
* **`format`** → String formatting helper.

Example (server command handler):

```lua
-- type: addcommandhandlerserver
addCommandHandler("heal", function (thePlayer, commandName, target)
    if not target then
        outputChatBox("Usage: /heal <player>", thePlayer, 255, 100, 100)
        return
    end
    -- your logic here
end)
```

---

## 📸 Usage

### Autocompletion
Just type the export syntax, and the suggestion list will appear instantly.

```lua
-- Type this:
exports.admin:

-- Result:
exports.admin:ban(player, reason)
exports.admin:mute(player, duration)
