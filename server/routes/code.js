import express from 'express';
import CryptoJS from 'crypto-js';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import yaml from 'js-yaml';
import xml2js from 'xml2js';
import msgpack from 'msgpack-lite';
import csv from 'csv-parser';

const router = express.Router();

// Encryption/Decryption endpoints
router.post('/encrypt', (req, res) => {
  try {
    const { text, algorithm, key } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!algorithm) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Algorithm is required'
      });
    }

    let result;

    switch (algorithm) {
      case 'aes':
        if (!key) {
          return res.status(400).json({
            success: false,
            data: null,
            error: 'Key is required for AES encryption'
          });
        }
        result = CryptoJS.AES.encrypt(text, key).toString();
        break;
      case 'base64':
        result = Buffer.from(text).toString('base64');
        break;
      case 'url':
        result = encodeURIComponent(text);
        break;
      case 'caesar':
        const shift = parseInt(key) || 3;
        result = text.replace(/[a-zA-Z]/g, char => {
          const start = char <= 'Z' ? 65 : 97;
          return String.fromCharCode(((char.charCodeAt(0) - start + shift) % 26) + start);
        });
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      case 'rot13':
        result = text.replace(/[a-zA-Z]/g, char => {
          const start = char <= 'Z' ? 65 : 97;
          return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unknown encryption algorithm'
        });
    }

    res.json({
      success: true,
      data: { original: text, encrypted: result, algorithm },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

router.post('/decrypt', (req, res) => {
  try {
    const { text, algorithm, key } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!algorithm) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Algorithm is required'
      });
    }

    let result;

    switch (algorithm) {
      case 'aes':
        if (!key) {
          return res.status(400).json({
            success: false,
            data: null,
            error: 'Key is required for AES decryption'
          });
        }
        const bytes = CryptoJS.AES.decrypt(text, key);
        result = bytes.toString(CryptoJS.enc.Utf8);
        break;
      case 'base64':
        result = Buffer.from(text, 'base64').toString('utf-8');
        break;
      case 'url':
        result = decodeURIComponent(text);
        break;
      case 'caesar':
        const shift = parseInt(key) || 3;
        result = text.replace(/[a-zA-Z]/g, char => {
          const start = char <= 'Z' ? 65 : 97;
          return String.fromCharCode(((char.charCodeAt(0) - start - shift + 26) % 26) + start);
        });
        break;
      case 'reverse':
        result = text.split('').reverse().join('');
        break;
      case 'rot13':
        result = text.replace(/[a-zA-Z]/g, char => {
          const start = char <= 'Z' ? 65 : 97;
          return String.fromCharCode(((char.charCodeAt(0) - start + 13) % 26) + start);
        });
        break;
      default:
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unknown decryption algorithm'
        });
    }

    res.json({
      success: true,
      data: { original: text, decrypted: result, algorithm },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// Password hashing endpoints
router.post('/hash', (req, res) => {
  try {
    const { text, algorithm, rounds } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!algorithm) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Algorithm is required'
      });
    }

    let result;
    let saltRounds = parseInt(rounds) || 10;

    switch (algorithm) {
      case 'bcrypt':
        result = bcrypt.hashSync(text, saltRounds);
        break;
      case 'php':
        // PHP password_hash equivalent using bcrypt with PHP-compatible settings
        result = bcrypt.hashSync(text, saltRounds);
        break;
      case 'sha256':
        result = CryptoJS.SHA256(text).toString();
        break;
      case 'sha512':
        result = CryptoJS.SHA512(text).toString();
        break;
      case 'md5':
        result = CryptoJS.MD5(text).toString();
        break;
      default:
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unknown hashing algorithm'
        });
    }

    // Language examples
    const examples = {
      javascript: {
        bcrypt: `const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('${text}', ${saltRounds});`,
        php: `const bcrypt = require('bcryptjs');
const hash = bcrypt.hashSync('${text}', ${saltRounds}); // PHP compatible`,
        sha256: `const crypto = require('crypto');
const hash = crypto.createHash('sha256').update('${text}').digest('hex');`,
        md5: `const crypto = require('crypto');
const hash = crypto.createHash('md5').update('${text}').digest('hex');`
      },
      php: {
        bcrypt: `<?php
$hash = password_hash('${text}', PASSWORD_BCRYPT, ['cost' => ${saltRounds}]);`,
        php: `<?php
$hash = password_hash('${text}', PASSWORD_BCRYPT, ['cost' => ${saltRounds}]); // Native PHP`,
        sha256: `<?php
$hash = hash('sha256', '${text}');`,
        md5: `<?php
$hash = md5('${text}');`
      },
      python: {
        bcrypt: `import bcrypt
hash = bcrypt.hashpw('${text}'.encode(), bcrypt.gensalt(rounds=${saltRounds}))`,
        php: `import bcrypt
hash = bcrypt.hashpw('${text}'.encode(), bcrypt.gensalt(rounds=${saltRounds})) # PHP compatible`,
        sha256: `import hashlib
hash = hashlib.sha256('${text}'.encode()).hexdigest()`,
        md5: `import hashlib
hash = hashlib.md5('${text}'.encode()).hexdigest()`
      }
    };

    res.json({
      success: true,
      data: { original: text, hash: result, algorithm, examples },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// JWT endpoints
router.post('/jwt/generate', (req, res) => {
  try {
    const { payload, secret, expiresIn } = req.body;

    if (!payload) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Payload is required'
      });
    }

    const tokenSecret = secret || 'default-secret';
    const options = expiresIn ? { expiresIn } : {};

    const token = jwt.sign(payload, tokenSecret, options);

    res.json({
      success: true,
      data: { token, payload, expiresIn: expiresIn || 'default' },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

router.post('/jwt/verify', (req, res) => {
  try {
    const { token, secret } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Token is required'
      });
    }

    const tokenSecret = secret || 'default-secret';
    const decoded = jwt.verify(token, tokenSecret);

    res.json({
      success: true,
      data: { valid: true, decoded },
      error: null
    });
  } catch (error) {
    res.json({
      success: true,
      data: { valid: false, error: error.message },
      error: null
    });
  }
});

// JSON tools endpoints
router.post('/json/format', (req, res) => {
  try {
    const { json, operation } = req.body;

    if (!json && json !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'JSON is required'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Operation is required'
      });
    }

    let result;
    let isValid = true;
    let error = null;

    try {
      const parsed = JSON.parse(json);
      
      switch (operation) {
        case 'format':
          result = JSON.stringify(parsed, null, 2);
          break;
        case 'minify':
          result = JSON.stringify(parsed);
          break;
        case 'validate':
          result = json;
          break;
        default:
          return res.status(400).json({
            success: false,
            data: null,
            error: 'Unknown operation'
          });
      }
    } catch (e) {
      isValid = false;
      error = e.message;
      result = json;
    }

    res.json({
      success: true,
      data: { original: json, result, isValid, error, operation },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// Serialization endpoints
router.post('/serialize/convert', async (req, res) => {
  try {
    const { data, fromFormat, toFormat } = req.body;

    if (!data && data !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Data is required'
      });
    }

    if (!fromFormat || !toFormat) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Both fromFormat and toFormat are required'
      });
    }

    let parsed;
    let result;

    // Parse input format
    try {
      switch (fromFormat) {
        case 'json':
          parsed = JSON.parse(data);
          break;
        case 'yaml':
          parsed = yaml.load(data);
          break;
        case 'xml':
          const parser = new xml2js.Parser({
            explicitArray: false,
            ignoreAttrs: true,
            mergeAttrs: false
          });
          const xmlResult = await parser.parseStringPromise(data);
          // Extract content from root element to remove wrapper
          const rootKeys = Object.keys(xmlResult);
          if (rootKeys.length === 1) {
            parsed = xmlResult[rootKeys[0]];
          } else {
            parsed = xmlResult;
          }
          break;
        case 'msgpack':
          parsed = msgpack.decode(Buffer.from(data, 'base64'));
          break;
        default:
          return res.status(400).json({
            success: false,
            data: null,
            error: 'Unsupported input format'
          });
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        data: null,
        error: `Failed to parse ${fromFormat}: ${e.message}`
      });
    }

    // Convert to output format
    try {
      switch (toFormat) {
        case 'json':
          result = JSON.stringify(parsed, null, 2);
          break;
        case 'yaml':
          result = yaml.dump(parsed);
          break;
        case 'xml':
          const builder = new xml2js.Builder();
          result = builder.buildObject(parsed);
          break;
        case 'msgpack':
          const encoded = msgpack.encode(parsed);
          result = encoded.toString('base64');
          break;
        default:
          return res.status(400).json({
            success: false,
            data: null,
            error: 'Unsupported output format'
          });
      }
    } catch (e) {
      return res.status(400).json({
        success: false,
        data: null,
        error: `Failed to convert to ${toFormat}: ${e.message}`
      });
    }

    res.json({
      success: true,
      data: { original: data, result, fromFormat, toFormat },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// Encoding utilities
router.post('/encode', (req, res) => {
  try {
    const { text, operation } = req.body;

    if (!text && text !== '') {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Text is required'
      });
    }

    if (!operation) {
      return res.status(400).json({
        success: false,
        data: null,
        error: 'Operation is required'
      });
    }

    let result;

    switch (operation) {
      case 'url':
        result = encodeURIComponent(text);
        break;
      case 'url-decode':
        result = decodeURIComponent(text);
        break;
      case 'html':
        result = text
          .replace(/&/g, '&amp;')
          .replace(/</g, '&lt;')
          .replace(/>/g, '&gt;')
          .replace(/"/g, '&quot;')
          .replace(/'/g, '&#x27;');
        break;
      case 'html-decode':
        result = text
          .replace(/&amp;/g, '&')
          .replace(/&lt;/g, '<')
          .replace(/&gt;/g, '>')
          .replace(/&quot;/g, '"')
          .replace(/&#x27;/g, "'");
        break;
      case 'base64':
        result = Buffer.from(text).toString('base64');
        break;
      case 'base64-decode':
        result = Buffer.from(text, 'base64').toString('utf-8');
        break;
      default:
        return res.status(400).json({
          success: false,
          data: null,
          error: 'Unknown operation'
        });
    }

    res.json({
      success: true,
      data: { original: text, result, operation },
      error: null
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

export default router;
