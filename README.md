# Discord Webhook Action

A GitHub Action to send detailed event information to Discord via webhooks. This action automatically detects the event type and job status to provide rich, contextual notifications with appropriate styling and links.

## Features

- 🎨 **Auto-styled notifications** - Automatically applies colors and emojis based on event type and job status
- 🔴 **Red borders for failures** - Failed jobs get red embeds with error indicators and workflow links
- 🟢 **Green borders for success** - Successful jobs get event-specific colors (green for pushes, purple for PRs, etc.)
- 🔀 **Event-aware messaging** - Customized titles and descriptions for each GitHub event type
- 📦 **Detailed context** - Repository info, commits, PR details, release info, and more
- 🔒 **Secure** - Webhook URL handling via GitHub secrets
- 🔗 **Direct links** - Quick access to workflow runs, commits, PRs, and issues

## Supported Events

The action intelligently handles all GitHub events including:
- **Push** (📤 Blue) - Code pushes with commit details
- **Pull Request** (🔀 Purple) - PR opened, closed, merged, etc.
- **Release** (🚀 Cyan) - Release published, created, edited
- **Issues** (🐛 Orange) - Issue opened, closed, labeled, etc.
- **Deployments** (🚢 Cyan) - Deployment events and status
- **Workflow Dispatch** (▶️ Blue) - Manual workflow triggers
- **Schedule** (⏰ Blue) - Scheduled workflow runs
- And many more...

## Usage

### Simplest Usage - Auto-detect Everything

The action automatically detects the event type and uses `success` as the default status:

```yaml
name: Notify Discord
on: [push, pull_request, release]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send Discord notification
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
```

### Recommended - Single Notification with Job Status

Use `if: always()` and pass `${{ job.status }}` to get a single notification regardless of outcome:

```yaml
name: CI
on: [push]

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - name: Checkout code
        uses: actions/checkout@v4
      
      - name: Run tests
        run: npm test
      
      - name: Notify Discord
        if: always()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          job-status: ${{ job.status }}
```

This will automatically:
- Show **red embed with ❌** if tests fail
- Show **green/blue embed with ✅** if tests pass
- Include a link to view the workflow run

### Custom Title and Description

Override the auto-generated title and description:

```yaml
- name: Custom Discord notification
  if: always()
  uses: Nitecon/discord-action@v1
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    job-status: ${{ job.status }}
    title: '🚀 Deployment Complete'
    description: 'Application has been deployed to production'
    color: '00ff00'
```

### Minimal Notification (Without Details)

```yaml
- name: Simple Discord notification
  uses: Nitecon/discord-action@v1
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
    include-details: false
    title: 'Build completed'
```

### Pull Request Notifications

Automatically styled with purple border and PR details:

```yaml
name: PR Notification
on: [pull_request]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Notify Discord
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
```

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `webhook-url` | Discord webhook URL (use `secrets.DISCORD_WEBHOOK`) | Yes | - |
| `job-status` | Job status from context (use `${{ job.status }}`). Auto-detects if not provided. | No | `success` |
| `title` | Custom title for the Discord message (overrides auto-generated) | No | Auto-generated |
| `description` | Custom description for the Discord message (overrides auto-generated) | No | Auto-generated |
| `color` | Custom embed color (hex format without #, e.g., `00ff00`). Overrides auto-detected color. | No | Event/status-based |
| `include-details` | Include detailed event information (`true`/`false`) | No | `true` |

## Setting Up Discord Webhook

1. Open your Discord server settings
2. Go to **Integrations** → **Webhooks**
3. Click **New Webhook** or select an existing webhook
4. Customize the webhook name and channel
5. Click **Copy Webhook URL**
6. In your GitHub repository, go to **Settings** → **Secrets and variables** → **Actions**
7. Click **New repository secret**
8. Name it `DISCORD_WEBHOOK` and paste the webhook URL
9. Click **Add secret**

**Security Note:** Always use GitHub secrets to store your Discord webhook URL. Never hardcode the webhook URL in your workflow files or commit it to your repository, as this would expose your webhook to unauthorized access.

## Event-Specific Information

The action automatically includes relevant information based on the GitHub event type:

- **Push events**: Recent commit messages and commit links
- **Pull Request events**: PR number, title, and direct link to the PR
- **Release events**: Release tag, name, and link
- **Issue events**: Issue number, title, and link
- **Deployment events**: Deployment status and environment

## Color Logic

The action intelligently chooses colors based on context:

**Job Status Colors** (takes priority for non-success):
- ❌ **Failure**: Red (`dc3545`) - Highly visible for errors
- ⚠️ **Cancelled**: Gray (`6c757d`)
- ⏭️ **Skipped**: Yellow (`ffc107`)

**Event Type Colors** (used for successful runs):
- 📤 **Push**: Blue (`0366d6`)
- 🔀 **Pull Request**: Purple (`6f42c1`)
- 🚀 **Release**: Cyan (`17a2b8`)
- 🐛 **Issues**: Orange (`fd7e14`)
- ✅ **Success**: Green (`28a745`)

You can override any color using the `color` input.

## Examples

### Complete CI/CD Workflow

```yaml
name: CI/CD Pipeline
on:
  push:
    branches: [main, develop]
  pull_request:
    branches: [main]

jobs:
  build-and-test:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      
      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '20'
      
      - name: Install dependencies
        run: npm ci
      
      - name: Run tests
        run: npm test
      
      - name: Build
        run: npm run build
      
      # Single notification that handles success/failure automatically
      - name: Notify Discord
        if: always()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          job-status: ${{ job.status }}
```

**What this does:**
- ✅ **Success**: Shows green/blue embed with event-specific styling
- ❌ **Failure**: Shows red embed with error indicators and workflow link
- 🔀 **Pull Request**: Automatically includes PR number, title, and link
- 📤 **Push**: Shows commit messages and commit links

### Main Branch Activity Notifications

Monitor all activity on your main branch with automatic Discord notifications:

```yaml
name: Main Branch Notifications

on:
  push:
    branches:
      - main
  pull_request:
    branches:
      - main
    types: [opened, closed, reopened, synchronize]
  release:
    types: [published, created, edited]
  issues:
    types: [opened, closed, reopened]
  workflow_dispatch:

jobs:
  notify-discord:
    runs-on: ubuntu-latest
    steps:
      - name: Send Discord Notification
        if: always()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          job-status: ${{ job.status }}
```

**This workflow notifies on:**
- 📤 **Pushes to main**: Commit messages and links
- 🔀 **Pull Requests**: PR opened, closed, merged, or updated
- 🚀 **Releases**: New releases published or edited
- 🐛 **Issues**: Issues opened, closed, or reopened
- ▶️ **Manual Triggers**: Workflow dispatch events

Each notification is automatically styled with the appropriate color and emoji based on the event type.

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
