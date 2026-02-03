---
"@marckrenn/pi-sub-core": patch
"@marckrenn/pi-sub-bar": patch
---

Store sub-core and sub-bar settings in agent-level JSON files so updates no longer overwrite user configuration. Legacy extension `settings.json` files are migrated into the new files and removed after a successful migration.

Manual migration (if you want to do it yourself before updating):
```
cp ~/.pi/agent/extensions/sub-core/settings.json ~/.pi/agent/pi-sub-core-settings.json
cp ~/.pi/agent/extensions/sub-bar/settings.json ~/.pi/agent/pi-sub-bar-settings.json
```

Existing users should move legacy settings from the extension folders to:
- `~/.pi/agent/pi-sub-core-settings.json`
- `~/.pi/agent/pi-sub-bar-settings.json`
