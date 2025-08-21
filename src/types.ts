export interface HAREntry {
  startedDateTime: string;
  time: number;
  request: {
    method: string;
    url: string;
    httpVersion: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    queryString: Array<{
      name: string;
      value: string;
    }>;
    cookies: Array<{
      name: string;
      value: string;
    }>;
    headersSize: number;
    bodySize: number;
    postData?: {
      mimeType: string;
      text: string;
      params?: Array<{
        name: string;
        value: string;
      }>;
    };
  };
  response: {
    status: number;
    statusText: string;
    httpVersion: string;
    headers: Array<{
      name: string;
      value: string;
    }>;
    cookies: Array<{
      name: string;
      value: string;
    }>;
    content: {
      size: number;
      mimeType: string;
      text?: string;
      encoding?: string;
    };
    redirectURL: string;
    headersSize: number;
    bodySize: number;
  };
  cache: {
    beforeRequest?: any;
    afterRequest?: any;
  };
  timings: {
    blocked: number;
    dns: number;
    connect: number;
    send: number;
    wait: number;
    receive: number;
    ssl: number;
  };
  serverIPAddress?: string;
  connection?: string;
  comment?: string;
}

export interface HARFile {
  log: {
    version: string;
    creator: {
      name: string;
      version: string;
    };
    browser?: {
      name: string;
      version: string;
    };
    pages?: Array<{
      startedDateTime: string;
      id: string;
      title: string;
      pageTimings: {
        onContentLoad: number;
        onLoad: number;
        comment?: string;
      };
    }>;
    entries: HAREntry[];
    comment?: string;
  };
}

export interface LLMRequest {
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: string;
  contentType?: string;
}

export interface LLMResponse {
  status: number;
  statusText: string;
  headers: Record<string, string>;
  body?: string;
  contentType?: string;
}

export interface LLMConversation {
  request: LLMRequest;
  response: LLMResponse;
  timestamp: string;
  duration: number;
}

export interface RequestSignature {
  method: string;
  url: string;
  headers: Record<string, string>;
  queryParams: Record<string, string>;
  body?: string;
}
