import express from 'express';
import si from 'systeminformation';

const router = express.Router();

// GET /api/device-diagnostics - Get complete system information
router.get('/', async (req, res) => {
  try {
    // Collect all system information in parallel
    const [cpu, mem, fsSize, graphics, osInfo, networkInterfaces] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize(),
      si.graphics(),
      si.osInfo(),
      si.networkInterfaces()
    ]);

    // Process CPU information
    const cpuInfo = {
      model: cpu.model,
      manufacturer: cpu.manufacturer,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
      speedMin: cpu.speedMin,
      speedMax: cpu.speedMax,
      cache: cpu.cache,
      temperature: cpu.temperature || null
    };

    // Process memory information
    const memoryInfo = {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      active: mem.active,
      available: mem.available,
      swaptotal: mem.swaptotal,
      swapused: mem.swapused,
      swapfree: mem.swapfree,
      usagePercentage: Math.round((mem.used / mem.total) * 100)
    };

    // Process storage information
    const storageInfo = fsSize.map(disk => ({
      fs: disk.fs,
      type: disk.type,
      size: disk.size,
      used: disk.used,
      available: disk.available,
      use: disk.use,
      mount: disk.mount,
      usagePercentage: Math.round(disk.use)
    }));

    // Process graphics information
    const graphicsInfo = {
      gpus: graphics.controllers.map(gpu => ({
        model: gpu.model,
        vendor: gpu.vendor,
        bus: gpu.bus,
        vram: gpu.vram,
        vramDynamic: gpu.vramDynamic,
        driverVersion: gpu.driverVersion
      })),
      displays: graphics.displays.map(display => ({
        vendor: display.vendor,
        model: display.model,
        resolutionX: display.resolutionX,
        resolutionY: display.resolutionY,
        pixelDepth: display.pixelDepth,
        colorDepth: display.colorDepth,
        currentResX: display.currentResX,
        currentResY: display.currentResY,
        positionX: display.positionX,
        positionY: display.positionY,
        refreshRate: display.refreshRate,
        main: display.main
      }))
    };

    // Process OS information
    const osInfoData = {
      platform: osInfo.platform,
      distro: osInfo.distro,
      release: osInfo.release,
      codename: osInfo.codename,
      kernel: osInfo.kernel,
      arch: osInfo.arch,
      hostname: osInfo.hostname,
      uptime: osInfo.uptime
    };

    // Process network information
    const networkInfo = networkInterfaces.map(iface => ({
      iface: iface.iface,
      ifaceName: iface.ifaceName,
      type: iface.type,
      speed: iface.speed,
      operstate: iface.operstate,
      ip4: iface.ip4,
      ip6: iface.ip6,
      mac: iface.mac,
      internal: iface.internal
    }));

    const systemData = {
      cpu: cpuInfo,
      memory: memoryInfo,
      storage: storageInfo,
      graphics: graphicsInfo,
      os: osInfoData,
      network: networkInfo,
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemData,
      error: null
    });
  } catch (error) {
    console.error('Device diagnostics error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-diagnostics/system - Get core system info only
router.get('/system', async (req, res) => {
  try {
    const [cpu, mem, fsSize] = await Promise.all([
      si.cpu(),
      si.mem(),
      si.fsSize()
    ]);

    const systemData = {
      cpu: {
        model: cpu.model,
        cores: cpu.cores,
        speed: cpu.speed
      },
      memory: {
        total: mem.total,
        used: mem.used,
        free: mem.free,
        usagePercentage: Math.round((mem.used / mem.total) * 100)
      },
      storage: fsSize.map(disk => ({
        size: disk.size,
        used: disk.used,
        available: disk.available,
        usagePercentage: Math.round(disk.use),
        mount: disk.mount
      })),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: systemData,
      error: null
    });
  } catch (error) {
    console.error('System info error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-diagnostics/monitors - Get monitor/display information
router.get('/monitors', async (req, res) => {
  try {
    const graphics = await si.graphics();

    const monitorData = {
      displays: graphics.displays.map(display => ({
        vendor: display.vendor,
        model: display.model,
        resolutionX: display.resolutionX,
        resolutionY: display.resolutionY,
        pixelDepth: display.pixelDepth,
        colorDepth: display.colorDepth,
        currentResX: display.currentResX,
        currentResY: display.currentResY,
        refreshRate: display.refreshRate,
        main: display.main,
        positionX: display.positionX,
        positionY: display.positionY
      })),
      gpus: graphics.controllers.map(gpu => ({
        model: gpu.model,
        vendor: gpu.vendor,
        vram: gpu.vram,
        driverVersion: gpu.driverVersion
      })),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: monitorData,
      error: null
    });
  } catch (error) {
    console.error('Monitor info error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-diagnostics/cpu - Get CPU information
router.get('/cpu', async (req, res) => {
  try {
    const cpu = await si.cpu();
    const cpuLoad = await si.currentLoad();

    const cpuData = {
      model: cpu.model,
      manufacturer: cpu.manufacturer,
      cores: cpu.cores,
      physicalCores: cpu.physicalCores,
      speed: cpu.speed,
      speedMin: cpu.speedMin,
      speedMax: cpu.speedMax,
      cache: cpu.cache,
      temperature: cpu.temperature || null,
      currentLoad: {
        avgLoad: cpuLoad.avgLoad,
        currentLoad: cpuLoad.currentLoad,
        currentLoadUser: cpuLoad.currentLoadUser,
        currentLoadSystem: cpuLoad.currentLoadSystem,
        currentLoadIdle: cpuLoad.currentLoadIdle
      },
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: cpuData,
      error: null
    });
  } catch (error) {
    console.error('CPU info error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-diagnostics/memory - Get memory information
router.get('/memory', async (req, res) => {
  try {
    const mem = await si.mem();

    const memoryData = {
      total: mem.total,
      free: mem.free,
      used: mem.used,
      active: mem.active,
      available: mem.available,
      buffcache: mem.buffcache,
      swaptotal: mem.swaptotal,
      swapused: mem.swapused,
      swapfree: mem.swapfree,
      usagePercentage: Math.round((mem.used / mem.total) * 100),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: memoryData,
      error: null
    });
  } catch (error) {
    console.error('Memory info error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

// GET /api/device-diagnostics/storage - Get storage information
router.get('/storage', async (req, res) => {
  try {
    const fsSize = await si.fsSize();
    const diskLayout = await si.diskLayout();

    const storageData = {
      drives: fsSize.map(disk => ({
        fs: disk.fs,
        type: disk.type,
        size: disk.size,
        used: disk.used,
        available: disk.available,
        use: disk.use,
        mount: disk.mount,
        usagePercentage: Math.round(disk.use)
      })),
      physical: diskLayout.map(disk => ({
        device: disk.device,
        type: disk.type,
        name: disk.name,
        vendor: disk.vendor,
        size: disk.size,
        bytesPerSector: disk.bytesPerSector,
        totalCylinders: disk.totalCylinders,
        heads: disk.heads,
        sectorsPerTrack: disk.sectorsPerTrack,
        firmwareRevision: disk.firmwareRevision,
        serialNum: disk.serialNum,
        interfaceType: disk.interfaceType
      })),
      timestamp: new Date().toISOString()
    };

    res.json({
      success: true,
      data: storageData,
      error: null
    });
  } catch (error) {
    console.error('Storage info error:', error);
    res.status(500).json({
      success: false,
      data: null,
      error: error.message
    });
  }
});

export default router;
