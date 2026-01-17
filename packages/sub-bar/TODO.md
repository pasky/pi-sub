# TODO

## Provider Authentication

- [ ] Ensure providers check pi's auth.json (`~/.pi/agent/auth.json`) before their legacy locations
  - Similar to the Codex provider fix, other providers should prioritize pi's centralized auth file
  - Providers:
    - [x] Anthropic (check `anthropic.access` in pi's auth.json before keychain)
    - [x] GitHub Copilot (check `github-copilot.access` in pi's auth.json, fallback to legacy hosts.json)
    - [ ] OpenRouter (check for `openrouter.key` in pi's auth.json when provider is added)
  - Maintain backward compatibility with existing auth locations

## UI

- [x] Use visibleWidth() to measure and truncateToWidth() to truncate lines

## Monorepo

- [ ] Start with lockstep versions for sub-core + sub-bar; consider independent versions after event contract stabilizes
- [ ] Publish a shared `sub-shared` package immediately (types + event contract)
- [ ] Publish packages to npm under `pi-sub-*` names while keeping extension/command names as `sub-*`
- [ ] Add GitHub Actions publish workflow (lockstep versions, npm publish with NPM_TOKEN)
- [ ] Document that users install only pi-sub-core/pi-sub-bar; pi-sub-shared is a dependency installed by npm
