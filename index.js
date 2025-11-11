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
    const dataBuffer = Buffer.from(data, 'utf8');

    const options = {
      hostname: url.hostname,
      port: url.port || 443,
      path: url.pathname + url.search,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': dataBuffer.length
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
 * Get event-specific metadata including emoji, title, and default color
 * @param {string} eventName - GitHub event name
 * @param {object} payload - GitHub event payload
 * @returns {object} - Event metadata
 */
function getEventMetadata(eventName, payload) {
  const metadata = {
    push: {
      emoji: '📤',
      title: 'Push',
      description: 'Code pushed to repository',
      color: 0x0366d6 // Blue
    },
    pull_request: {
      emoji: '🔀',
      title: 'Pull Request',
      description: payload.action ? `PR ${payload.action}` : 'Pull Request event',
      color: 0x6f42c1 // Purple
    },
    pull_request_review: {
      emoji: '👀',
      title: 'PR Review',
      description: payload.review?.state ? `Review ${payload.review.state}` : 'Pull Request reviewed',
      color: 0x6f42c1 // Purple
    },
    release: {
      emoji: '🚀',
      title: 'Release',
      description: payload.action ? `Release ${payload.action}` : 'Release event',
      color: 0x17a2b8 // Cyan
    },
    issues: {
      emoji: '🐛',
      title: 'Issue',
      description: payload.action ? `Issue ${payload.action}` : 'Issue event',
      color: 0xfd7e14 // Orange
    },
    issue_comment: {
      emoji: '💬',
      title: 'Issue Comment',
      description: 'Comment on issue',
      color: 0xfd7e14 // Orange
    },
    workflow_dispatch: {
      emoji: '▶️',
      title: 'Manual Trigger',
      description: 'Workflow manually triggered',
      color: 0x0366d6 // Blue
    },
    schedule: {
      emoji: '⏰',
      title: 'Scheduled Run',
      description: 'Workflow triggered by schedule',
      color: 0x0366d6 // Blue
    },
    create: {
      emoji: '✨',
      title: 'Branch/Tag Created',
      description: payload.ref_type ? `${payload.ref_type} created` : 'Reference created',
      color: 0x28a745 // Green
    },
    delete: {
      emoji: '🗑️',
      title: 'Branch/Tag Deleted',
      description: payload.ref_type ? `${payload.ref_type} deleted` : 'Reference deleted',
      color: 0x6c757d // Gray
    },
    deployment: {
      emoji: '🚢',
      title: 'Deployment',
      description: 'Deployment event',
      color: 0x17a2b8 // Cyan
    },
    deployment_status: {
      emoji: '📊',
      title: 'Deployment Status',
      description: payload.deployment_status?.state ? `Deployment ${payload.deployment_status.state}` : 'Deployment status update',
      color: 0x17a2b8 // Cyan
    },
    workflow_run: {
      emoji: '🔄',
      title: 'Workflow Run',
      description: payload.action ? `Workflow ${payload.action}` : 'Workflow run event',
      color: 0x0366d6 // Blue
    }
  };

  return metadata[eventName] || {
    emoji: '🔔',
    title: eventName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
    description: 'GitHub event triggered',
    color: 0x0366d6 // Default blue
  };
}

/**
 * Get color and styling based on job status
 * @param {string} status - Job status (success, failure, cancelled)
 * @returns {object} - Status styling information
 */
function getStatusStyling(status) {
  const styling = {
    success: {
      color: 0x28a745, // Green
      emoji: '✅',
      label: 'Success'
    },
    failure: {
      color: 0xdc3545, // Red
      emoji: '❌',
      label: 'Failed'
    },
    cancelled: {
      color: 0x6c757d, // Gray
      emoji: '⚠️',
      label: 'Cancelled'
    },
    skipped: {
      color: 0xffc107, // Yellow
      emoji: '⏭️',
      label: 'Skipped'
    }
  };
  
  return styling[status.toLowerCase()] || styling.success;
}

/**
 * Build Discord embed from GitHub context
 * @param {object} context - GitHub context
 * @param {string} jobStatus - Job status (success, failure, cancelled, skipped)
 * @param {string} customTitle - Custom title
 * @param {string} customDescription - Custom description
 * @param {string} customColor - Custom color
 * @param {boolean} includeDetails - Whether to include detailed information
 * @returns {object} - Discord embed object
 */
function buildEmbed(context, jobStatus, customTitle, customDescription, customColor, includeDetails) {
  const { eventName, payload, workflow, runNumber, runId, actor, ref, sha } = context;
  const repository = payload.repository;
  const repoUrl = repository?.html_url || '';
  const repoName = repository?.full_name || 'Unknown Repository';
  const workflowName = workflow || 'GitHub Actions';
  const actorName = actor || 'Unknown';
  const refName = ref || 'Unknown';
  const commitSha = sha || 'Unknown';
  
  // Get event-specific metadata
  const eventMeta = getEventMetadata(eventName, payload);
  
  // Get status styling
  const statusStyle = getStatusStyling(jobStatus);
  
  // Determine color: custom > status-based > event-based
  let color;
  if (customColor) {
    color = parseInt(customColor, 16);
  } else if (jobStatus.toLowerCase() !== 'success') {
    // Use status color for failures/cancellations (more important)
    color = statusStyle.color;
  } else {
    // Use event color for successful runs
    color = eventMeta.color;
  }

  // Build title
  let title = customTitle;
  if (!title) {
    // For failures/errors, emphasize the status
    if (jobStatus.toLowerCase() !== 'success') {
      title = `${statusStyle.emoji} ${eventMeta.emoji} ${eventMeta.title} ${statusStyle.label}`;
    } else {
      title = `${eventMeta.emoji} ${eventMeta.title}`;
    }
  }

  // Build description
  let description = customDescription;
  if (!description) {
    if (jobStatus.toLowerCase() !== 'success') {
      description = `**${workflowName}** workflow ${statusStyle.label.toLowerCase()} • ${eventMeta.description}`;
    } else {
      description = `**${workflowName}** • ${eventMeta.description}`;
    }
  }

  // Build fields
  const fields = [];
  
  if (includeDetails) {
    if (repoUrl) {
      fields.push({
        name: '📦 Repository',
        value: `[${repoName}](${repoUrl})`,
        inline: true
      });
    } else {
      fields.push({
        name: '📦 Repository',
        value: repoName,
        inline: true
      });
    }

    fields.push({
      name: '🔀 Event',
      value: eventName,
      inline: true
    });

    fields.push({
      name: '👤 Actor',
      value: actorName,
      inline: true
    });

    fields.push({
      name: '🌿 Ref',
      value: refName.replace('refs/heads/', '').replace('refs/tags/', ''),
      inline: true
    });

    fields.push({
      name: '🔢 Run Number',
      value: `#${runNumber || 'N/A'}`,
      inline: true
    });

    if (commitSha !== 'Unknown' && repoUrl) {
      fields.push({
        name: '📝 Commit',
        value: `[${commitSha.substring(0, 7)}](${repoUrl}/commit/${commitSha})`,
        inline: true
      });
    } else if (commitSha !== 'Unknown') {
      fields.push({
        name: '📝 Commit',
        value: commitSha.substring(0, 7),
        inline: true
      });
    }

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
        .map(c => {
          const msg = c.message?.split('\n')[0] || 'No message';
          // Truncate long messages and escape special characters
          return `• ${msg.substring(0, 100)}`;
        })
        .join('\n');
      if (commitMessages) {
        fields.push({
          name: '📋 Recent Commits',
          value: commitMessages,
          inline: false
        });
      }
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
  if (runId && repoUrl) {
    const runUrl = `${repoUrl}/actions/runs/${runId}`;
    fields.push({
      name: '🔗 Workflow Run',
      value: `[View Details](${runUrl})`,
      inline: false
    });
  }

  // Validate and truncate fields to Discord limits
  const validatedFields = fields.map(field => ({
    name: field.name.substring(0, 256),
    value: field.value.substring(0, 1024),
    inline: field.inline
  }));

  return {
    title: title.substring(0, 256),
    description: description.substring(0, 4096),
    color,
    fields: validatedFields,
    timestamp: new Date().toISOString(),
    footer: {
      text: `GitHub Actions • ${workflowName}`.substring(0, 2048)
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
    const jobStatus = core.getInput('job-status') || 'success';
    const customTitle = core.getInput('title');
    const customDescription = core.getInput('description');
    const customColor = core.getInput('color');
    const includeDetails = core.getInput('include-details') === 'true';

    core.info('Starting Discord notification...');
    core.info(`Event: ${github.context.eventName}`);
    core.info(`Job Status: ${jobStatus}`);

    // Build embed
    const embed = buildEmbed(
      github.context,
      jobStatus,
      customTitle,
      customDescription,
      customColor,
      includeDetails
    );

    // Create payload
    const payload = {
      embeds: [embed]
    };

    // Debug: Log the payload
    core.info('Payload to be sent:');
    core.info(JSON.stringify(payload, null, 2));

    // Send to Discord
    await sendDiscordMessage(webhookUrl, payload);

    core.info('Discord notification completed successfully!');
  } catch (error) {
    core.setFailed(`Action failed: ${error.message}`);
  }
}

run();
