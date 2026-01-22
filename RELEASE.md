# Release guide (manual)

Releases are manual and run via the **Release (manual)** GitHub Actions workflow. The flow uses **Changesets** to generate changelogs and version bumps, and publishes `pi-sub-core`, `pi-sub-bar`, and `pi-sub-shared` in lockstep.

## Requirements

- `NPM_TOKEN` secret in GitHub (publish token for `pi-sub-core`, `pi-sub-bar`, `pi-sub-shared`).
- Maintainership access to trigger workflows.

## Release

### npm token (GitHub Actions)

1. Generate an npm **Automation** token at https://www.npmjs.com/settings/<your-user>/tokens (or run `npm token create --automation`).
2. Add it to GitHub → **Settings** → **Secrets and variables** → **Actions** → **New repository secret**.
   - Name: `NPM_TOKEN`
   - Value: `<your token>`

## Standard release flow

1. **Create a changeset** for your changes:
   ```bash
   npm run changeset
   ```
   Select the packages and specify the change type (patch/minor/major) + summary.

2. **Commit and push** the generated `.changeset/*.md` file(s) to `main`.

3. **Run the workflow**: Actions → **Release (manual)** → Run workflow (branch: `main`).
   - This creates a **version bump PR** with changelog updates.

4. **Merge** the version bump PR.

5. **Run the workflow again** (same as step 3).
   - This publishes to npm and creates **GitHub Releases** (with changelog notes).

## Test behavior

The workflow runs `npm run check` and `npm run test` first, but the publish step proceeds **even if tests fail**. Always review the test job output before approving a release.

## Notes

- The workflow only runs on `main` (`workflow_dispatch` + branch check).
- Versions are locked across packages via Changesets `fixed` groups.
- GitHub Releases are created automatically by the workflow (`gh release create --generate-notes`).
