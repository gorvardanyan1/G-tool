import express from 'express';
import https from 'https';
import http from 'http';
import { URL } from 'url';

const router = express.Router();

// POST /api/api-tester/proxy
router.post('/proxy', async (req, res) => {
  try {
    const { url, method = 'GET', headers = {}, body, bodyType = 'none' } = req.body;

    if (!url) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'URL is required'
      });
    }

    // Validate URL
    let targetUrl;
    try {
      targetUrl = new URL(url);
    } catch (e) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Invalid URL format'
      });
    }

    const startTime = Date.now();

    // Prepare request body based on type
    let requestBody = null;
    let contentType = headers['Content-Type'] || headers['content-type'];

    if (method !== 'GET' && method !== 'HEAD' && body) {
      switch (bodyType) {
        case 'json':
          requestBody = typeof body === 'string' ? body : JSON.stringify(body);
          contentType = contentType || 'application/json';
          break;
        case 'urlencoded':
          if (typeof body === 'object' && body !== null) {
            requestBody = new URLSearchParams(body).toString();
          } else {
            requestBody = body;
          }
          contentType = contentType || 'application/x-www-form-urlencoded';
          break;
        case 'raw':
          requestBody = body;
          break;
        default:
          requestBody = body;
      }
    }

    // Prepare headers (filter out host and content-length)
    const requestHeaders = {};
    for (const [key, value] of Object.entries(headers)) {
      const lowerKey = key.toLowerCase();
      if (lowerKey !== 'host' && lowerKey !== 'content-length' && lowerKey !== 'connection') {
        requestHeaders[key] = value;
      }
    }

    if (contentType && !requestHeaders['Content-Type'] && !requestHeaders['content-type']) {
      requestHeaders['Content-Type'] = contentType;
    }

    // Make the request
    const client = targetUrl.protocol === 'https:' ? https : http;
    
    const options = {
      hostname: targetUrl.hostname,
      port: targetUrl.port || (targetUrl.protocol === 'https:' ? 443 : 80),
      path: targetUrl.pathname + targetUrl.search,
      method: method.toUpperCase(),
      headers: requestHeaders,
      timeout: 30000
    };

    const proxyReq = client.request(options, (proxyRes) => {
      let responseBody = '';
      
      proxyRes.on('data', (chunk) => {
        responseBody += chunk;
      });

      proxyRes.on('end', () => {
        const endTime = Date.now();
        const responseTime = endTime - startTime;

        // Parse response headers
        const responseHeaders = {};
        for (const [key, value] of Object.entries(proxyRes.headers)) {
          responseHeaders[key] = value;
        }

        // Try to parse JSON response
        let parsedBody = responseBody;
        const contentTypeHeader = proxyRes.headers['content-type'] || '';
        if (contentTypeHeader.includes('application/json')) {
          try {
            parsedBody = JSON.parse(responseBody);
          } catch (e) {
            // Keep as string if parse fails
          }
        }

        res.json({
          success: true,
          data: {
            status: proxyRes.statusCode,
            statusText: proxyRes.statusMessage,
            headers: responseHeaders,
            body: parsedBody,
            rawBody: responseBody,
            responseTime,
            size: Buffer.byteLength(responseBody)
          },
          error: null
        });
      });
    });

    proxyReq.on('error', (error) => {
      res.status(500).json({
        success: false,
        data: null,
        error: `Request failed: ${error.message}`
      });
    });

    proxyReq.on('timeout', () => {
      proxyReq.destroy();
      res.status(504).json({
        success: false,
        data: null,
        error: 'Request timeout'
      });
    });

    if (requestBody) {
      proxyReq.write(requestBody);
    }

    proxyReq.end();

  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message || 'Internal server error'
    });
  }
});

export default router;
