# Obsidian GitLab Wiki Integration

Sync and manage GitLab wiki repositories directly inside Obsidian.

This plugin helps you keep documentation in GitLab Wiki and edit it from your vault, with file status indicators and one-click repository sync.

## Key Features

- Connect one or more GitLab repositories from plugin settings.
- Clone each repo wiki into `Gitlab_Repositories/<repo-name>` inside your vault.
- Show file change status in the File Explorer (`M`, `C`, `D`).
- Add a quick sync action for repositories in the explorer.
- Pull when clean, or add/commit/push when changes are present.

## Installation

### Community Plugins (after approval)

1. Open **Settings → Community plugins** in Obsidian.
2. Disable Safe mode (if required).
3. Search for **Obsidian GitLab Wiki Integration**.
4. Install and enable the plugin.

### Manual Installation

1. Download `main.js`, `manifest.json`, and `styles.css` from the latest GitHub release.
2. Create: `.obsidian/plugins/obsidian-gitlab-wiki-integration/` in your vault.
3. Copy the three files into that folder.
4. Reload Obsidian and enable the plugin in **Community plugins**.

## Usage

1. Open plugin settings.
2. Add one or more GitLab repository URLs.
3. Use the sync button next to a repository in the file explorer.
4. Edit markdown files in `Gitlab_Repositories/<repo-name>/`.
5. Sync again to push your changes.

## Configuration

- **Gitlab Repository URL**: Add repository URLs one by one.
- **Add repository**: Create additional repository entries.
- **Remove repository**: Delete an existing configured repository.
- **Sync repository**: Clone/update the selected repo wiki.

## Screenshots

_Placeholder: add screenshots for settings UI, file status badges, and sync button in explorer._

## Development

- Install dependencies: `npm install`
- Build once: `npm run build`
- Watch mode: `npm run dev`
