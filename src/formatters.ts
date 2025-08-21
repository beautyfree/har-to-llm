import { LLMConversation, HAREntry } from './types';
import { HARConverter } from './converter';

export class Formatters {
  /**
   * Format as markdown for easy reading
   */
  static toMarkdown(conversations: LLMConversation[]): string {
    let output = '# HTTP Conversations\n\n';
    
    conversations.forEach((conv, index) => {
      output += `## Request ${index + 1}\n\n`;
      output += `**Timestamp:** ${conv.timestamp}\n`;
      output += `**Duration:** ${conv.duration}ms\n\n`;
      
      // Request details
      output += `### Request\n`;
      output += `**Method:** ${conv.request.method}\n`;
      output += `**URL:** ${conv.request.url}\n\n`;
      
      if (Object.keys(conv.request.headers).length > 0) {
        output += `**Headers:**\n`;
        Object.entries(conv.request.headers).forEach(([key, value]) => {
          output += `- ${key}: ${value}\n`;
        });
        output += '\n';
      }
      
      if (Object.keys(conv.request.queryParams).length > 0) {
        output += `**Query Parameters:**\n`;
        Object.entries(conv.request.queryParams).forEach(([key, value]) => {
          output += `- ${key}: ${value}\n`;
        });
        output += '\n';
      }
      
      if (conv.request.body) {
        output += `**Body:**\n\`\`\`\n${conv.request.body}\n\`\`\`\n\n`;
      }
      
      // Response details
      output += `### Response\n`;
      output += `**Status:** ${conv.response.status} ${conv.response.statusText}\n\n`;
      
      if (Object.keys(conv.response.headers).length > 0) {
        output += `**Headers:**\n`;
        Object.entries(conv.response.headers).forEach(([key, value]) => {
          output += `- ${key}: ${value}\n`;
        });
        output += '\n';
      }
      
      if (conv.response.body) {
        output += `**Body:**\n\`\`\`\n${conv.response.body}\n\`\`\`\n\n`;
      }
      
      output += '---\n\n';
    });
    
    return output;
  }

  /**
   * Format as JSON for programmatic use
   */
  static toJSON(conversations: LLMConversation[]): string {
    return JSON.stringify(conversations, null, 2);
  }

  /**
   * Format as a simple text summary
   */
  static toTextSummary(conversations: LLMConversation[]): string {
    let output = `HTTP Conversations Summary\n`;
    output += `Total requests: ${conversations.length}\n\n`;
    
    conversations.forEach((conv, index) => {
      output += `${index + 1}. ${conv.request.method} ${conv.request.url} - ${conv.response.status} (${conv.duration}ms)\n`;
    });
    
    return output;
  }

  /**
   * Format as curl commands
   */
  static toCurlCommands(conversations: LLMConversation[]): string {
    let output = '# cURL Commands\n\n';
    
    conversations.forEach((conv, index) => {
      output += `## Request ${index + 1}\n`;
      output += `# ${conv.request.method} ${conv.request.url}\n`;
      
      let curl = `curl -X ${conv.request.method}`;
      
      // Add headers
      Object.entries(conv.request.headers).forEach(([key, value]) => {
        if (key !== 'host' && key !== 'content-length') { // Skip some headers
          curl += ` -H "${key}: ${value}"`;
        }
      });
      
      // Add body if present
      if (conv.request.body) {
        curl += ` -d '${conv.request.body.replace(/'/g, "\\'")}'`;
      }
      
      curl += ` "${conv.request.url}"`;
      
      output += `${curl}\n\n`;
    });
    
    return output;
  }

  /**
   * Format as a conversation log for LLM training
   */
  static toConversationLog(conversations: LLMConversation[]): string {
    let output = '# API Conversation Log\n\n';
    
    conversations.forEach((conv, index) => {
      output += `## Exchange ${index + 1}\n\n`;
      
      // Human (request)
      output += `**Human:** I need to make a ${conv.request.method} request to ${conv.request.url}`;
      if (conv.request.body) {
        output += ` with the following data: ${conv.request.body}`;
      }
      output += '\n\n';
      
      // Assistant (response)
      output += `**Assistant:** The server responded with status ${conv.response.status} (${conv.response.statusText})`;
      if (conv.response.body) {
        output += ` and returned: ${conv.response.body}`;
      }
      output += '\n\n';
    });
    
    return output;
  }

  /**
   * Format as structured data for analysis
   */
  static toStructuredData(entries: HAREntry[]): string {
    const summary = HARConverter.generateSummary(entries);
    const conversations = entries.map(entry => HARConverter.convertEntry(entry));
    
    const structuredData = {
      summary,
      conversations: conversations.map(conv => ({
        timestamp: conv.timestamp,
        method: conv.request.method,
        url: conv.request.url,
        status: conv.response.status,
        duration: conv.duration,
        hasBody: !!conv.request.body,
        hasResponseBody: !!conv.response.body,
        contentType: conv.request.contentType,
        responseContentType: conv.response.contentType
      }))
    };
    
    return JSON.stringify(structuredData, null, 2);
  }
}
