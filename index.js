const core = require('@actions/core');
const github = require('@actions/github');
const https = require('https');

/**
 * Send a message to Discord via webhook
 * @param {string} webhookUrl - Discord webhook URL
 * @param {object} payload - Discord message payload
 * @returns {Promise<void>}
 */
async function sendDiscordMessage(webhookUrl, payload) {
  return new Promise((resolve, reject) => {
    const url = new URL(webhookUrl);
    const data = JSON.stringify(payload);

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };

    const req = https.request(options, (res) => {
      let responseData = '';

      res.on('data', (chunk) => {
        responseData += chunk;
      });

      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          core.info(`Discord notification sent successfully. Status: ${res.statusCode}`);
          resolve();
        } else {
          reject(new Error(`Discord webhook returned status ${res.statusCode}: ${responseData}`));
        }
      });
    });

    req.on('error', (error) => {
      reject(error);
    });

    req.write(data);
    req.end();
  });
}

/**
 * Get color based on status
 * @param {string} status - Workflow status
 * @returns {number} - Color in decimal format
 */
function getColorForStatus(status) {
  const colors = {
    success: 0x28a745, // Green
    failure: 0xdc3545, // Red
    cancelled: 0x6c757d, // Gray
    skipped: 0xffc107 // Yellow
  };
  return colors[status.toLowerCase()] || 0x0366d6; // Default blue
}

/**
 * Build Discord embed from GitHub context
 * @param {object} context - GitHub context
 * @param {string} status - Workflow status
 * @param {string} customTitle - Custom title
 * @param {string} customDescription - Custom description
 * @param {string} customColor - Custom color
 * @param {boolean} includeDetails - Whether to include detailed information
 * @returns {object} - Discord embed object
 */
function buildEmbed(context, status, customTitle, customDescription, customColor, includeDetails) {
  const { eventName, payload, workflow, runNumber, runId, actor, ref, sha } = context;
  const repository = payload.repository;
  const repoUrl = repository ? repository.html_url : '';
  const repoName = repository ? repository.full_name : '';
  
  // Determine color
  let color;
  if (customColor) {
    color = parseInt(customColor, 16);
  } else {
    color = getColorForStatus(status);
  }

  // Build title
  let title = customTitle;
  if (!title) {
    const statusEmoji = {
      success: '✅',
      failure: '❌',
      cancelled: '⚠️',
      skipped: '⏭️'
    };
    const emoji = statusEmoji[status.toLowerCase()] || '🔔';
    title = `${emoji} Workflow ${status.charAt(0).toUpperCase() + status.slice(1)}`;
  }

  // Build description
  let description = customDescription || `Workflow **${workflow}** has ${status.toLowerCase()}`;

  // Build fields
  const fields = [];
  
  if (includeDetails) {
    fields.push({
      name: '📦 Repository',
      value: `[${repoName}](${repoUrl})`,
      inline: true
    });

    fields.push({
      name: '🔀 Event',
      value: eventName,
      inline: true
    });

    fields.push({
      name: '👤 Actor',
      value: actor,
      inline: true
    });

    fields.push({
      name: '🌿 Ref',
      value: ref.replace('refs/heads/', '').replace('refs/tags/', ''),
      inline: true
    });

    fields.push({
      name: '🔢 Run Number',
      value: `#${runNumber}`,
      inline: true
    });

    fields.push({
      name: '📝 Commit',
      value: `[\`${sha.substring(0, 7)}\`](${repoUrl}/commit/${sha})`,
      inline: true
    });

    // Add event-specific information
    if (eventName === 'pull_request' && payload.pull_request) {
      const pr = payload.pull_request;
      fields.push({
        name: '🔗 Pull Request',
        value: `[#${pr.number} - ${pr.title}](${pr.html_url})`,
        inline: false
      });
    }

    if (eventName === 'push' && payload.commits && payload.commits.length > 0) {
      const commitMessages = payload.commits
        .slice(0, 3)
        .map(c => `• ${c.message.split('\n')[0]}`)
        .join('\n');
      fields.push({
        name: '📋 Recent Commits',
        value: commitMessages || 'No commit messages',
        inline: false
      });
    }

    if (eventName === 'release' && payload.release) {
      const release = payload.release;
      fields.push({
        name: '🚀 Release',
        value: `[${release.tag_name} - ${release.name}](${release.html_url})`,
        inline: false
      });
    }

    if (eventName === 'issues' && payload.issue) {
      const issue = payload.issue;
      fields.push({
        name: '🐛 Issue',
        value: `[#${issue.number} - ${issue.title}](${issue.html_url})`,
        inline: false
      });
    }
  }

  // Add workflow run link
  const runUrl = `${repoUrl}/actions/runs/${runId}`;
  fields.push({
    name: '🔗 Workflow Run',
    value: `[View Details](${runUrl})`,
    inline: false
  });

  return {
    title,
    description,
    color,
    fields,
    timestamp: new Date().toISOString(),
    footer: {
      text: `GitHub Actions • ${workflow}`
    }
  };
}

/**
 * Main action execution
 */
async function run() {
  try {
    // Get inputs
    const webhookUrl = core.getInput('webhook-url', { required: true });
    const status = core.getInput('status') || 'success';
    const customTitle = core.getInput('title');
    const customDescription = core.getInput('description');
    const customColor = core.getInput('color');
    const includeDetails = core.getInput('include-details') === 'true';

    core.info('Starting Discord notification...');
    core.info(`Event: ${github.context.eventName}`);
    core.info(`Status: ${status}`);

    // Build embed
    const embed = buildEmbed(
      github.context,
      status,
      customTitle,
      customDescription,
      customColor,
      includeDetails
    );

    // Create payload
    const payload = {
      embeds: [embed]
    };

    // Send to Discord
    await sendDiscordMessage(webhookUrl, payload);

    core.info('Discord notification completed successfully!');
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
