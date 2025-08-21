import { HAREntry, LLMRequest, LLMResponse, LLMConversation, RequestSignature } from './types';

export class HARConverter {
  /**
   * Convert a single HAR entry to LLM conversation format
   */
  static convertEntry(entry: HAREntry): LLMConversation {
    const request = this.convertRequest(entry.request);
    const response = this.convertResponse(entry.response);
    
    return {
      request,
      response,
      timestamp: entry.startedDateTime,
      duration: entry.time
    };
  }

  /**
   * Convert HAR request to LLM request format
   */
  private static convertRequest(harRequest: HAREntry['request']): LLMRequest {
    // Convert headers array to object and filter out useless headers
    const headers: Record<string, string> = {};
    harRequest.headers.forEach(header => {
      const key = header.name.toLowerCase();
      if (!this.isUselessHeader(key)) {
        headers[key] = header.value;
      }
    });

    // Convert query string array to object
    const queryParams: Record<string, string> = {};
    harRequest.queryString.forEach(param => {
      queryParams[param.name] = param.value;
    });

    // Extract body and content type
    let body: string | undefined;
    let contentType: string | undefined;

    if (harRequest.postData) {
      body = harRequest.postData.text;
      contentType = harRequest.postData.mimeType;
    }

    return {
      method: harRequest.method,
      url: harRequest.url,
      headers,
      queryParams,
      body,
      contentType
    };
  }

  /**
   * Convert HAR response to LLM response format
   */
  private static convertResponse(harResponse: HAREntry['response']): LLMResponse {
    // Convert headers array to object and filter out useless headers
    const headers: Record<string, string> = {};
    harResponse.headers.forEach(header => {
      const key = header.name.toLowerCase();
      if (!this.isUselessHeader(key)) {
        headers[key] = header.value;
      }
    });

    // Extract body and content type
    let body: string | undefined;
    let contentType: string | undefined;

    if (harResponse.content && harResponse.content.text) {
      body = harResponse.content.text;
      contentType = harResponse.content.mimeType;
      
      // Clean JSON body by removing redundant array elements
      if (contentType && contentType.includes('json')) {
        try {
          const jsonBody = JSON.parse(body);
          const cleanedJson = this.normalizeJsonStructure(jsonBody);
          body = JSON.stringify(cleanedJson, null, 2);
        } catch {
          // If parsing fails, keep original body
        }
      }
    }

    return {
      status: harResponse.status,
      statusText: harResponse.statusText,
      headers,
      body,
      contentType
    };
  }

  /**
   * Check if a header is useless for API implementation
   */
  private static isUselessHeader(headerName: string): boolean {
    const uselessHeaders = [
      // Browser-specific headers
      'user-agent',
      'accept',
      'accept-language',
      'accept-encoding',
      'cache-control',
      'pragma',
      'upgrade-insecure-requests',
      'sec-fetch-dest',
      'sec-fetch-mode',
      'sec-fetch-site',
      'sec-fetch-user',
      'sec-ch-ua',
      'sec-ch-ua-mobile',
      'sec-ch-ua-platform',
      
      // Network and timing headers
      'connection',
      'keep-alive',
      'transfer-encoding',
      'content-encoding',
      'content-length',
      'date',
      'server',
      'via',
      'x-powered-by',
      'x-aspnet-version',
      'x-aspnetmvc-version',
      
      // Caching headers
      'etag',
      'last-modified',
      'if-modified-since',
      'if-none-match',
      'if-match',
      'if-unmodified-since',
      
      // Security headers (usually set by server)
      'x-frame-options',
      'x-content-type-options',
      'x-xss-protection',
      'strict-transport-security',
      'content-security-policy',
      'referrer-policy',
      
      // Analytics and tracking
      'x-forwarded-for',
      'x-real-ip',
      'x-forwarded-proto',
      'x-forwarded-host',
      'x-forwarded-port',
      'x-requested-with',
      
      // CDN and proxy headers
      'cf-ray',
      'cf-cache-status',
      'cf-request-id',
      'x-cache',
      'x-cache-hit',
      'x-amz-cf-id',
      'x-amz-cf-pop',
      
      // Other browser-generated headers
      'origin',
      'referer',
      'dnt',
      'save-data',
      'viewport-width',
      'device-memory',
      'downlink',
      'ect',
      'rtt',
      'save-data'
    ];

    return uselessHeaders.includes(headerName);
  }

  /**
   * Create a semantic signature for LLM training deduplication
   */
  private static createSemanticSignature(entry: HAREntry): RequestSignature {
    const request = this.convertRequest(entry.request);
    
    // Create a semantic signature that focuses on request patterns
    return {
      method: request.method,
      url: request.url,
      headers: request.headers,
      queryParams: request.queryParams,
      body: request.body
    };
  }

  /**
   * Check if two requests are semantically similar for LLM training
   */
  private static areRequestsSemanticallySimilar(sig1: RequestSignature, sig2: RequestSignature): boolean {
    // Different methods are always different patterns
    if (sig1.method !== sig2.method) {
      return false;
    }

    // Different URL patterns are different (but ignore IDs)
    const url1 = this.normalizeUrl(sig1.url);
    const url2 = this.normalizeUrl(sig2.url);
    if (url1 !== url2) {
      return false;
    }

    // Different query parameter patterns are different
    if (!this.areQueryParamsSimilar(sig1.queryParams, sig2.queryParams)) {
      return false;
    }

    // Different body structures are different
    if (!this.areBodiesSimilar(sig1.body, sig2.body)) {
      return false;
    }

    // Headers should be similar (same authentication, content-type, etc.)
    if (!this.areHeadersSimilar(sig1.headers, sig2.headers)) {
      return false;
    }

    return true;
  }

  /**
   * Normalize JSON structure by simplifying arrays with duplicate element structures
   */
  private static normalizeJsonStructure(obj: any): any {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return obj;
      
      // For arrays, keep only unique element structures
      const uniqueStructures: any[] = [];
      const seenStructureKeys = new Set<string>();
      
      for (const element of obj) {
        const normalizedElement = this.normalizeJsonStructure(element);
        const structureKey = this.getStructureKey(normalizedElement);
        
        if (!seenStructureKeys.has(structureKey)) {
          seenStructureKeys.add(structureKey);
          uniqueStructures.push(normalizedElement);
        }
      }
      
      return uniqueStructures;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const normalized: any = {};
      for (const [key, value] of Object.entries(obj)) {
        normalized[key] = this.normalizeJsonStructure(value);
      }
      return normalized;
    }
    
    return obj;
  }

  /**
   * Get a structure key for an object (ignoring values, only structure)
   */
  private static getStructureKey(obj: any): string {
    if (Array.isArray(obj)) {
      if (obj.length === 0) return '[]';
      return `[${this.getStructureKey(obj[0])}]`;
    }
    
    if (typeof obj === 'object' && obj !== null) {
      const keys = Object.keys(obj).sort();
      return `{${keys.join(',')}}`;
    }
    
    return typeof obj;
  }

  /**
   * Check if two responses have semantically similar JSON structures
   */
  private static areResponsesSemanticallySimilar(entry1: HAREntry, entry2: HAREntry): boolean {
    const response1 = entry1.response;
    const response2 = entry2.response;

    // Different status codes are different patterns
    if (response1.status !== response2.status) {
      return false;
    }

    // Check if both have JSON responses
    const hasJson1 = response1.content && response1.content.mimeType && response1.content.mimeType.includes('json');
    const hasJson2 = response2.content && response2.content.mimeType && response2.content.mimeType.includes('json');

    // If one has JSON and other doesn't, they're different
    if (hasJson1 !== hasJson2) {
      return false;
    }

    // If both have JSON, compare normalized structures
    if (hasJson1 && hasJson2) {
      try {
        const json1 = JSON.parse(response1.content.text || '{}');
        const json2 = JSON.parse(response2.content.text || '{}');
        
        // Normalize both JSON structures before comparison
        const normalized1 = this.normalizeJsonStructure(json1);
        const normalized2 = this.normalizeJsonStructure(json2);
        
        return this.areJsonStructuresSimilar(normalized1, normalized2);
      } catch {
        // If parsing fails, compare as strings
        return response1.content.text === response2.content.text;
      }
    }

    // For non-JSON responses, compare as strings
    return response1.content.text === response2.content.text;
  }

  /**
   * Normalize URL by replacing IDs with placeholders
   */
  private static normalizeUrl(url: string): string {
    // Replace numeric IDs with {id}
    let normalized = url.replace(/\/\d+(\/|$)/g, '/{id}$1');
    
    // Replace UUIDs with {uuid}
    normalized = normalized.replace(/\/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(\/|$)/gi, '/{uuid}$1');
    
    // Replace other common ID patterns
    normalized = normalized.replace(/\/[a-zA-Z0-9]{24}(\/|$)/g, '/{objectId}$1'); // MongoDB ObjectId
    normalized = normalized.replace(/\/[a-zA-Z0-9]{32}(\/|$)/g, '/{hash}$1'); // MD5-like hashes
    
    return normalized;
  }

  /**
   * Check if query parameters are semantically similar
   */
  private static areQueryParamsSimilar(params1: Record<string, string>, params2: Record<string, string>): boolean {
    const keys1 = Object.keys(params1).sort();
    const keys2 = Object.keys(params2).sort();
    
    // Different parameter sets are different patterns
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    // Check if parameter names match (values can be different)
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Check if request bodies are semantically similar
   */
  private static areBodiesSimilar(body1?: string, body2?: string): boolean {
    // Both null/undefined
    if (!body1 && !body2) {
      return true;
    }
    
    // One has body, other doesn't
    if (!body1 || !body2) {
      return false;
    }
    
    try {
      // Try to parse as JSON and compare structure
      const json1 = JSON.parse(body1);
      const json2 = JSON.parse(body2);
      
      return this.areJsonStructuresSimilar(json1, json2);
    } catch {
      // If not JSON, compare as strings
      return body1 === body2;
    }
  }

  /**
   * Check if JSON structures are similar (same keys, different values)
   */
  private static areJsonStructuresSimilar(obj1: any, obj2: any): boolean {
    if (typeof obj1 !== typeof obj2) {
      return false;
    }
    
    if (Array.isArray(obj1) !== Array.isArray(obj2)) {
      return false;
    }
    
    if (Array.isArray(obj1)) {
      // For arrays, check if they have the same structure of elements
      // Length can be different, but element structure should be the same
      if (obj1.length === 0 && obj2.length === 0) {
        return true;
      }
      
      if (obj1.length === 0 || obj2.length === 0) {
        return false;
      }
      
      // Check first element structure to determine array type
      const firstElement1 = obj1[0];
      const firstElement2 = obj2[0];
      
      return this.areJsonStructuresSimilar(firstElement1, firstElement2);
    }
    
    if (typeof obj1 === 'object' && obj1 !== null) {
      const keys1 = Object.keys(obj1).sort();
      const keys2 = Object.keys(obj2).sort();
      
      if (keys1.length !== keys2.length) {
        return false;
      }
      
      for (let i = 0; i < keys1.length; i++) {
        if (keys1[i] !== keys2[i]) {
          return false;
        }
      }
      
      // Recursively check nested object structures
      for (const key of keys1) {
        if (!this.areJsonStructuresSimilar(obj1[key], obj2[key])) {
          return false;
        }
      }
      
      return true;
    }
    
    // For primitives, consider them similar (values can be different)
    return true;
  }

  /**
   * Check if headers are semantically similar
   */
  private static areHeadersSimilar(headers1: Record<string, string>, headers2: Record<string, string>): boolean {
    const keys1 = Object.keys(headers1).sort();
    const keys2 = Object.keys(headers2).sort();
    
    // Different header sets are different patterns
    if (keys1.length !== keys2.length) {
      return false;
    }
    
    // Check if header names match (values can be different for most headers)
    for (let i = 0; i < keys1.length; i++) {
      if (keys1[i] !== keys2[i]) {
        return false;
      }
    }
    
    return true;
  }

  /**
   * Create a signature for exact request deduplication
   */
  private static createRequestSignature(entry: HAREntry): RequestSignature {
    const request = this.convertRequest(entry.request);
    
    // Create a normalized signature for exact comparison
    return {
      method: request.method,
      url: request.url,
      headers: request.headers,
      queryParams: request.queryParams,
      body: request.body
    };
  }

  /**
   * Check if two request signatures are exactly equal
   */
  private static areRequestsEqual(sig1: RequestSignature, sig2: RequestSignature): boolean {
    // Compare basic properties
    if (sig1.method !== sig2.method || sig1.url !== sig2.url) {
      return false;
    }

    // Compare query parameters
    const queryKeys1 = Object.keys(sig1.queryParams).sort();
    const queryKeys2 = Object.keys(sig2.queryParams).sort();
    
    if (queryKeys1.length !== queryKeys2.length) {
      return false;
    }
    
    for (const key of queryKeys1) {
      if (sig1.queryParams[key] !== sig2.queryParams[key]) {
        return false;
      }
    }

    // Compare headers (excluding dynamic headers like timestamps, user-agent variations)
    const staticHeaders1 = this.getStaticHeaders(sig1.headers);
    const staticHeaders2 = this.getStaticHeaders(sig2.headers);
    
    const headerKeys1 = Object.keys(staticHeaders1).sort();
    const headerKeys2 = Object.keys(staticHeaders2).sort();
    
    if (headerKeys1.length !== headerKeys2.length) {
      return false;
    }
    
    for (const key of headerKeys1) {
      if (staticHeaders1[key] !== staticHeaders2[key]) {
        return false;
      }
    }

    // Compare body
    if (sig1.body !== sig2.body) {
      return false;
    }

    return true;
  }

  /**
   * Get static headers for comparison (exclude dynamic ones)
   */
  private static getStaticHeaders(headers: Record<string, string>): Record<string, string> {
    const staticHeaders: Record<string, string> = {};
    const dynamicHeaders = [
      'user-agent', 'date', 'if-modified-since', 'if-none-match', 
      'cache-control', 'pragma', 'expires', 'last-modified', 'etag',
      'x-requested-with', 'x-forwarded-for', 'x-real-ip'
    ];

    for (const [key, value] of Object.entries(headers)) {
      if (!dynamicHeaders.includes(key.toLowerCase())) {
        staticHeaders[key] = value;
      }
    }

    return staticHeaders;
  }

  /**
   * Remove semantically similar requests for LLM training (including JSON response deduplication)
   * Only deduplicate if both request AND response are similar
   */
  static deduplicateEntries(entries: HAREntry[]): HAREntry[] {
    const deduplicated: HAREntry[] = [];

    for (const entry of entries) {
      let shouldAdd = true;
      
      // Check if we already have an entry with similar request AND response structure
      for (const existingEntry of deduplicated) {
        const requestsSimilar = this.areRequestsSemanticallySimilar(
          this.createSemanticSignature(entry), 
          this.createSemanticSignature(existingEntry)
        );
        const responsesSimilar = this.areResponsesSemanticallySimilar(entry, existingEntry);
        
        // Only deduplicate if BOTH request AND response are similar
        if (requestsSimilar && responsesSimilar) {
          shouldAdd = false;
          break;
        }
      }
      
      if (shouldAdd) {
        deduplicated.push(entry);
      }
    }

    return deduplicated;
  }

  /**
   * Remove exact duplicate requests
   */
  static removeExactDuplicates(entries: HAREntry[]): HAREntry[] {
    const seen: RequestSignature[] = [];
    const deduplicated: HAREntry[] = [];

    for (const entry of entries) {
      const signature = this.createRequestSignature(entry);
      const isDuplicate = seen.some(seenSig => this.areRequestsEqual(signature, seenSig));

      if (!isDuplicate) {
        seen.push(signature);
        deduplicated.push(entry);
      }
    }

    return deduplicated;
  }

  /**
   * Filter entries based on criteria
   */
  static filterEntries(entries: HAREntry[], options: {
    methods?: string[];
    statusCodes?: number[];
    domains?: string[];
    excludeDomains?: string[];
    minDuration?: number;
    maxDuration?: number;
    deduplicate?: boolean;
  } = {}): HAREntry[] {
    let filteredEntries = entries;

    // Apply deduplication first if requested
    if (options.deduplicate !== false) { // Default to true
      filteredEntries = this.deduplicateEntries(filteredEntries);
    }

    return filteredEntries.filter(entry => {
      // Filter by HTTP method
      if (options.methods && !options.methods.includes(entry.request.method)) {
        return false;
      }

      // Filter by status code
      if (options.statusCodes && !options.statusCodes.includes(entry.response.status)) {
        return false;
      }

      // Filter by domain
      const url = new URL(entry.request.url);
      const domain = url.hostname;
      
      if (options.domains && !options.domains.some(d => domain.includes(d))) {
        return false;
      }

      if (options.excludeDomains && options.excludeDomains.some(d => domain.includes(d))) {
        return false;
      }

      // Filter by duration
      if (options.minDuration && entry.time < options.minDuration) {
        return false;
      }

      if (options.maxDuration && entry.time > options.maxDuration) {
        return false;
      }

      return true;
    });
  }

  /**
   * Generate a summary of the HAR file
   */
  static generateSummary(entries: HAREntry[]): {
    totalRequests: number;
    methods: Record<string, number>;
    statusCodes: Record<string, number>;
    domains: Record<string, number>;
    averageDuration: number;
    totalDuration: number;
  } {
    const methods: Record<string, number> = {};
    const statusCodes: Record<string, number> = {};
    const domains: Record<string, number> = {};
    let totalDuration = 0;

    entries.forEach(entry => {
      // Count methods
      const method = entry.request.method;
      methods[method] = (methods[method] || 0) + 1;

      // Count status codes
      const statusCode = entry.response.status.toString();
      statusCodes[statusCode] = (statusCodes[statusCode] || 0) + 1;

      // Count domains
      const url = new URL(entry.request.url);
      const domain = url.hostname;
      domains[domain] = (domains[domain] || 0) + 1;

      // Sum duration
      totalDuration += entry.time;
    });

    return {
      totalRequests: entries.length,
      methods,
      statusCodes,
      domains,
      averageDuration: entries.length > 0 ? totalDuration / entries.length : 0,
      totalDuration
    };
  }
}
