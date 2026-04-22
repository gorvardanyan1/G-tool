import { useState, useEffect, useRef, useCallback } from 'react';
import { 
  Camera, 
  Mic, 
  MicOff, 
  CameraOff, 
  Play, 
  Square, 
  AlertCircle, 
  CheckCircle, 
  XCircle, 
  RefreshCw,
  Monitor,
  Volume2,
  VolumeX,
  Maximize2,
  Minimize2,
  Eye,
  Wifi,
  Gauge,
  Shield,
  Battery,
  Activity
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../utils/api';

export default function DeviceDiagnostics() {
  const [activeTab, setActiveTab] = useState('overview');
  const [devices, setDevices] = useState({ cameras: [], microphones: [], speakers: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [stream, setStream] = useState(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [permissions, setPermissions] = useState({ camera: null, microphone: null });
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [browserInfo, setBrowserInfo] = useState({});
  const [gpuRenderer, setGpuRenderer] = useState('Unknown');
  const [isSpeakerTestRunning, setIsSpeakerTestRunning] = useState(false);
  const [monitorColor, setMonitorColor] = useState('black');
  const [isFullscreen, setIsFullscreen] = useState(false);

  const [pingResult, setPingResult] = useState(null);
  const [isPingRunning, setIsPingRunning] = useState(false);
  const [downloadResult, setDownloadResult] = useState(null);
  const [isDownloadRunning, setIsDownloadRunning] = useState(false);

  const [isFpsRunning, setIsFpsRunning] = useState(false);
  const [fps, setFps] = useState(null);
  const isFpsRunningRef = useRef(false);
  const fpsRafRef = useRef(null);
  const fpsFrameCountRef = useRef(0);
  const fpsLastTimestampRef = useRef(0);

  const [cpuBenchmark, setCpuBenchmark] = useState(null);
  const [isCpuBenchmarkRunning, setIsCpuBenchmarkRunning] = useState(false);

  const [storageEstimate, setStorageEstimate] = useState(null);
  const [webglCaps, setWebglCaps] = useState(null);

  const [permissionStates, setPermissionStates] = useState(null);
  const [batteryInfo, setBatteryInfo] = useState(null);
  const [sensorInfo, setSensorInfo] = useState({
    orientationSupported: false,
    motionSupported: false,
    orientationPermission: 'unknown',
    motionPermission: 'unknown'
  });

  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  const getWebGLRenderer = () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return 'Unavailable';

      const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
      if (!debugInfo) return 'Unavailable';

      const renderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
      return typeof renderer === 'string' && renderer.trim() ? renderer : 'Unavailable';
    } catch {
      return 'Unavailable';
    }
  };

  const getWebGLCapabilities = () => {
    try {
      const canvas = document.createElement('canvas');
      const gl = canvas.getContext('webgl2') || canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
      if (!gl) return { supported: false };

      const isWebgl2 = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext;
      const maxTextureSize = gl.getParameter(gl.MAX_TEXTURE_SIZE);
      const maxCubeMapTextureSize = gl.getParameter(gl.MAX_CUBE_MAP_TEXTURE_SIZE);
      const maxRenderbufferSize = gl.getParameter(gl.MAX_RENDERBUFFER_SIZE);
      const maxViewportDims = gl.getParameter(gl.MAX_VIEWPORT_DIMS);

      return {
        supported: true,
        version: isWebgl2 ? 'WebGL2' : 'WebGL1',
        maxTextureSize,
        maxCubeMapTextureSize,
        maxRenderbufferSize,
        maxViewportDims: Array.isArray(maxViewportDims) ? maxViewportDims.join(' x ') : String(maxViewportDims)
      };
    } catch {
      return { supported: false };
    }
  };

  // Get browser device information
  useEffect(() => {
    const getBrowserInfo = () => {
      const userAgent = navigator.userAgent;
      let browserName = 'Unknown';
      
      if (userAgent.indexOf('Chrome') > -1) {
        browserName = 'Chrome';
      } else if (userAgent.indexOf('Safari') > -1) {
        browserName = 'Safari';
      } else if (userAgent.indexOf('Firefox') > -1) {
        browserName = 'Firefox';
      } else if (userAgent.indexOf('Edge') > -1) {
        browserName = 'Edge';
      }

      const info = {
        browser: `${browserName} ${userAgent.match(/[\d.]+/)?.[0] || ''}`,
        cpu: navigator.hardwareConcurrency || 'Unknown',
        memory: navigator.deviceMemory ? `${navigator.deviceMemory}GB` : 'Unknown',
        screen: {
          width: screen.width,
          height: screen.height,
          colorDepth: screen.colorDepth,
          pixelDepth: screen.pixelDepth
        },
        platform: navigator.platform,
        language: navigator.language,
        onLine: navigator.onLine,
        connection: navigator.connection ? {
          effectiveType: navigator.connection.effectiveType,
          downlink: navigator.connection.downlink,
          rtt: navigator.connection.rtt
        } : null
      };
      
      setBrowserInfo(info);
    };
    
    getBrowserInfo();
    setGpuRenderer(getWebGLRenderer());
    setWebglCaps(getWebGLCapabilities());
  }, []);

  useEffect(() => {
    const loadStorageEstimate = async () => {
      try {
        if (!navigator.storage?.estimate) {
          setStorageEstimate({ supported: false });
          return;
        }
        const estimate = await navigator.storage.estimate();
        setStorageEstimate({ supported: true, ...estimate });
      } catch {
        setStorageEstimate({ supported: false });
      }
    };

    loadStorageEstimate();
  }, []);

  useEffect(() => {
    const loadPermissionStates = async () => {
      if (!navigator.permissions?.query) {
        setPermissionStates({ supported: false });
        return;
      }

      const names = ['camera', 'microphone', 'geolocation', 'notifications'];
      const results = {};

      await Promise.all(
        names.map(async (name) => {
          try {
            const status = await navigator.permissions.query({ name });
            results[name] = status.state;
          } catch {
            results[name] = 'unavailable';
          }
        })
      );

      setPermissionStates({ supported: true, ...results });
    };

    loadPermissionStates();
  }, []);

  useEffect(() => {
    let batteryManager;
    let isMounted = true;
    let updateBatteryInfo;

    const loadBattery = async () => {
      try {
        if (!navigator.getBattery) {
          setBatteryInfo({ supported: false });
          return;
        }

        batteryManager = await navigator.getBattery();
        if (!isMounted) return;

        updateBatteryInfo = () => {
          setBatteryInfo({
            supported: true,
            charging: batteryManager.charging,
            level: batteryManager.level,
            chargingTime: batteryManager.chargingTime,
            dischargingTime: batteryManager.dischargingTime
          });
        };

        updateBatteryInfo();
        batteryManager.addEventListener('chargingchange', updateBatteryInfo);
        batteryManager.addEventListener('levelchange', updateBatteryInfo);
        batteryManager.addEventListener('chargingtimechange', updateBatteryInfo);
        batteryManager.addEventListener('dischargingtimechange', updateBatteryInfo);
      } catch {
        setBatteryInfo({ supported: false });
      }
    };

    loadBattery();

    return () => {
      isMounted = false;
      if (!batteryManager) return;

      if (!updateBatteryInfo) return;
      batteryManager.removeEventListener('chargingchange', updateBatteryInfo);
      batteryManager.removeEventListener('levelchange', updateBatteryInfo);
      batteryManager.removeEventListener('chargingtimechange', updateBatteryInfo);
      batteryManager.removeEventListener('dischargingtimechange', updateBatteryInfo);
    };
  }, []);

  useEffect(() => {
    setSensorInfo((prev) => ({
      ...prev,
      orientationSupported: typeof window.DeviceOrientationEvent !== 'undefined',
      motionSupported: typeof window.DeviceMotionEvent !== 'undefined'
    }));
  }, []);

  // Check browser compatibility
  const checkBrowserCompatibility = () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError('Your browser does not support camera and microphone access. Please use a modern browser like Chrome, Firefox, Safari, or Edge.');
      return false;
    }
    return true;
  };

  // Enumerate available devices
  const enumerateDevices = useCallback(async () => {
    try {
      const deviceList = await navigator.mediaDevices.enumerateDevices();
      const cameras = deviceList.filter(device => device.kind === 'videoinput');
      const microphones = deviceList.filter(device => device.kind === 'audioinput');
      const speakers = deviceList.filter(device => device.kind === 'audiooutput');

      setDevices({
        cameras: cameras.map(camera => ({
          deviceId: camera.deviceId,
          label: camera.label || `Camera ${cameras.indexOf(camera) + 1}`
        })),
        microphones: microphones.map(mic => ({
          deviceId: mic.deviceId,
          label: mic.label || `Microphone ${microphones.indexOf(mic) + 1}`
        })),
        speakers: speakers.map(speaker => ({
          deviceId: speaker.deviceId,
          label: speaker.label || `Speaker ${speakers.indexOf(speaker) + 1}`
        }))
      });

      // Auto-select first devices if none selected
      if (cameras.length > 0 && !selectedCamera) {
        setSelectedCamera(cameras[0].deviceId);
      }
      if (microphones.length > 0 && !selectedMicrophone) {
        setSelectedMicrophone(microphones[0].deviceId);
      }
    } catch (error) {
      console.error('Error enumerating devices:', error);
      setError('Failed to detect devices. Please check your browser permissions.');
    }
  }, [selectedCamera, selectedMicrophone]);

  useEffect(() => {
    enumerateDevices();
  }, [enumerateDevices]);

  const runPingTest = async () => {
    if (isPingRunning) return;

    try {
      setIsPingRunning(true);
      setPingResult(null);

      const samples = [];
      for (let i = 0; i < 5; i += 1) {
        const start = performance.now();
        await api.get('/health', { timeout: 5000 });
        const end = performance.now();
        samples.push(end - start);
        await new Promise((r) => setTimeout(r, 200));
      }

      const avg = samples.reduce((a, b) => a + b, 0) / samples.length;
      const min = Math.min(...samples);
      const max = Math.max(...samples);
      const jitter = max - min;

      setPingResult({ samples, avg, min, max, jitter });
    } catch (e) {
      setError(`Ping test failed: ${e.message}`);
    } finally {
      setIsPingRunning(false);
    }
  };

  const runDownloadTest = async () => {
    if (isDownloadRunning) return;

    try {
      setIsDownloadRunning(true);
      setDownloadResult(null);

      const size = 2000000;
      const start = performance.now();
      const response = await api.get(`/health/download?size=${size}`, { responseType: 'arraybuffer', timeout: 15000 });
      const end = performance.now();
      const bytes = response?.data?.byteLength || 0;
      const seconds = (end - start) / 1000;
      const mbps = seconds > 0 ? (bytes * 8) / seconds / 1000 / 1000 : 0;

      setDownloadResult({ bytes, seconds, mbps });
    } catch (e) {
      setError(`Download test failed: ${e.message}`);
    } finally {
      setIsDownloadRunning(false);
    }
  };

  const startFpsMeter = () => {
    if (isFpsRunning) return;

    setIsFpsRunning(true);
    isFpsRunningRef.current = true;
    setFps(null);
    fpsFrameCountRef.current = 0;
    fpsLastTimestampRef.current = performance.now();

    const loop = (t) => {
      if (!isFpsRunningRef.current) return;

      fpsFrameCountRef.current += 1;
      const delta = t - fpsLastTimestampRef.current;

      if (delta >= 1000) {
        const currentFps = (fpsFrameCountRef.current / delta) * 1000;
        setFps(Math.round(currentFps));
        fpsFrameCountRef.current = 0;
        fpsLastTimestampRef.current = t;
      }

      fpsRafRef.current = requestAnimationFrame(loop);
    };

    fpsRafRef.current = requestAnimationFrame(loop);
  };

  const stopFpsMeter = () => {
    setIsFpsRunning(false);
    isFpsRunningRef.current = false;
    if (fpsRafRef.current) cancelAnimationFrame(fpsRafRef.current);
    fpsRafRef.current = null;
  };

  const runCpuBenchmark = () => {
    if (isCpuBenchmarkRunning) return;

    setIsCpuBenchmarkRunning(true);
    setCpuBenchmark(null);

    setTimeout(() => {
      const durationMs = 300;
      const start = performance.now();
      let x = 0;
      let iterations = 0;
      while (performance.now() - start < durationMs) {
        x = (x * 1664525 + 1013904223) % 4294967296;
        iterations += 1;
      }
      setCpuBenchmark({ durationMs, iterations, checksum: x });
      setIsCpuBenchmarkRunning(false);
    }, 0);
  };

  const requestSensorPermissions = async () => {
    const next = { ...sensorInfo };

    try {
      if (typeof window.DeviceOrientationEvent?.requestPermission === 'function') {
        const state = await window.DeviceOrientationEvent.requestPermission();
        next.orientationPermission = state;
      }
    } catch {
      next.orientationPermission = 'denied';
    }

    try {
      if (typeof window.DeviceMotionEvent?.requestPermission === 'function') {
        const state = await window.DeviceMotionEvent.requestPermission();
        next.motionPermission = state;
      }
    } catch {
      next.motionPermission = 'denied';
    }

    setSensorInfo(next);
  };

  // Request permissions
  const requestPermissions = async () => {
    if (!checkBrowserCompatibility()) return;

    try {
      setError('');
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });

      // Stop the stream immediately after getting permissions
      mediaStream.getTracks().forEach(track => track.stop());

      setPermissions({ camera: 'granted', microphone: 'granted' });
      await enumerateDevices();
      setStatus('ready');
    } catch (error) {
      console.error('Permission error:', error);
      
      if (error.name === 'NotAllowedError') {
        setPermissions({ camera: 'denied', microphone: 'denied' });
        setError('Camera and microphone permissions were denied. Please allow access in your browser settings.');
      } else if (error.name === 'NotFoundError') {
        setPermissions({ camera: 'not_found', microphone: 'not_found' });
        setError('No camera or microphone found. Please connect devices and try again.');
      } else {
        setError(`Permission error: ${error.message}`);
      }
    }
  };

  // Monitor audio level
  const monitorAudioLevel = useCallback(() => {
    if (!analyserRef.current) return;

    const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
    
    const updateLevel = () => {
      if (!isTestRunning) return;
      
      analyserRef.current.getByteFrequencyData(dataArray);
      const average = dataArray.reduce((sum, value) => sum + value, 0) / dataArray.length;
      setAudioLevel(Math.min(100, (average / 128) * 100));
      
      animationFrameRef.current = requestAnimationFrame(updateLevel);
    };
    
    updateLevel();
  }, [isTestRunning]);

  // Start camera/microphone test
  const startTest = async () => {
    if (!checkBrowserCompatibility()) return;

    try {
      setError('');
      setStatus('starting');

      const constraints = {
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
      };

      const mediaStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(mediaStream);

      // Set video source
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }

      // Setup audio monitoring
      if (audioContextRef.current) {
        audioContextRef.current.close();
      }

      audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
      analyserRef.current = audioContextRef.current.createAnalyser();
      analyserRef.current.fftSize = 256;
      
      const source = audioContextRef.current.createMediaStreamSource(mediaStream);
      source.connect(analyserRef.current);

      setIsTestRunning(true);
      setStatus('running');
      monitorAudioLevel();
    } catch (error) {
      console.error('Start test error:', error);
      
      if (error.name === 'NotAllowedError') {
        setError('Permission denied. Please allow camera and microphone access.');
      } else if (error.name === 'NotFoundError') {
        setError('Selected device not found. Please choose a different device.');
      } else if (error.name === 'NotReadableError') {
        setError('Device is already in use by another application.');
      } else {
        setError(`Failed to start test: ${error.message}`);
      }
      setStatus('error');
    }
  };

  // Stop camera/microphone test
  const stopTest = async () => {
    try {
      // Stop media tracks
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }

      // Clear video source
      if (videoRef.current) {
        videoRef.current.srcObject = null;
      }

      // Stop audio monitoring
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
      if (audioContextRef.current) {
        await audioContextRef.current.close();
        audioContextRef.current = null;
      }
      analyserRef.current = null;

      setIsTestRunning(false);
      setAudioLevel(0);
      setStatus('stopped');
    } catch (error) {
      console.error('Stop test error:', error);
      setError(`Error stopping test: ${error.message}`);
    }
  };

  // Test speaker
  const testSpeaker = async () => {
    if (isSpeakerTestRunning) return;

    try {
      setIsSpeakerTestRunning(true);
      
      const audioContext = new (window.AudioContext || window.webkitAudioContext)();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 440; // A4 note
      gainNode.gain.value = 0.3; // Volume level
      
      oscillator.start();
      oscillator.stop(audioContext.currentTime + 2); // 2 second test
      
      setTimeout(() => {
        setIsSpeakerTestRunning(false);
        audioContext.close();
      }, 2000);
    } catch (error) {
      console.error('Speaker test error:', error);
      setError('Failed to play test sound. Please check your audio settings.');
      setIsSpeakerTestRunning(false);
    }
  };

  // Enter fullscreen monitor test
  const enterFullscreenTest = (color) => {
    const element = document.documentElement;
    element.requestFullscreen().then(() => {
      setMonitorColor(color);
      setIsFullscreen(true);
    }).catch(error => {
      console.error('Fullscreen error:', error);
      setError('Failed to enter fullscreen mode');
    });
  };

  // Exit fullscreen monitor test
  const exitFullscreenTest = () => {
    document.exitFullscreen().then(() => {
      setIsFullscreen(false);
      setMonitorColor('black');
    }).catch(error => {
      console.error('Exit fullscreen error:', error);
    });
  };

  // Handle fullscreen change
  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsFullscreen(false);
        setMonitorColor('black');
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopFpsMeter();
      stopTest();
      if (document.fullscreenElement) {
        document.exitFullscreen();
      }
    };
  }, []);

  // Get status icon
  const getStatusIcon = (deviceType) => {
    const permission = permissions[deviceType];
    if (permission === 'granted') {
      return <CheckCircle className="w-5 h-5 text-green-500" />;
    } else if (permission === 'denied') {
      return <XCircle className="w-5 h-5 text-red-500" />;
    } else if (permission === 'not_found') {
      return <AlertCircle className="w-5 h-5 text-yellow-500" />;
    }
    return <AlertCircle className="w-5 h-5 text-gray-400" />;
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Monitor },
    { id: 'camera', label: 'Camera', icon: Camera },
    { id: 'microphone', label: 'Microphone', icon: Mic },
    { id: 'speaker', label: 'Speaker', icon: Volume2 },
    { id: 'monitor', label: 'Monitor Test', icon: Maximize2 },
    { id: 'network', label: 'Network', icon: Wifi },
    { id: 'performance', label: 'Performance', icon: Gauge },
    { id: 'permissions', label: 'Permissions', icon: Shield },
    { id: 'power', label: 'Battery & Sensors', icon: Battery }
  ];

  // Fullscreen monitor test overlay
  if (isFullscreen) {
    return (
      <div 
        className={`fixed inset-0 bg-${monitorColor} z-50 flex items-center justify-center`}
        style={{ backgroundColor: monitorColor }}
      >
        <div className="bg-black bg-opacity-50 rounded-lg p-6 text-white">
          <h3 className="text-xl font-bold mb-4">Monitor Test - {monitorColor.toUpperCase()} Screen</h3>
          <p className="mb-4">Press ESC or click Exit to leave fullscreen mode</p>
          <Button onClick={exitFullscreenTest} variant="secondary">
            <Minimize2 className="w-4 h-4 mr-2" />
            Exit Fullscreen
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Device Diagnostics
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Comprehensive device testing and system information diagnostics.
          </p>
        </div>

        {/* Error Display */}
        {error && (
          <Card className="mb-6 border-red-200 dark:border-red-800">
            <div className="flex items-center gap-3 text-red-600 dark:text-red-400">
              <AlertCircle className="w-5 h-5 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          </Card>
        )}

        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-2 mb-6">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg font-medium transition-all ${
                  activeTab === tab.id
                    ? 'bg-indigo-500 text-white'
                    : 'bg-gray-100 dark:bg-gray-800 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700'
                }`}
              >
                <Icon className="w-4 h-4" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="grid grid-cols-1 lg:grid-cols-1 gap-6">
              <Card>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 mb-4">
                  Client Device Info
                </h3>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Browser:</span>
                    <span className="font-medium">{typeof browserInfo.browser === 'string' ? browserInfo.browser : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">CPU Cores:</span>
                    <span className="font-medium">{typeof browserInfo.cpu === 'string' || typeof browserInfo.cpu === 'number' ? browserInfo.cpu : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Memory:</span>
                    <span className="font-medium">{typeof browserInfo.memory === 'string' ? browserInfo.memory : 'Unknown'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">GPU (estimate):</span>
                    <span className="font-medium">{gpuRenderer}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Screen:</span>
                    <span className="font-medium">
                      {browserInfo.screen?.width && browserInfo.screen?.height 
                        ? `${browserInfo.screen.width}x${browserInfo.screen.height}` 
                        : 'Unknown'}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600 dark:text-gray-400">Platform:</span>
                    <span className="font-medium">{typeof browserInfo.platform === 'string' ? browserInfo.platform : 'Unknown'}</span>
                  </div>
                  {browserInfo.connection && typeof browserInfo.connection === 'object' && typeof browserInfo.connection.effectiveType === 'string' && (
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Network:</span>
                      <span className="font-medium">{browserInfo.connection.effectiveType}</span>
                    </div>
                  )}

                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Cameras:</span>
                      <span className="font-medium">{devices.cameras.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Microphones:</span>
                      <span className="font-medium">{devices.microphones.length}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600 dark:text-gray-400">Speakers:</span>
                      <span className="font-medium">{devices.speakers.length}</span>
                    </div>

                    {(permissions.camera === 'granted' || permissions.microphone === 'granted') && (
                      <div className="mt-3 space-y-3">
                        {permissions.camera === 'granted' && devices.cameras.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Cameras</p>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              {devices.cameras.map((camera) => (
                                <li key={camera.deviceId} className="truncate">{camera.label}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {permissions.microphone === 'granted' && devices.microphones.length > 0 && (
                          <div>
                            <p className="text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">Microphones</p>
                            <ul className="text-xs text-gray-600 dark:text-gray-400 space-y-1">
                              {devices.microphones.map((mic) => (
                                <li key={mic.deviceId} className="truncate">{mic.label}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    )}

                    {(permissions.camera !== 'granted' || permissions.microphone !== 'granted') && (
                      <div className="mt-3">
                        <p className="text-xs text-gray-500 dark:text-gray-400 mb-2">
                          Device names may be hidden until you grant camera/microphone permissions.
                        </p>
                        <Button onClick={requestPermissions} variant="outline" className="w-full">
                          Request Permissions
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            </div>
          )}

          {/* Camera Tab */}
          {activeTab === 'camera' && (
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Camera className="w-5 h-5" />
                    Camera Test
                  </h3>
                  {getStatusIcon('camera')}
                </div>

                <div className="relative bg-gray-900 rounded-lg overflow-hidden aspect-video">
                  {isTestRunning && stream ? (
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      muted
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="flex items-center justify-center h-full">
                      <CameraOff className="w-12 h-12 text-gray-600" />
                    </div>
                  )}
                </div>

                {devices.cameras.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Camera
                    </label>
                    <select
                      value={selectedCamera}
                      onChange={(e) => setSelectedCamera(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {devices.cameras.map((camera) => (
                        <option key={camera.deviceId} value={camera.deviceId}>
                          {camera.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3">
                  {!permissions.camera && !permissions.microphone ? (
                    <Button onClick={requestPermissions}>
                      <Camera className="w-4 h-4 mr-2" />
                      Request Permissions
                    </Button>
                  ) : isTestRunning ? (
                    <Button onClick={stopTest} variant="secondary">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Test
                    </Button>
                  ) : (
                    <Button onClick={startTest}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Test
                    </Button>
                  )}
                  
                  <Button onClick={enumerateDevices} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Devices
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Microphone Tab */}
          {activeTab === 'microphone' && (
            <Card>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Mic className="w-5 h-5" />
                    Microphone Test
                  </h3>
                  {getStatusIcon('microphone')}
                </div>

                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                      Audio Level
                    </span>
                    <span className="text-sm text-gray-600 dark:text-gray-400">
                      {isTestRunning && audioLevel > 0 ? 'Microphone detected' : 'No audio input'}
                    </span>
                  </div>
                  <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-4 overflow-hidden">
                    <div
                      className="h-full bg-green-500 transition-all duration-100 ease-out"
                      style={{ width: `${audioLevel}%` }}
                    />
                  </div>
                  <div className="flex items-center justify-center h-20">
                    {isTestRunning ? (
                      <div className="flex items-end gap-1">
                        {Array.from({ length: 20 }).map((_, i) => (
                          <div
                            key={i}
                            className="w-2 bg-green-500 rounded-t transition-all duration-100"
                            style={{
                              height: `${Math.random() * audioLevel * 0.8}px`,
                              opacity: audioLevel > 5 ? 1 : 0.3
                            }}
                          />
                        ))}
                      </div>
                    ) : (
                      <MicOff className="w-8 h-8 text-gray-400" />
                    )}
                  </div>
                </div>

                {devices.microphones.length > 0 && (
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Microphone
                    </label>
                    <select
                      value={selectedMicrophone}
                      onChange={(e) => setSelectedMicrophone(e.target.value)}
                      className="w-full p-2 border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100"
                    >
                      {devices.microphones.map((microphone) => (
                        <option key={microphone.deviceId} value={microphone.deviceId}>
                          {microphone.label}
                        </option>
                      ))}
                    </select>
                  </div>
                )}

                <div className="flex gap-3">
                  {!permissions.camera && !permissions.microphone ? (
                    <Button onClick={requestPermissions}>
                      <Mic className="w-4 h-4 mr-2" />
                      Request Permissions
                    </Button>
                  ) : isTestRunning ? (
                    <Button onClick={stopTest} variant="secondary">
                      <Square className="w-4 h-4 mr-2" />
                      Stop Test
                    </Button>
                  ) : (
                    <Button onClick={startTest}>
                      <Play className="w-4 h-4 mr-2" />
                      Start Test
                    </Button>
                  )}
                  
                  <Button onClick={enumerateDevices} variant="outline">
                    <RefreshCw className="w-4 h-4 mr-2" />
                    Refresh Devices
                  </Button>
                </div>
              </div>
            </Card>
          )}

          {/* Speaker Tab */}
          {activeTab === 'speaker' && (
            <Card>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Volume2 className="w-5 h-5" />
                  Speaker Test
                </h3>

                <div className="text-center py-8">
                  {isSpeakerTestRunning ? (
                    <div className="space-y-4">
                      <Volume2 className="w-16 h-16 text-green-500 mx-auto animate-pulse" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Playing test sound...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      <VolumeX className="w-16 h-16 text-gray-400 mx-auto" />
                      <p className="text-gray-600 dark:text-gray-400">
                        Click the button below to test your speakers
                      </p>
                    </div>
                  )}
                </div>

                <div className="flex justify-center">
                  <Button 
                    onClick={testSpeaker} 
                    disabled={isSpeakerTestRunning}
                    className="min-w-[200px]"
                  >
                    {isSpeakerTestRunning ? (
                      <>
                        <Volume2 className="w-4 h-4 mr-2" />
                        Testing...
                      </>
                    ) : (
                      <>
                        <Play className="w-4 h-4 mr-2" />
                        Play Test Sound
                      </>
                    )}
                  </Button>
                </div>

                <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-blue-900 dark:text-blue-300 mb-2">
                    Test Information
                  </h4>
                  <ul className="text-sm text-blue-700 dark:text-blue-400 space-y-1">
                    <li>• A 440Hz tone will play for 2 seconds</li>
                    <li>• Make sure your volume is at a comfortable level</li>
                    <li>• Check if you can hear the sound clearly</li>
                    <li>• If you can't hear anything, check your audio settings</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {/* Monitor Test Tab */}
          {activeTab === 'monitor' && (
            <Card>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Maximize2 className="w-5 h-5" />
                  Monitor Test
                </h3>

                <p className="text-gray-600 dark:text-gray-400">
                  Test your monitor for dead pixels and color accuracy using fullscreen color screens.
                </p>

                <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                  <Button
                    onClick={() => enterFullscreenTest('black')}
                    style={{ backgroundColor: '#000000', color: '#ffffff' }}
                    className="hover:opacity-90"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Black
                  </Button>
                  <Button
                    onClick={() => enterFullscreenTest('white')}
                    style={{ backgroundColor: '#ffffff', color: '#000000', border: '1px solid #d1d5db' }}
                    className="hover:bg-gray-50"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    White
                  </Button>
                  <Button
                    onClick={() => enterFullscreenTest('red')}
                    style={{ backgroundColor: '#ef4444', color: '#ffffff' }}
                    className="hover:opacity-90"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Red
                  </Button>
                  <Button
                    onClick={() => enterFullscreenTest('green')}
                    style={{ backgroundColor: '#22c55e', color: '#ffffff' }}
                    className="hover:opacity-90"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Green
                  </Button>
                  <Button
                    onClick={() => enterFullscreenTest('blue')}
                    style={{ backgroundColor: '#3b82f6', color: '#ffffff' }}
                    className="hover:opacity-90"
                  >
                    <Eye className="w-4 h-4 mr-2" />
                    Blue
                  </Button>
                </div>

                <div className="bg-yellow-50 dark:bg-yellow-900/20 rounded-lg p-4">
                  <h4 className="font-medium text-yellow-900 dark:text-yellow-300 mb-2">
                    How to Use Monitor Test
                  </h4>
                  <ul className="text-sm text-yellow-700 dark:text-yellow-400 space-y-1">
                    <li>• Click any color button to enter fullscreen mode</li>
                    <li>• Look for dead pixels (always black or always bright spots)</li>
                    <li>• Check for uniform color across the entire screen</li>
                    <li>• Press ESC or click Exit to return to normal view</li>
                  </ul>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'network' && (
            <Card>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Wifi className="w-5 h-5" />
                  Network Diagnostics
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Ping (to backend health endpoint)</p>
                    <Button onClick={runPingTest} disabled={isPingRunning}>
                      <Activity className="w-4 h-4 mr-2" />
                      {isPingRunning ? 'Testing...' : 'Run Ping Test'}
                    </Button>
                    {pingResult && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <div>Avg: {Math.round(pingResult.avg)} ms</div>
                        <div>Min: {Math.round(pingResult.min)} ms</div>
                        <div>Max: {Math.round(pingResult.max)} ms</div>
                        <div>Jitter: {Math.round(pingResult.jitter)} ms</div>
                      </div>
                    )}
                  </div>

                  <div className="space-y-2">
                    <p className="text-sm text-gray-600 dark:text-gray-400">Download speed (approx)</p>
                    <Button onClick={runDownloadTest} disabled={isDownloadRunning} variant="secondary">
                      <RefreshCw className="w-4 h-4 mr-2" />
                      {isDownloadRunning ? 'Testing...' : 'Run Download Test'}
                    </Button>
                    {downloadResult && (
                      <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                        <div>Size: {Math.round(downloadResult.bytes / 1024)} KB</div>
                        <div>Time: {downloadResult.seconds.toFixed(2)} s</div>
                        <div>Speed: {downloadResult.mbps.toFixed(2)} Mbps</div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'performance' && (
            <div className="space-y-6">
              <Card>
                <div className="space-y-4">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Gauge className="w-5 h-5" />
                    Performance
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">FPS Meter</p>
                      <div className="flex gap-3">
                        {isFpsRunning ? (
                          <Button onClick={stopFpsMeter} variant="secondary">Stop</Button>
                        ) : (
                          <Button onClick={startFpsMeter}>Start</Button>
                        )}
                      </div>
                      <p className="text-sm text-gray-700 dark:text-gray-300">Current FPS: {typeof fps === 'number' ? fps : '—'}</p>
                    </div>

                    <div className="space-y-2">
                      <p className="text-sm text-gray-600 dark:text-gray-400">CPU Micro-benchmark</p>
                      <Button onClick={runCpuBenchmark} disabled={isCpuBenchmarkRunning} variant="secondary">
                        {isCpuBenchmarkRunning ? 'Running...' : 'Run Benchmark'}
                      </Button>
                      {cpuBenchmark && (
                        <div className="text-sm text-gray-700 dark:text-gray-300 space-y-1">
                          <div>Duration: {cpuBenchmark.durationMs} ms</div>
                          <div>Iterations: {cpuBenchmark.iterations.toLocaleString()}</div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>

              <Card>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Storage & WebGL
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100">Storage Estimate</p>
                      {storageEstimate?.supported ? (
                        <>
                          <div>Quota: {storageEstimate.quota ? `${Math.round(storageEstimate.quota / 1024 / 1024)} MB` : 'Unknown'}</div>
                          <div>Usage: {storageEstimate.usage ? `${Math.round(storageEstimate.usage / 1024 / 1024)} MB` : 'Unknown'}</div>
                        </>
                      ) : (
                        <div className="text-gray-600 dark:text-gray-400">Unavailable</div>
                      )}
                    </div>

                    <div className="space-y-1 text-sm">
                      <p className="font-medium text-gray-900 dark:text-gray-100">WebGL Capabilities</p>
                      {webglCaps?.supported ? (
                        <>
                          <div>Version: {webglCaps.version}</div>
                          <div>Max Texture: {webglCaps.maxTextureSize}</div>
                          <div>Max Renderbuffer: {webglCaps.maxRenderbufferSize}</div>
                        </>
                      ) : (
                        <div className="text-gray-600 dark:text-gray-400">Unavailable</div>
                      )}
                    </div>
                  </div>
                </div>
              </Card>
            </div>
          )}

          {activeTab === 'permissions' && (
            <Card>
              <div className="space-y-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Shield className="w-5 h-5" />
                  Permissions & Security
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Security</p>
                    <div>Secure Context: {window.isSecureContext ? 'Yes' : 'No'}</div>
                    <div>Cookies Enabled: {navigator.cookieEnabled ? 'Yes' : 'No'}</div>
                    <div>
                      localStorage: {(() => {
                        try {
                          const k = '__test__';
                          localStorage.setItem(k, '1');
                          localStorage.removeItem(k);
                          return 'Available';
                        } catch {
                          return 'Unavailable';
                        }
                      })()}
                    </div>
                  </div>

                  <div className="space-y-1">
                    <p className="font-medium text-gray-900 dark:text-gray-100">Permissions</p>
                    {permissionStates?.supported ? (
                      <>
                        <div>Camera: {permissionStates.camera}</div>
                        <div>Microphone: {permissionStates.microphone}</div>
                        <div>Geolocation: {permissionStates.geolocation}</div>
                        <div>Notifications: {permissionStates.notifications}</div>
                      </>
                    ) : (
                      <div className="text-gray-600 dark:text-gray-400">Permissions API unavailable</div>
                    )}
                  </div>
                </div>
              </div>
            </Card>
          )}

          {activeTab === 'power' && (
            <div className="space-y-6">
              <Card>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                    <Battery className="w-5 h-5" />
                    Battery
                  </h3>

                  {batteryInfo?.supported ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                      <div>Level: {typeof batteryInfo.level === 'number' ? `${Math.round(batteryInfo.level * 100)}%` : 'Unknown'}</div>
                      <div>Charging: {batteryInfo.charging ? 'Yes' : 'No'}</div>
                      <div>Charging Time: {Number.isFinite(batteryInfo.chargingTime) ? `${Math.round(batteryInfo.chargingTime)}s` : 'Unknown'}</div>
                      <div>Discharging Time: {Number.isFinite(batteryInfo.dischargingTime) ? `${Math.round(batteryInfo.dischargingTime)}s` : 'Unknown'}</div>
                    </div>
                  ) : (
                    <p className="text-sm text-gray-600 dark:text-gray-400">Battery API unavailable</p>
                  )}
                </div>
              </Card>

              <Card>
                <div className="space-y-3">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Sensors
                  </h3>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>Orientation Supported: {sensorInfo.orientationSupported ? 'Yes' : 'No'}</div>
                    <div>Motion Supported: {sensorInfo.motionSupported ? 'Yes' : 'No'}</div>
                    <div>Orientation Permission: {sensorInfo.orientationPermission}</div>
                    <div>Motion Permission: {sensorInfo.motionPermission}</div>
                  </div>

                  {(typeof window.DeviceOrientationEvent?.requestPermission === 'function' || typeof window.DeviceMotionEvent?.requestPermission === 'function') && (
                    <Button onClick={requestSensorPermissions} variant="outline">Request Sensor Permissions</Button>
                  )}
                </div>
              </Card>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
