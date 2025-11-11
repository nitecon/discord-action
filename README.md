# Discord Webhook Action

A GitHub Action to send detailed event information to Discord via webhooks. This action provides rich, formatted notifications about your GitHub workflows, including repository information, event details, commits, pull requests, and more.

## Features

- 🎨 Rich Discord embeds with color-coded status
- 📦 Detailed repository and workflow information
- 🔀 Event-specific details (PR, push, release, issues, etc.)
- ⚙️ Customizable title, description, and colors
- 🔒 Secure webhook URL handling via secrets
- 📝 Automatic commit and actor information
- 🔗 Direct links to workflow runs, commits, and PRs

## Usage

### Basic Usage

Add this action to your workflow and provide your Discord webhook URL as a secret:

```yaml
name: Discord Notification
on: [push, pull_request]

jobs:
  notify:
    runs-on: ubuntu-latest
    steps:
      - name: Send Discord notification
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
```

### Notify on Workflow Success or Failure

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
      
      - name: Notify Discord on success
        if: success()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          status: success
      
      - name: Notify Discord on failure
        if: failure()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          status: failure
```

### Custom Title and Description

```yaml
- name: Custom Discord notification
  uses: Nitecon/discord-action@v1
  with:
    webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
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

## Inputs

| Input | Description | Required | Default |
|-------|-------------|----------|---------|
| `webhook-url` | Discord webhook URL (use `secrets.DISCORD_WEBHOOK`) | Yes | - |
| `status` | Status of the workflow (`success`, `failure`, `cancelled`) | No | `success` |
| `title` | Custom title for the Discord message | No | Auto-generated |
| `description` | Custom description for the Discord message | No | Auto-generated |
| `color` | Custom embed color (hex format without #, e.g., `00ff00`) | No | Status-based |
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

## Event-Specific Information

The action automatically includes relevant information based on the GitHub event type:

- **Push events**: Recent commit messages
- **Pull Request events**: PR number, title, and link
- **Release events**: Release tag, name, and link
- **Issue events**: Issue number, title, and link

## Color Codes

Status-based colors:
- Success: Green (`28a745`)
- Failure: Red (`dc3545`)
- Cancelled: Gray (`6c757d`)
- Skipped: Yellow (`ffc107`)

You can override with custom colors using the `color` input.

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
      
      - name: Notify Discord on success
        if: success()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          status: success
          title: '✅ Build & Test Successful'
          description: 'All tests passed and build completed successfully'
      
      - name: Notify Discord on failure
        if: failure()
        uses: Nitecon/discord-action@v1
        with:
          webhook-url: ${{ secrets.DISCORD_WEBHOOK }}
          status: failure
          title: '❌ Build & Test Failed'
          description: 'Please check the workflow logs for details'
```

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
