import express from 'express';
import translateRoutes from './translate.js';
import imageConverterRoutes from './imageConverter.js';
import textToolsRoutes from './textTools.js';
import ocrRoutes from './ocr.js';
import codeRoutes from './code.js';
import deviceTestRoutes from './deviceTest.js';
import deviceDiagnosticsRoutes from './deviceDiagnostics.js';
import sqlAiRoutes from './sqlAi.js';
import healthRoutes from './health.js';
import apiTesterRoutes from './apiTester.js';
import colorPaletteRoutes from './colorPalette.js';
import regexTesterRoutes from './regexTester.js';

const router = express.Router();

router.use('/translate', translateRoutes);
router.use('/image', imageConverterRoutes);
router.use('/text', textToolsRoutes);
router.use('/ocr', ocrRoutes);
router.use('/code', codeRoutes);
router.use('/device-test', deviceTestRoutes);
router.use('/device-diagnostics', deviceDiagnosticsRoutes);
router.use('/sql-ai', sqlAiRoutes);
router.use('/api-tester', apiTesterRoutes);
router.use('/color', colorPaletteRoutes);
router.use('/regex', regexTesterRoutes);
router.use('/health', healthRoutes);

export default router;
