# Notion Integration

This document describes how the Notion integration works in Notion Lite.

## Overview

The Notion integration allows users to embed private Notion pages directly into their editor blocks without needing to publish the pages publicly. It uses the Notion API to fetch content securely using the user's own API key.

## Setup Process

1. **Create a Notion Integration:**
   - Go to https://www.notion.so/my-integrations
   - Click "New integration"
   - Give it a name (e.g., "My Notion Lite")
   - Select your workspace
   - Copy the "Internal Integration Token"

2. **Configure in Notion Lite:**
   - Go to Settings → Notion Integration
   - Paste your API key
   - Test the connection
   - Save settings

3. **Share Pages with Integration:**
   - Go to any Notion page you want to embed
   - Click "Share" → "Invite"
   - Select your integration
   - Grant access

## Usage

1. **Paste Notion URL:**
   - Create a new block in your editor
   - Paste any Notion page URL
   - The page will automatically be detected and rendered

2. **Supported URL Formats:**
   - `https://www.notion.so/workspace/page-id`
   - `https://www.notion.so/page-id`
   - `https://notion.so/page-id`
   - Custom domains: `https://custom.notion.site/page-id`

3. **Display Features:**
   - Page title and icon
   - Cover image (if present)
   - Expandable content preview
   - Last edited date
   - Direct link to open in Notion

## Technical Architecture

### Components

- **`NotionEmbed`**: Main React component for displaying Notion content
- **`NotionService`**: Service class for Notion API interactions
- **`notionDetection`**: Utilities for detecting and parsing Notion URLs
- **API Route**: `/api/notion/[pageId]` for server-side content fetching

### Security

- API keys are stored securely in Firebase per user
- All requests are authenticated and user-specific
- No API keys are exposed to the client
- Content is fetched server-side when possible

### Supported Block Types

- Headings (H1, H2, H3)
- Paragraphs
- Lists (bulleted, numbered, todo)
- Quotes
- Code blocks
- Images
- Dividers
- Callouts

## Error Handling

The integration handles various error scenarios:

- **API Not Configured**: Shows setup instructions
- **Invalid URL**: Displays URL parsing error
- **Permission Denied**: Indicates page not shared with integration
- **Page Not Found**: Shows 404 error with helpful context
- **Network Issues**: Displays connection error with retry option

## Performance

- **Lazy Loading**: Content is fetched only when needed
- **Caching**: API responses are cached to reduce API calls
- **Optimized Rendering**: Large pages show preview with option to expand

## Limitations

- Requires Notion API integration setup
- Pages must be explicitly shared with the integration
- Some advanced Notion blocks may not render perfectly
- API rate limits apply (Notion's standard limits)

## Troubleshooting

### Common Issues

1. **"API Not Configured"**
   - Go to Settings → Notion Integration
   - Add your API key and test connection

2. **"Permission Denied"**
   - Share the page with your integration in Notion
   - Check that the integration has the right permissions

3. **"Failed to Load"**
   - Verify the URL is correct
   - Check your internet connection
   - Ensure the page exists and is accessible

### Support

For issues with the Notion integration, check:
1. Browser console for detailed error messages
2. Network tab for API request failures
3. Notion workspace integration settings
4. Page sharing permissions

## Future Enhancements

Potential improvements for future versions:

- Real-time sync with Notion changes
- Support for database views
- Inline editing capabilities
- Advanced block type support
- Bulk page import
- Template synchronization