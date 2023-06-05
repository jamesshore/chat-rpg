import { assert, test } from "../util/tests.js";
import { HttpClient } from "./http_client.js";
import * as http from "node:http";
import * as net from "net";

const PORT = 5011;

const DEFAULT_FETCH_REQUEST_HEADERS = {
  "host": `localhost:${PORT}`,
  "connection": "keep-alive",
  "content-type": "text/plain;charset=UTF-8",
  "accept": "*/*",
  "accept-language": "*",
  "sec-fetch-mode": "cors",
  "user-agent": "undici",
  "accept-encoding": "gzip, deflate"
};

export default test(({ describe, it, beforeAll, beforeEach, afterAll }) => {
  let server: SpyServer;

  beforeAll(async () => {
    server = new SpyServer();
    await server.startAsync();
  });

  beforeEach(() => {
    server.reset();
  });

  afterAll(async () => {
    await server.stopAsync();
  });

  it("makes HTTP request", async () => {
    const client = new HttpClient();
    await client.requestAsync({
      url: `http://localhost:${PORT}/my-path`,
      method: "post",
      headers: {
        "my-header": "my-value",
      },
      body: "my_request_body",
    });

    assert.deepEqual(server.lastRequest, {
      path: "/my-path",
      method: "POST",
      headers: {
        "my-header": "my-value",
        ...DEFAULT_FETCH_REQUEST_HEADERS,
        "content-length": "15",
      },
      body: "my_request_body",
    });
  });

  it("headers and body are optional", async () => {
    const client = new HttpClient();
    await client.requestAsync({
      url: `http://localhost:${PORT}/my-path`,
      method: "post",
    });

    assert.deepEqual(server.lastRequest, {
      path: "/my-path",
      method: "POST",
      headers: {
        ...DEFAULT_FETCH_REQUEST_HEADERS,
        "content-length": "0",
      },
      body: "",
    });
  });

  it("receives HTTP response", async () => {
    server.setResponse({
      status: 201,
      headers: {
        myResponseHeader: "header-value",
      },
      body: "my_response_body",
    });

    const client = new HttpClient();
    const response = await client.requestAsync({
      url: `http://localhost:${PORT}/irrelevant_path`,
      method: "post",
      headers: {},
      body: "",
    });

    delete response.headers.date;
    assert.deepEqual(response, {
      status: 201,
      headers: {
        "myresponseheader": "header-value",
        // default server headers
        "connection": "keep-alive",
        "keep-alive": "timeout=5",
        "content-length": "16",
      },
      body: "my_response_body",
    });
  });

});


interface SpyServerRequest {
  path?: string,
  method?: string,
  headers: http.IncomingHttpHeaders,
  body: string,
}

interface SpyServerResponse {
  status: number,
  headers: Record<string, string>,
  body: string,
}

class SpyServer {

  private readonly _httpServer;
  private _lastRequest!: null | SpyServerRequest;
  private _nextResponse!: SpyServerResponse;
  private _connections: net.Socket[] = [];

  constructor() {
    this._httpServer = http.createServer();
    this.reset();
  }

  reset() {
    this._lastRequest = null;
    this.setResponse();
  }

  get lastRequest() {
    return this._lastRequest;
  }

  setResponse(response = {
    status: 501,
    headers: {},
    body: ""
  }) {
    this._nextResponse = response;
  }

  async startAsync() {
    await new Promise<void>((resolve, reject) => {
      this._httpServer.listen(PORT);
      this._httpServer.on("listening", () => {
        resolve();
      });
      this._httpServer.on("connection", (socket: net.Socket) => {
        this._connections.push(socket);
      });
      this._httpServer.on("request", (request: http.IncomingMessage, response: http.ServerResponse) => {
        let body = "";
        request.on("data", (chunk: Buffer) => {
          body += chunk;
        });

        request.on("end", () => {
          this._lastRequest = {
            path: request.url,
            method: request.method,
            headers: request.headers,
            body,
          };

          response.statusCode = this._nextResponse.status;
          Object.entries(this._nextResponse.headers).forEach(([ key, value ]) => {
            response.setHeader(key, value);
          });
          response.end(this._nextResponse.body);
        });
      });
    });
  }

  async stopAsync() {
    await new Promise<void>((resolve, reject) => {
      this._httpServer.close();
      this._connections.forEach((socket) => {
        socket.destroy();
      });
      this._httpServer.on("close", () => {
        resolve();
      });
    });
  }

}
