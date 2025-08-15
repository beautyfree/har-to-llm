# har-to-llm

A command-line tool and library for converting HAR (HTTP Archive) files to LLM-friendly formats.

## Installation

```bash
npm install -g har-to-llm
```

Or use with npx:

```bash
npx har-to-llm ./file.har
```

## Usage

### Basic Usage

```bash
# Convert HAR file to markdown format (default)
har-to-llm ./file.har

# Convert to JSON format
har-to-llm ./file.har --format json

# Save output to file
har-to-llm ./file.har --output output.md
```

### Filtering Options

```bash
# Filter by HTTP methods
har-to-llm ./file.har --methods GET,POST

# Filter by status codes
har-to-llm ./file.har --status 200,201,404

# Filter by domains
har-to-llm ./file.har --domains api.example.com,api.github.com

# Exclude domains
har-to-llm ./file.har --exclude-domains google-analytics.com,facebook.com

# Filter by request duration
har-to-llm ./file.har --min-duration 100 --max-duration 5000
```

### Output Formats

- **markdown** (default): Human-readable markdown format
- **json**: Structured JSON data
- **text**: Simple text summary
- **curl**: cURL commands for replaying requests
- **conversation**: Conversation format for LLM training
- **structured**: Detailed structured data with summary

### Examples

```bash
# Get only successful API calls in JSON format
har-to-llm ./file.har --format json --status 200,201,204 --methods GET,POST,PUT,DELETE

# Generate cURL commands for debugging
har-to-llm ./file.har --format curl --output commands.sh

# Create conversation log for LLM training
har-to-llm ./file.har --format conversation --output training-data.md

# Show summary only
har-to-llm ./file.har --summary

# Verbose output with filtering
har-to-llm ./file.har --verbose --domains api.example.com --min-duration 500
```

## Programmatic Usage

```typescript
import { HARConverter, Formatters } from 'har-to-llm';
import * as fs from 'fs';

// Read HAR file
const harContent = fs.readFileSync('./file.har', 'utf8');
const harData = JSON.parse(harContent);

// Convert entries
const conversations = harData.log.entries.map(entry => 
  HARConverter.convertEntry(entry)
);

// Filter entries
const filteredEntries = HARConverter.filterEntries(harData.log.entries, {
  methods: ['GET', 'POST'],
  statusCodes: [200, 201],
  domains: ['api.example.com']
});

// Generate different formats
const markdown = Formatters.toMarkdown(conversations);
const json = Formatters.toJSON(conversations);
const curl = Formatters.toCurlCommands(conversations);

// Get summary
const summary = HARConverter.generateSummary(harData.log.entries);
```

## Output Formats

### Markdown Format
```markdown
# HTTP Conversations

## Request 1

**Timestamp:** 2023-12-01T10:30:00.000Z
**Duration:** 150ms

### Request
**Method:** GET
**URL:** https://api.example.com/users

**Headers:**
- authorization: Bearer token123
- content-type: application/json

### Response
**Status:** 200 OK

**Headers:**
- content-type: application/json
- cache-control: no-cache

**Body:**
```json
{
  "users": [...]
}
```
```

### JSON Format
```json
[
  {
    "request": {
      "method": "GET",
      "url": "https://api.example.com/users",
      "headers": {
        "authorization": "Bearer token123",
        "content-type": "application/json"
      },
      "queryParams": {},
      "body": null,
      "contentType": null
    },
    "response": {
      "status": 200,
      "statusText": "OK",
      "headers": {
        "content-type": "application/json"
      },
      "body": "{\"users\":[...]}",
      "contentType": "application/json"
    },
    "timestamp": "2023-12-01T10:30:00.000Z",
    "duration": 150
  }
]
```

### cURL Format
```bash
# GET https://api.example.com/users
curl -X GET -H "authorization: Bearer token123" -H "content-type: application/json" "https://api.example.com/users"
```

## Features

- ✅ Convert HAR files to multiple LLM-friendly formats
- ✅ Filter requests by method, status code, domain, and duration
- ✅ Generate cURL commands for request replay
- ✅ Create conversation logs for LLM training
- ✅ Provide detailed summaries and statistics
- ✅ Support for both CLI and programmatic usage
- ✅ TypeScript support with full type definitions

## Requirements

- Node.js 16.0.0 or higher

## License

MIT

## Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Add tests if applicable
5. Submit a pull request

## Changelog

### 1.0.0
- Initial release
- Support for multiple output formats
- Filtering capabilities
- CLI and programmatic APIs
