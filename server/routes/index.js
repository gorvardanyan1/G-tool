import express from 'express';
import translateRoutes from './translate.js';
import imageConverterRoutes from './imageConverter.js';
import textToolsRoutes from './textTools.js';
import ocrRoutes from './ocr.js';
import imageEditorRoutes from './imageEditor.js';
import codeRoutes from './code.js';
import deviceTestRoutes from './deviceTest.js';
import deviceDiagnosticsRoutes from './deviceDiagnostics.js';
import sqlAiRoutes from './sqlAi.js';
import healthRoutes from './health.js';

const router = express.Router();

router.use('/translate', translateRoutes);
router.use('/image', imageConverterRoutes);
router.use('/text', textToolsRoutes);
router.use('/ocr', ocrRoutes);
router.use('/image-editor', imageEditorRoutes);
router.use('/code', codeRoutes);
router.use('/device-test', deviceTestRoutes);
router.use('/device-diagnostics', deviceDiagnosticsRoutes);
router.use('/sql-ai', sqlAiRoutes);
router.use('/health', healthRoutes);

export default router;
