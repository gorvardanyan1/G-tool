import { useState, useEffect, useRef, useCallback } from 'react';
import { Camera, Mic, MicOff, CameraOff, Play, Square, AlertCircle, CheckCircle, XCircle, RefreshCw } from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';
import api from '../utils/api';

export default function DeviceTester() {
  const [devices, setDevices] = useState({ cameras: [], microphones: [] });
  const [selectedCamera, setSelectedCamera] = useState('');
  const [selectedMicrophone, setSelectedMicrophone] = useState('');
  const [stream, setStream] = useState(null);
  const [isTestRunning, setIsTestRunning] = useState(false);
  const [permissions, setPermissions] = useState({ camera: null, microphone: null });
  const [audioLevel, setAudioLevel] = useState(0);
  const [status, setStatus] = useState('idle');
  const [error, setError] = useState('');
  const [browserInfo, setBrowserInfo] = useState('');

  const videoRef = useRef(null);
  const audioContextRef = useRef(null);
  const analyserRef = useRef(null);
  const animationFrameRef = useRef(null);

  // Get browser information
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
      
      setBrowserInfo(`${browserName} ${userAgent.match(/[\d.]+/)?.[0] || ''}`);
    };
    
    getBrowserInfo();
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

      setDevices({
        cameras: cameras.map(camera => ({
          deviceId: camera.deviceId,
          label: camera.label || `Camera ${cameras.indexOf(camera) + 1}`
        })),
        microphones: microphones.map(mic => ({
          deviceId: mic.deviceId,
          label: mic.label || `Microphone ${microphones.indexOf(mic) + 1}`
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

  // Start device test
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

  // Stop device test
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

      // Save test result if successful
      if (status === 'running') {
        await saveTestResult();
      }
    } catch (error) {
      console.error('Stop test error:', error);
      setError(`Error stopping test: ${error.message}`);
    }
  };

  // Switch camera
  const switchCamera = async (deviceId) => {
    if (!isTestRunning) {
      setSelectedCamera(deviceId);
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: { deviceId: { exact: deviceId } },
        audio: selectedMicrophone ? { deviceId: { exact: selectedMicrophone } } : true
      });

      // Update video track
      if (stream && videoRef.current) {
        const videoTrack = newStream.getVideoTracks()[0];
        const oldVideoTrack = stream.getVideoTracks()[0];
        
        if (oldVideoTrack) {
          stream.removeTrack(oldVideoTrack);
          oldVideoTrack.stop();
        }
        
        stream.addTrack(videoTrack);
        videoRef.current.srcObject = stream;
      }

      setSelectedCamera(deviceId);
    } catch (error) {
      console.error('Switch camera error:', error);
      setError(`Failed to switch camera: ${error.message}`);
    }
  };

  // Switch microphone
  const switchMicrophone = async (deviceId) => {
    if (!isTestRunning) {
      setSelectedMicrophone(deviceId);
      return;
    }

    try {
      const newStream = await navigator.mediaDevices.getUserMedia({
        video: selectedCamera ? { deviceId: { exact: selectedCamera } } : true,
        audio: { deviceId: { exact: deviceId } }
      });

      // Update audio track
      if (stream) {
        const audioTrack = newStream.getAudioTracks()[0];
        const oldAudioTrack = stream.getAudioTracks()[0];
        
        if (oldAudioTrack) {
          stream.removeTrack(oldAudioTrack);
          oldAudioTrack.stop();
        }
        
        stream.addTrack(audioTrack);

        // Reconnect audio analyser
        if (audioContextRef.current && analyserRef.current) {
          const source = audioContextRef.current.createMediaStreamSource(stream);
          source.connect(analyserRef.current);
        }
      }

      setSelectedMicrophone(deviceId);
    } catch (error) {
      console.error('Switch microphone error:', error);
      setError(`Failed to switch microphone: ${error.message}`);
    }
  };

  // Save test result to backend
  const saveTestResult = async () => {
    try {
      const cameraDevice = devices.cameras.find(c => c.deviceId === selectedCamera);
      const micDevice = devices.microphones.find(m => m.deviceId === selectedMicrophone);

      const testData = {
        camera: cameraDevice?.label || 'No camera',
        microphone: micDevice?.label || 'No microphone',
        status: 'success',
        browser: browserInfo
      };

      const { data } = await api.post('/device-test/log', testData);
      if (data.success) {
        console.log('Test result saved successfully');
      }
    } catch (error) {
      console.error('Failed to save test result:', error);
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopTest();
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

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-6xl mx-auto">
        <div className="mb-6">
          <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-2">
            Device Tester
          </h2>
          <p className="text-gray-600 dark:text-gray-400">
            Test your camera and microphone functionality with real-time monitoring.
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Camera Section */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Camera className="w-5 h-5" />
                  Camera
                </h3>
                {getStatusIcon('camera')}
              </div>

              {/* Camera Preview */}
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

              {/* Camera Selection */}
              {devices.cameras.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Camera
                  </label>
                  <select
                    value={selectedCamera}
                    onChange={(e) => switchCamera(e.target.value)}
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
            </div>
          </Card>

          {/* Microphone Section */}
          <Card>
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Mic className="w-5 h-5" />
                  Microphone
                </h3>
                {getStatusIcon('microphone')}
              </div>

              {/* Audio Level Meter */}
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

              {/* Microphone Selection */}
              {devices.microphones.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Select Microphone
                  </label>
                  <select
                    value={selectedMicrophone}
                    onChange={(e) => switchMicrophone(e.target.value)}
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
            </div>
          </Card>
        </div>

        {/* Control Panel */}
        <Card className="mt-6">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Status:</span>
                <span className={`text-sm font-medium ${
                  status === 'running' ? 'text-green-600 dark:text-green-400' :
                  status === 'error' ? 'text-red-600 dark:text-red-400' :
                  status === 'ready' ? 'text-blue-600 dark:text-blue-400' :
                  'text-gray-600 dark:text-gray-400'
                }`}>
                  {status.charAt(0).toUpperCase() + status.slice(1)}
                </span>
              </div>
              <div className="text-sm text-gray-600 dark:text-gray-400">
                {browserInfo}
              </div>
            </div>

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
                <Button onClick={startTest} disabled={status === 'error'}>
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
      </div>
    </div>
  );
}
