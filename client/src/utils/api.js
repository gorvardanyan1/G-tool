import axios from 'axios';

const envBaseUrl = import.meta.env.VITE_API_BASE_URL;

const api = axios.create({
  baseURL: envBaseUrl || '/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

export default api;

export const translateApi = {
  translate: (text, sourceLang, targetLang, mode = 'natural') =>
    api.post('/translate', { text, sourceLang, targetLang, mode }),
  detectLanguage: (text) =>
    api.post('/translate/detect', { text }),
  getLanguages: () =>
    api.get('/translate/languages')
};

export const imageApi = {
  convert: (formData) =>
    api.post('/image/convert', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  resize: (formData) =>
    api.post('/image/resize', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    })
};

export const textApi = {
  count: (text) =>
    api.post('/text/count', { text }),
  transform: (text, operation) =>
    api.post('/text/transform', { text, operation }),
  base64: (text, operation) =>
    api.post('/text/base64', { text, operation })
};

export const ocrApi = {
  extractText: (formData) =>
    api.post('/ocr', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  getLanguages: () =>
    api.get('/ocr/languages')
};

export const imageEditorApi = {
  upload: (formData) =>
    api.post('/image-editor/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data'
      }
    }),
  process: (imageId, operations) =>
    api.post('/image-editor/process', { imageId, operations }),
  undo: (imageId) =>
    api.post('/image-editor/undo', { imageId }),
  redo: (imageId) =>
    api.post('/image-editor/redo', { imageId }),
  merge: (imageId1, imageId2, mode, options) =>
    api.post('/image-editor/merge', { imageId1, imageId2, mode, options }),
  annotate: (imageId, annotations) =>
    api.post('/image-editor/annotate', { imageId, annotations }),
  download: (imageId, format, quality) =>
    api.post('/image-editor/download', { imageId, format, quality })
};
