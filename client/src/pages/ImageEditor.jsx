import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { 
  Upload, Download, RotateCcw, RotateCw, FlipHorizontal, FlipVertical,
  Crop, Type, Square, Circle, ArrowRight, Layers, Image as ImageIcon,
  Sliders, Wand2, Undo2, Redo2, Trash2, ChevronLeft, ChevronRight,
  Grid3X3, Merge, X, Check
} from 'lucide-react';
import Card from '../components/ui/Card';
import Button from '../components/ui/Button';

const TABS = {
  EDIT: 'edit',
  FILTERS: 'filters',
  MERGE: 'merge',
  ANNOTATE: 'annotate'
};

const ANNOTATION_TOOLS = {
  NONE: 'none',
  TEXT: 'text',
  RECT: 'rect',
  CIRCLE: 'circle',
  ARROW: 'arrow'
};

export default function ImageEditor() {
  const fileInputRef = useRef(null);
  const canvasRef = useRef(null);
  const containerRef = useRef(null);
  const isProcessingRef = useRef(false);
  const historyIndexRef = useRef(-1);
  const activeImageIdRef = useRef(null);
  const [images, setImages] = useState([]);
  const [activeImageId, setActiveImageId] = useState(null);
  const [activeTab, setActiveTab] = useState(TABS.EDIT);
  const [isProcessing, setIsProcessing] = useState(false);
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);
  const [canvasSize, setCanvasSize] = useState({ width: 0, height: 0 });
  
  // Edit states
  const [editValues, setEditValues] = useState({
    width: '',
    height: '',
    maintainAspect: true,
    rotate: 0,
    flipH: false,
    flipV: false
  });
  
  // Filter states
  const [filterValues, setFilterValues] = useState({
    brightness: 0,
    contrast: 0,
    saturation: 100,
    blur: 0,
    hue: 0,
    grayscale: false,
    sepia: false,
    sharpen: false
  });
  
  // Merge states
  const [mergeImageId, setMergeImageId] = useState(null);
  const [mergeMode, setMergeMode] = useState('horizontal');
  const [mergeOptions, setMergeOptions] = useState({ opacity: 1, blend: 'over' });
  
  // Annotation states
  const [activeTool, setActiveTool] = useState(ANNOTATION_TOOLS.NONE);
  const [annotations, setAnnotations] = useState([]);
  const [currentAnnotation, setCurrentAnnotation] = useState(null);
  const [textInput, setTextInput] = useState('');
  const [showTextInput, setShowTextInput] = useState(false);
  const [textPosition, setTextPosition] = useState({ nx: 0, ny: 0 });
  
  // Crop states
  const [isCropping, setIsCropping] = useState(false);
  const [cropStart, setCropStart] = useState(null);
  const [cropRect, setCropRect] = useState(null);

  const activeImage = images.find(img => img.id === activeImageId);

  useEffect(() => {
    isProcessingRef.current = isProcessing;
  }, [isProcessing]);

  useEffect(() => {
    historyIndexRef.current = historyIndex;
  }, [historyIndex]);

  useEffect(() => {
    activeImageIdRef.current = activeImageId;
  }, [activeImageId]);

  const loadImageElement = useCallback((src) => {
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = reject;
      img.src = src;
    });
  }, []);

  const computeContainRect = useCallback((imgW, imgH, viewW, viewH) => {
    if (!imgW || !imgH || !viewW || !viewH) {
      return { x: 0, y: 0, width: 0, height: 0, scale: 1 };
    }
    const scale = Math.min(viewW / imgW, viewH / imgH);
    const width = imgW * scale;
    const height = imgH * scale;
    const x = (viewW - width) / 2;
    const y = (viewH - height) / 2;
    return { x, y, width, height, scale };
  }, []);

  const clientPointToNormalized = useCallback((clientX, clientY) => {
    if (!containerRef.current || !activeImage) return null;
    const rect = containerRef.current.getBoundingClientRect();
    const localX = clientX - rect.left;
    const localY = clientY - rect.top;

    const contain = computeContainRect(activeImage.width, activeImage.height, canvasSize.width, canvasSize.height);
    if (!contain.width || !contain.height) return null;

    const xIn = localX - contain.x;
    const yIn = localY - contain.y;
    const nx = xIn / contain.width;
    const ny = yIn / contain.height;
    if (nx < 0 || nx > 1 || ny < 0 || ny > 1) return null;
    return { nx, ny };
  }, [activeImage, canvasSize.width, canvasSize.height, computeContainRect]);

  const normalizedToImagePx = useCallback((nx, ny) => {
    if (!activeImage) return null;
    return {
      x: Math.round(nx * activeImage.width),
      y: Math.round(ny * activeImage.height)
    };
  }, [activeImage]);

  const pushHistorySnapshot = useCallback((imageId, snapshot) => {
    setHistory((prev) => {
      const next = prev.slice(0, historyIndexRef.current + 1);
      next.push({ imageId, snapshot });
      return next;
    });
    setHistoryIndex((prev) => {
      const next = prev + 1;
      historyIndexRef.current = next;
      return next;
    });
  }, []);

  const snapshotFromImage = useCallback((img) => {
    return {
      dataUrl: img.dataUrl,
      width: img.width,
      height: img.height
    };
  }, []);

  const applyCanvasTransform = useCallback(async (srcDataUrl, ops) => {
    const imgEl = await loadImageElement(srcDataUrl);
    const width = ops?.resize?.width ? parseInt(ops.resize.width, 10) : imgEl.naturalWidth;
    const height = ops?.resize?.height ? parseInt(ops.resize.height, 10) : imgEl.naturalHeight;

    const off = document.createElement('canvas');
    off.width = width;
    off.height = height;
    const ctx = off.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D not supported');

    const rotate = ops?.rotate ? (parseInt(ops.rotate, 10) || 0) : 0;
    const flipH = !!ops?.flip?.horizontal;
    const flipV = !!ops?.flip?.vertical;

    const filters = [];
    if (typeof ops?.brightness === 'number') filters.push(`brightness(${(100 + ops.brightness) / 100})`);
    if (typeof ops?.contrast === 'number') filters.push(`contrast(${(100 + ops.contrast) / 100})`);
    if (typeof ops?.saturation === 'number') filters.push(`saturate(${ops.saturation / 100})`);
    if (typeof ops?.blur === 'number') filters.push(`blur(${ops.blur}px)`);
    if (typeof ops?.hue === 'number') filters.push(`hue-rotate(${ops.hue}deg)`);
    if (ops?.grayscale) filters.push('grayscale(1)');
    if (ops?.sepia) filters.push('sepia(1)');
    ctx.filter = filters.join(' ');

    ctx.save();
    ctx.translate(width / 2, height / 2);
    if (rotate) ctx.rotate((rotate * Math.PI) / 180);
    ctx.scale(flipH ? -1 : 1, flipV ? -1 : 1);

    const drawW = width;
    const drawH = height;
    ctx.drawImage(imgEl, -drawW / 2, -drawH / 2, drawW, drawH);
    ctx.restore();

    let outCanvas = off;

    if (ops?.crop) {
      const { left, top, width: cw, height: ch } = ops.crop;
      const cropC = document.createElement('canvas');
      cropC.width = Math.max(1, parseInt(cw, 10));
      cropC.height = Math.max(1, parseInt(ch, 10));
      const cropCtx = cropC.getContext('2d');
      if (!cropCtx) throw new Error('Canvas 2D not supported');
      cropCtx.drawImage(outCanvas, parseInt(left, 10), parseInt(top, 10), cropC.width, cropC.height, 0, 0, cropC.width, cropC.height);
      outCanvas = cropC;
    }

    return {
      dataUrl: outCanvas.toDataURL('image/png'),
      width: outCanvas.width,
      height: outCanvas.height
    };
  }, [loadImageElement]);

  const applyFiltersToDataUrl = useCallback(async (srcDataUrl) => {
    return applyCanvasTransform(srcDataUrl, {
      brightness: filterValues.brightness,
      contrast: filterValues.contrast,
      saturation: filterValues.saturation,
      blur: filterValues.blur,
      hue: filterValues.hue,
      grayscale: filterValues.grayscale,
      sepia: filterValues.sepia
    });
  }, [applyCanvasTransform, filterValues]);

  const filtersAreDefault = useMemo(() => {
    return (
      filterValues.brightness === 0 &&
      filterValues.contrast === 0 &&
      filterValues.saturation === 100 &&
      filterValues.blur === 0 &&
      filterValues.hue === 0 &&
      filterValues.grayscale === false &&
      filterValues.sepia === false &&
      filterValues.sharpen === false
    );
  }, [filterValues]);

  const renderPreview = useCallback(async () => {
    if (!canvasRef.current || !activeImage) return;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    if (!activeImage.dataUrl) return;
    const imgEl = await loadImageElement(activeImage.dataUrl);
    const contain = computeContainRect(activeImage.width, activeImage.height, canvas.width, canvas.height);

    const filters = [];
    filters.push(`brightness(${(100 + filterValues.brightness) / 100})`);
    filters.push(`contrast(${(100 + filterValues.contrast) / 100})`);
    filters.push(`saturate(${filterValues.saturation / 100})`);
    filters.push(`blur(${filterValues.blur}px)`);
    filters.push(`hue-rotate(${filterValues.hue}deg)`);
    if (filterValues.grayscale) filters.push('grayscale(1)');
    if (filterValues.sepia) filters.push('sepia(1)');
    ctx.filter = filters.join(' ');

    ctx.drawImage(imgEl, contain.x, contain.y, contain.width, contain.height);
    ctx.filter = 'none';

    const drawText = (ann) => {
      const px = ann.nx * contain.width + contain.x;
      const py = ann.ny * contain.height + contain.y;
      ctx.fillStyle = ann.color || '#000000';
      ctx.font = `${ann.fontSize || 24}px ${ann.fontFamily || 'Arial'}`;
      ctx.textBaseline = 'top';
      ctx.fillText(ann.text || '', px, py);
    };

    const drawRect = (ann) => {
      const x = ann.nx * contain.width + contain.x;
      const y = ann.ny * contain.height + contain.y;
      const w = (ann.nw || 0) * contain.width;
      const h = (ann.nh || 0) * contain.height;
      ctx.strokeStyle = ann.stroke || '#ef4444';
      ctx.lineWidth = ann.strokeWidth || 2;
      ctx.strokeRect(x, y, w, h);
    };

    const drawCircle = (ann) => {
      const cx = ann.nx * contain.width + contain.x;
      const cy = ann.ny * contain.height + contain.y;
      const r = (ann.nr || 0) * Math.min(contain.width, contain.height);
      ctx.strokeStyle = ann.stroke || '#ef4444';
      ctx.lineWidth = ann.strokeWidth || 2;
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.stroke();
    };

    const drawArrow = (ann) => {
      const x1 = ann.nx1 * contain.width + contain.x;
      const y1 = ann.ny1 * contain.height + contain.y;
      const x2 = ann.nx2 * contain.width + contain.x;
      const y2 = ann.ny2 * contain.height + contain.y;
      ctx.strokeStyle = ann.stroke || '#ef4444';
      ctx.lineWidth = ann.strokeWidth || 3;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    };

    for (const ann of annotations) {
      if (ann.type === 'text') drawText(ann);
      if (ann.type === 'rect') drawRect(ann);
      if (ann.type === 'circle') drawCircle(ann);
      if (ann.type === 'arrow') drawArrow(ann);
    }
    if (currentAnnotation) {
      const ann = currentAnnotation;
      if (ann.type === 'rect') drawRect(ann);
      if (ann.type === 'circle') drawCircle(ann);
      if (ann.type === 'arrow') drawArrow(ann);
    }

    if (isCropping && cropRect) {
      const x = cropRect.nx * contain.width + contain.x;
      const y = cropRect.ny * contain.height + contain.y;
      const w = cropRect.nw * contain.width;
      const h = cropRect.nh * contain.height;
      ctx.strokeStyle = '#22c55e';
      ctx.lineWidth = 2;
      ctx.setLineDash([8, 6]);
      ctx.strokeRect(x, y, w, h);
      ctx.setLineDash([]);
    }
  }, [activeImage, annotations, currentAnnotation, cropRect, isCropping, computeContainRect, filterValues, loadImageElement]);

  useEffect(() => {
    let cancelled = false;
    const run = async () => {
      try {
        await renderPreview();
      } catch (e) {
        if (!cancelled) console.error(e);
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [renderPreview]);

  useEffect(() => {
    if (!containerRef.current) return;
    const el = containerRef.current;
    const ro = new ResizeObserver((entries) => {
      const entry = entries[0];
      const cr = entry.contentRect;
      setCanvasSize({ width: Math.floor(cr.width), height: Math.floor(cr.height) });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!canvasRef.current) return;
    canvasRef.current.width = canvasSize.width;
    canvasRef.current.height = canvasSize.height;
  }, [canvasSize.width, canvasSize.height]);

  // Handle file upload
  const handleFileSelect = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setIsProcessing(true);
    try {
      const newImages = await Promise.all(
        files.map(async (file, index) => {
          const dataUrl = await new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });
          const imgEl = await loadImageElement(dataUrl);
          return {
            id: `img_${Date.now()}_${index}`,
            filename: file.name,
            width: imgEl.naturalWidth,
            height: imgEl.naturalHeight,
            format: 'png',
            dataUrl,
            baseDataUrl: dataUrl
          };
        })
      );

      setImages((prev) => [...prev, ...newImages]);
      if (!activeImageId) {
        setActiveImageId(newImages[0].id);
      }
      setHistory([]);
      setHistoryIndex(-1);
      setCanUndo(false);
      setCanRedo(false);
    } catch (err) {
      console.error('Upload failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const applyOperations = useCallback(async (operations) => {
    const imageId = activeImageIdRef.current;
    if (!imageId || isProcessingRef.current || !activeImage) return;

    setIsProcessing(true);
    try {
      pushHistorySnapshot(imageId, snapshotFromImage(activeImage));
      const result = await applyCanvasTransform(activeImage.dataUrl, operations);
      setImages((prev) => prev.map((img) => img.id === imageId ? { ...img, dataUrl: result.dataUrl, width: result.width, height: result.height } : img));
      setCanUndo(true);
      setCanRedo(false);
    } catch (err) {
      console.error('Processing failed:', err);
    } finally {
      setIsProcessing(false);
    }
  }, [activeImage, applyCanvasTransform, pushHistorySnapshot, snapshotFromImage]);


  // Handle resize
  const handleResize = () => {
    applyOperations({
      resize: {
        width: editValues.width || undefined,
        height: editValues.height || undefined
      }
    });
  };

  // Handle rotate
  const handleRotate = (degrees) => {
    const newRotate = editValues.rotate + degrees;
    setEditValues(prev => ({ ...prev, rotate: newRotate }));
    applyOperations({ rotate: newRotate });
  };

  // Handle flip
  const handleFlip = (direction) => {
    const isHorizontal = direction === 'h';
    setEditValues(prev => ({
      ...prev,
      flipH: isHorizontal ? !prev.flipH : prev.flipH,
      flipV: !isHorizontal ? !prev.flipV : prev.flipV
    }));
    applyOperations({
      flip: {
        horizontal: isHorizontal ? !editValues.flipH : editValues.flipH,
        vertical: !isHorizontal ? !editValues.flipV : editValues.flipV
      }
    });
  };

  // Handle crop
  const handleCrop = () => {
    if (cropRect) {
      const start = normalizedToImagePx(cropRect.nx, cropRect.ny);
      const end = normalizedToImagePx(cropRect.nx + cropRect.nw, cropRect.ny + cropRect.nh);
      if (start && end) {
        const left = Math.min(start.x, end.x);
        const top = Math.min(start.y, end.y);
        const width = Math.max(1, Math.abs(end.x - start.x));
        const height = Math.max(1, Math.abs(end.y - start.y));
        applyOperations({ crop: { left, top, width, height } });
      }
      setCropRect(null);
      setIsCropping(false);
    }
  };

  // Handle merge
  const handleMerge = async () => {
    if (!mergeImageId || !activeImageId || isProcessing) return;
    
    setIsProcessing(true);
    try {
      const base = images.find((img) => img.id === activeImageId);
      const overlay = images.find((img) => img.id === mergeImageId);
      if (!base || !overlay) return;

      const img1 = await loadImageElement(base.dataUrl);
      const img2 = await loadImageElement(overlay.dataUrl);

      let outW = 0;
      let outH = 0;
      if (mergeMode === 'horizontal') {
        outW = base.width + overlay.width;
        outH = Math.max(base.height, overlay.height);
      } else if (mergeMode === 'vertical') {
        outW = Math.max(base.width, overlay.width);
        outH = base.height + overlay.height;
      } else {
        outW = base.width;
        outH = base.height;
      }

      const c = document.createElement('canvas');
      c.width = outW;
      c.height = outH;
      const ctx = c.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D not supported');

      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, outW, outH);

      if (mergeMode === 'horizontal') {
        ctx.drawImage(img1, 0, 0, base.width, base.height);
        ctx.drawImage(img2, base.width, 0, overlay.width, overlay.height);
      } else if (mergeMode === 'vertical') {
        ctx.drawImage(img1, 0, 0, base.width, base.height);
        ctx.drawImage(img2, 0, base.height, overlay.width, overlay.height);
      } else {
        ctx.drawImage(img1, 0, 0, base.width, base.height);
        ctx.globalAlpha = typeof mergeOptions.opacity === 'number' ? mergeOptions.opacity : 1;
        const blendMap = {
          over: 'source-over',
          multiply: 'multiply',
          screen: 'screen',
          overlay: 'overlay'
        };
        ctx.globalCompositeOperation = blendMap[mergeOptions.blend] || 'source-over';
        ctx.drawImage(img2, 0, 0, base.width, base.height);
        ctx.globalAlpha = 1;
        ctx.globalCompositeOperation = 'source-over';
      }

      const newImage = {
        id: `merged_${Date.now()}`,
        filename: 'merged.png',
        width: outW,
        height: outH,
        dataUrl: c.toDataURL('image/png'),
        format: 'png'
      };
      setImages((prev) => [...prev, newImage]);
      setActiveImageId(newImage.id);
      setActiveTab(TABS.EDIT);
    } catch (err) {
      console.error('Merge failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle annotations
  const handleCanvasClick = (e) => {
    if (isCropping) return;
    if (activeTool === ANNOTATION_TOOLS.NONE || !containerRef.current) return;
    const p = clientPointToNormalized(e.clientX, e.clientY);
    if (!p) return;
    const { nx, ny } = p;
    
    if (activeTool === ANNOTATION_TOOLS.TEXT) {
      setTextPosition({ nx, ny });
      setShowTextInput(true);
    } else if (activeTool === ANNOTATION_TOOLS.RECT || activeTool === ANNOTATION_TOOLS.CIRCLE) {
      setCurrentAnnotation({ type: activeTool, nx, ny, nw: 0, nh: 0, nr: 0 });
    } else if (activeTool === ANNOTATION_TOOLS.ARROW) {
      if (!currentAnnotation) {
        setCurrentAnnotation({ type: 'arrow', nx1: nx, ny1: ny, nx2: nx, ny2: ny });
      } else {
        const completedAnnotation = { ...currentAnnotation, nx2: nx, ny2: ny };
        setAnnotations(prev => [...prev, completedAnnotation]);
        setCurrentAnnotation(null);
      }
    }
  };

  const handleCanvasMouseMove = (e) => {
    if ((!currentAnnotation && !isCropping) || !containerRef.current) return;
    const p = clientPointToNormalized(e.clientX, e.clientY);
    if (!p) return;
    const { nx, ny } = p;

    if (isCropping && cropStart) {
      const nw = nx - cropStart.nx;
      const nh = ny - cropStart.ny;
      setCropRect({
        nx: nw < 0 ? nx : cropStart.nx,
        ny: nh < 0 ? ny : cropStart.ny,
        nw: Math.abs(nw),
        nh: Math.abs(nh)
      });
      return;
    }
    if (!currentAnnotation) return;
    
    if (currentAnnotation.type === 'rect') {
      setCurrentAnnotation(prev => ({
        ...prev,
        nw: nx - prev.nx,
        nh: ny - prev.ny
      }));
    } else if (currentAnnotation.type === 'circle') {
      const radius = Math.sqrt(Math.pow(nx - currentAnnotation.nx, 2) + Math.pow(ny - currentAnnotation.ny, 2));
      setCurrentAnnotation(prev => ({ ...prev, nr: radius }));
    } else if (currentAnnotation.type === 'arrow') {
      setCurrentAnnotation(prev => ({ ...prev, nx2: nx, ny2: ny }));
    }
  };

  const handleCanvasMouseUp = () => {
    if (isCropping) {
      setCropStart(null);
      return;
    }
    if (currentAnnotation && currentAnnotation.type !== 'arrow') {
      if (currentAnnotation.type === 'rect') {
        const nw = currentAnnotation.nw;
        const nh = currentAnnotation.nh;
        const nx = nw < 0 ? currentAnnotation.nx + nw : currentAnnotation.nx;
        const ny = nh < 0 ? currentAnnotation.ny + nh : currentAnnotation.ny;
        setAnnotations(prev => [...prev, { ...currentAnnotation, nx, ny, nw: Math.abs(nw), nh: Math.abs(nh) }]);
        setCurrentAnnotation(null);
        return;
      }
      setAnnotations(prev => [...prev, currentAnnotation]);
      setCurrentAnnotation(null);
    }
  };

  const applyAnnotations = async () => {
    if (annotations.length === 0 || !activeImage) return;

    setIsProcessing(true);
    try {
      pushHistorySnapshot(activeImage.id, snapshotFromImage(activeImage));
      const imgEl = await loadImageElement(activeImage.dataUrl);
      const off = document.createElement('canvas');
      off.width = activeImage.width;
      off.height = activeImage.height;
      const ctx = off.getContext('2d');
      if (!ctx) throw new Error('Canvas 2D not supported');
      ctx.drawImage(imgEl, 0, 0, off.width, off.height);

      for (const ann of annotations) {
        if (ann.type === 'text') {
          ctx.fillStyle = ann.color || '#000000';
          ctx.font = `${ann.fontSize || 24}px ${ann.fontFamily || 'Arial'}`;
          ctx.textBaseline = 'top';
          ctx.fillText(ann.text || '', ann.nx * off.width, ann.ny * off.height);
        }
        if (ann.type === 'rect') {
          ctx.strokeStyle = ann.stroke || '#ef4444';
          ctx.lineWidth = ann.strokeWidth || 2;
          ctx.strokeRect(ann.nx * off.width, ann.ny * off.height, (ann.nw || 0) * off.width, (ann.nh || 0) * off.height);
        }
        if (ann.type === 'circle') {
          ctx.strokeStyle = ann.stroke || '#ef4444';
          ctx.lineWidth = ann.strokeWidth || 2;
          const r = (ann.nr || 0) * Math.min(off.width, off.height);
          ctx.beginPath();
          ctx.arc(ann.nx * off.width, ann.ny * off.height, r, 0, Math.PI * 2);
          ctx.stroke();
        }
        if (ann.type === 'arrow') {
          ctx.strokeStyle = ann.stroke || '#ef4444';
          ctx.lineWidth = ann.strokeWidth || 3;
          ctx.beginPath();
          ctx.moveTo(ann.nx1 * off.width, ann.ny1 * off.height);
          ctx.lineTo(ann.nx2 * off.width, ann.ny2 * off.height);
          ctx.stroke();
        }
      }

      const dataUrl = off.toDataURL('image/png');
      setImages((prev) => prev.map((img) => img.id === activeImage.id ? { ...img, dataUrl } : img));
      setAnnotations([]);
      setActiveTool(ANNOTATION_TOOLS.NONE);
      setCanUndo(true);
      setCanRedo(false);
    } catch (err) {
      console.error('Annotation failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  // Handle download
  const handleDownload = async (format = 'png') => {
    if (!activeImage) return;
    try {
      const exportResult = filtersAreDefault ? null : await applyFiltersToDataUrl(activeImage.dataUrl);
      const href = exportResult?.dataUrl || activeImage.dataUrl;
      const link = document.createElement('a');
      link.href = href;
      const ext = format === 'jpg' ? 'jpeg' : format;
      link.download = `edited-${activeImage.filename?.replace(/\.[^/.]+$/, '') || 'image'}.${ext}`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      console.error('Download failed:', err);
    }
  };

  // Undo/Redo
  const undo = async () => {
    if (!activeImageId || !canUndo || isProcessingRef.current) return;
    const idx = historyIndexRef.current;
    const prevItem = history[idx];
    if (!prevItem || prevItem.imageId !== activeImageId) return;
    setIsProcessing(true);
    try {
      setImages((prev) => prev.map((img) => {
        if (img.id !== activeImageId) return img;
        return { ...img, ...prevItem.snapshot };
      }));
      setHistoryIndex((p) => {
        const next = Math.max(-1, p - 1);
        historyIndexRef.current = next;
        return next;
      });
      setCanUndo(idx - 1 >= 0);
      setCanRedo(true);
    } finally {
      setIsProcessing(false);
    }
  };

  const redo = async () => {
    if (!activeImageId || !canRedo || isProcessingRef.current) return;
    const nextIdx = historyIndexRef.current + 1;
    const nextItem = history[nextIdx];
    if (!nextItem || nextItem.imageId !== activeImageId) return;
    setIsProcessing(true);
    try {
      setImages((prev) => prev.map((img) => {
        if (img.id !== activeImageId) return img;
        return { ...img, ...nextItem.snapshot };
      }));
      setHistoryIndex(() => {
        historyIndexRef.current = nextIdx;
        return nextIdx;
      });
      setCanUndo(true);
      setCanRedo(nextIdx < history.length - 1);
    } finally {
      setIsProcessing(false);
    }
  };

  // Delete image
  const deleteImage = (id) => {
    setImages(prev => prev.filter(img => img.id !== id));
    if (activeImageId === id) {
      const remaining = images.filter(img => img.id !== id);
      setActiveImageId(remaining.length > 0 ? remaining[0].id : null);
    }
  };

  return (
    <div className="p-4 sm:p-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex items-center justify-between mb-4 sm:mb-6">
          <h2 className="text-xl sm:text-2xl font-bold text-gray-900 dark:text-gray-100">
            Image Editor
          </h2>
          <div className="flex gap-2">
            <Button onClick={undo} variant="secondary" disabled={!canUndo}>
              <Undo2 className="w-4 h-4" />
            </Button>
            <Button onClick={redo} variant="secondary" disabled={!canRedo}>
              <Redo2 className="w-4 h-4" />
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              accept="image/*"
              onChange={handleFileSelect}
              className="hidden"
            />
            <Button onClick={() => fileInputRef.current?.click()} variant="secondary">
              <Upload className="w-4 h-4 mr-2" />
              Upload
            </Button>
            <Button onClick={() => handleDownload('png')} disabled={!activeImage}>
              <Download className="w-4 h-4 mr-2" />
              Export
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Left sidebar - Image thumbnails */}
          <div className="lg:col-span-1 space-y-4">
            <Card padding="md">
              <h3 className="font-semibold text-gray-900 dark:text-gray-100 mb-3 flex items-center gap-2">
                <Grid3X3 className="w-4 h-4" />
                Images ({images.length})
              </h3>
              <div className="grid grid-cols-2 lg:grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                {images.map(img => (
                  <div
                    key={img.id}
                    onClick={() => setActiveImageId(img.id)}
                    className={`relative group cursor-pointer rounded-xl overflow-hidden border-2 transition-all ${
                      activeImageId === img.id
                        ? 'border-indigo-500'
                        : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    {img.dataUrl ? (
                      <img 
                        src={img.dataUrl} 
                        alt={img.filename}
                        className="w-full h-24 object-cover"
                      />
                    ) : (
                      <div className="w-full h-24 bg-gray-100 dark:bg-gray-800 flex items-center justify-center">
                        <ImageIcon className="w-8 h-8 text-gray-400" />
                      </div>
                    )}
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteImage(img.id); }}
                        className="p-1.5 bg-red-500 text-white rounded-lg hover:bg-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                    <p className="absolute bottom-0 left-0 right-0 bg-black/60 text-white text-xs px-2 py-1 truncate">
                      {img.filename}
                    </p>
                  </div>
                ))}
                {images.length === 0 && (
                  <div className="col-span-2 p-4 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No images uploaded. Click Upload to add images.
                  </div>
                )}
              </div>
            </Card>
          </div>

          {/* Center - Canvas/Preview */}
          <div className="lg:col-span-2">
            <Card padding="none" className="h-[500px] relative overflow-hidden bg-gray-900">
              {activeImage ? (
                <div 
                  ref={containerRef}
                  className="w-full h-full flex items-center justify-center cursor-crosshair relative"
                  onClick={handleCanvasClick}
                  onMouseDown={(e) => {
                    if (!isCropping) return;
                    const p = clientPointToNormalized(e.clientX, e.clientY);
                    if (!p) return;
                    setCropStart(p);
                    setCropRect({ nx: p.nx, ny: p.ny, nw: 0, nh: 0 });
                  }}
                  onMouseMove={handleCanvasMouseMove}
                  onMouseUp={handleCanvasMouseUp}
                  onMouseLeave={handleCanvasMouseUp}
                >
                  <canvas ref={canvasRef} className="w-full h-full" />
                  
                  {isProcessing && (
                    <div className="absolute inset-0 bg-black/50 flex items-center justify-center">
                      <div className="bg-white dark:bg-gray-800 px-4 py-2 rounded-xl flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm">Processing...</span>
                      </div>
                    </div>
                  )}
                </div>
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-500 dark:text-gray-400">
                  <div className="text-center">
                    <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                    <p>Upload an image to start editing</p>
                  </div>
                </div>
              )}
              
              {/* Text input popup */}
              {showTextInput && (
                <div 
                  className="absolute bg-white dark:bg-gray-800 p-2 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700 z-10"
                  style={{ left: `${(textPosition.nx ?? 0) * 100}%`, top: `${(textPosition.ny ?? 0) * 100}%` }}
                >
                  <input
                    type="text"
                    value={textInput}
                    onChange={(e) => setTextInput(e.target.value)}
                    placeholder="Enter text..."
                    className="w-48 px-2 py-1 bg-gray-100 dark:bg-gray-700 rounded text-sm mb-2"
                    autoFocus
                  />
                  <div className="flex gap-2">
                    <Button 
                      size="sm" 
                      onClick={() => {
                        if (textInput.trim()) {
                          setAnnotations(prev => [...prev, {
                            type: 'text',
                            nx: textPosition.nx,
                            ny: textPosition.ny,
                            text: textInput,
                            fontSize: 24,
                            color: '#000000'
                          }]);
                        }
                        setShowTextInput(false);
                        setTextInput('');
                      }}
                    >
                      <Check className="w-3 h-3" />
                    </Button>
                    <Button 
                      size="sm" 
                      variant="secondary"
                      onClick={() => {
                        setShowTextInput(false);
                        setTextInput('');
                      }}
                    >
                      <X className="w-3 h-3" />
                    </Button>
                  </div>
                </div>
              )}
            </Card>
            
            {activeImage && (
              <div className="mt-2 text-sm text-gray-500 dark:text-gray-400 text-center">
                {activeImage.width} × {activeImage.height} px
              </div>
            )}
          </div>

          {/* Right sidebar - Tools */}
          <div className="lg:col-span-1">
            <Card padding="md" className="h-[500px] overflow-y-auto">
              {/* Tabs */}
              <div className="flex border-b border-gray-200 dark:border-gray-700 mb-4">
                {[
                  { id: TABS.EDIT, icon: Sliders, label: 'Edit' },
                  { id: TABS.FILTERS, icon: Wand2, label: 'Filters' },
                  { id: TABS.MERGE, icon: Merge, label: 'Merge' },
                  { id: TABS.ANNOTATE, icon: Type, label: 'Annotate' }
                ].map(tab => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 py-2 px-1 text-xs font-medium flex flex-col items-center gap-1 transition-colors ${
                      activeTab === tab.id
                        ? 'text-indigo-600 dark:text-indigo-400 border-b-2 border-indigo-500'
                        : 'text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300'
                    }`}
                  >
                    <tab.icon className="w-4 h-4" />
                    {tab.label}
                  </button>
                ))}
              </div>

              {/* Edit Tab */}
              {activeTab === TABS.EDIT && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Resize
                    </label>
                    <div className="grid grid-cols-2 gap-2 mb-2">
                      <input
                        type="number"
                        placeholder="Width"
                        value={editValues.width}
                        onChange={(e) => setEditValues(prev => ({ ...prev, width: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                      />
                      <input
                        type="number"
                        placeholder="Height"
                        value={editValues.height}
                        onChange={(e) => setEditValues(prev => ({ ...prev, height: e.target.value }))}
                        className="w-full px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                      />
                    </div>
                    <Button size="sm" onClick={handleResize} className="w-full">
                      Apply Resize
                    </Button>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Rotate
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleRotate(-90)} className="flex-1">
                        <RotateCcw className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleRotate(90)} className="flex-1">
                        <RotateCw className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Flip
                    </label>
                    <div className="flex gap-2">
                      <Button size="sm" variant="secondary" onClick={() => handleFlip('h')} className="flex-1">
                        <FlipHorizontal className="w-4 h-4" />
                      </Button>
                      <Button size="sm" variant="secondary" onClick={() => handleFlip('v')} className="flex-1">
                        <FlipVertical className="w-4 h-4" />
                      </Button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Crop
                    </label>
                    <Button 
                      size="sm" 
                      variant={isCropping ? 'primary' : 'secondary'}
                      onClick={() => setIsCropping(!isCropping)}
                      className="w-full"
                    >
                      <Crop className="w-4 h-4 mr-2" />
                      {isCropping ? 'Cancel Crop' : 'Start Crop'}
                    </Button>
                    {cropRect && (
                      <Button size="sm" onClick={handleCrop} className="w-full mt-2">
                        <Check className="w-4 h-4 mr-2" />
                        Apply Crop
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Filters Tab */}
              {activeTab === TABS.FILTERS && (
                <div className="space-y-4">
                  {[
                    { key: 'brightness', label: 'Brightness', min: -100, max: 100 },
                    { key: 'contrast', label: 'Contrast', min: -100, max: 100 },
                    { key: 'saturation', label: 'Saturation', min: 0, max: 200 },
                    { key: 'blur', label: 'Blur', min: 0, max: 20 },
                    { key: 'hue', label: 'Hue Rotate', min: 0, max: 360 }
                  ].map(({ key, label, min, max }) => (
                    <div key={key}>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {label}: {filterValues[key]}
                      </label>
                      <input
                        type="range"
                        min={min}
                        max={max}
                        value={filterValues[key]}
                        onChange={(e) => setFilterValues(prev => ({ ...prev, [key]: parseInt(e.target.value) }))}
                        className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                      />
                    </div>
                  ))}
                  
                  <div className="space-y-2">
                    {[
                      { key: 'grayscale', label: 'Grayscale' },
                      { key: 'sepia', label: 'Sepia' },
                      { key: 'sharpen', label: 'Sharpen' }
                    ].map(({ key, label }) => (
                      <label key={key} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={filterValues[key]}
                          onChange={(e) => setFilterValues(prev => ({ ...prev, [key]: e.target.checked }))}
                          className="w-4 h-4 rounded border-gray-300 text-indigo-600 focus:ring-indigo-500"
                        />
                        <span className="text-sm text-gray-700 dark:text-gray-300">{label}</span>
                      </label>
                    ))}
                  </div>

                  <Button 
                    size="sm" 
                    variant="secondary"
                    onClick={() => setFilterValues({
                      brightness: 0, contrast: 0, saturation: 100,
                      blur: 0, hue: 0, grayscale: false, sepia: false, sharpen: false
                    })}
                    className="w-full"
                  >
                    Reset Filters
                  </Button>
                </div>
              )}

              {/* Merge Tab */}
              {activeTab === TABS.MERGE && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Image to Merge
                    </label>
                    <select
                      value={mergeImageId || ''}
                      onChange={(e) => setMergeImageId(e.target.value || null)}
                      className="w-full px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                    >
                      <option value="">Select an image...</option>
                      {images.filter(img => img.id !== activeImageId).map(img => (
                        <option key={img.id} value={img.id}>{img.filename}</option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Merge Mode
                    </label>
                    <div className="grid grid-cols-3 gap-2">
                      {[
                        { id: 'horizontal', icon: ChevronRight, label: 'Side' },
                        { id: 'vertical', icon: ChevronRight, label: 'Stack' },
                        { id: 'overlay', icon: Layers, label: 'Blend' }
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => setMergeMode(id)}
                          className={`p-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-colors ${
                            mergeMode === id
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Icon className={`w-4 h-4 ${id === 'vertical' ? 'rotate-90' : ''}`} />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {mergeMode === 'overlay' && (
                    <>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                          Opacity: {Math.round(mergeOptions.opacity * 100)}%
                        </label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={mergeOptions.opacity * 100}
                          onChange={(e) => setMergeOptions(prev => ({ ...prev, opacity: parseInt(e.target.value) / 100 }))}
                          className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-lg appearance-none cursor-pointer accent-indigo-500"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                          Blend Mode
                        </label>
                        <select
                          value={mergeOptions.blend}
                          onChange={(e) => setMergeOptions(prev => ({ ...prev, blend: e.target.value }))}
                          className="w-full px-2 py-1.5 bg-gray-100 dark:bg-gray-800 rounded-lg text-sm"
                        >
                          <option value="over">Normal</option>
                          <option value="multiply">Multiply</option>
                          <option value="screen">Screen</option>
                          <option value="overlay">Overlay</option>
                        </select>
                      </div>
                    </>
                  )}

                  <Button 
                    onClick={handleMerge}
                    disabled={!mergeImageId || isProcessing}
                    className="w-full"
                  >
                    <Merge className="w-4 h-4 mr-2" />
                    Merge Images
                  </Button>
                </div>
              )}

              {/* Annotate Tab */}
              {activeTab === TABS.ANNOTATE && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                      Select Tool
                    </label>
                    <div className="grid grid-cols-2 gap-2">
                      {[
                        { id: ANNOTATION_TOOLS.TEXT, icon: Type, label: 'Text' },
                        { id: ANNOTATION_TOOLS.RECT, icon: Square, label: 'Rect' },
                        { id: ANNOTATION_TOOLS.CIRCLE, icon: Circle, label: 'Circle' },
                        { id: ANNOTATION_TOOLS.ARROW, icon: ArrowRight, label: 'Arrow' }
                      ].map(({ id, icon: Icon, label }) => (
                        <button
                          key={id}
                          onClick={() => setActiveTool(activeTool === id ? ANNOTATION_TOOLS.NONE : id)}
                          className={`p-2 rounded-lg text-xs flex flex-col items-center gap-1 transition-colors ${
                            activeTool === id
                              ? 'bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300'
                              : 'bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400'
                          }`}
                        >
                          <Icon className="w-4 h-4" />
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {annotations.length > 0 && (
                    <>
                      <p className="text-xs text-gray-500 dark:text-gray-400">
                        {annotations.length} annotation{annotations.length > 1 ? 's' : ''} ready
                      </p>
                      <Button size="sm" onClick={() => setAnnotations([])} variant="secondary" className="w-full">
                        <Trash2 className="w-3 h-3 mr-1" />
                        Clear All
                      </Button>
                      <Button onClick={applyAnnotations} disabled={isProcessing} className="w-full">
                        <Check className="w-4 h-4 mr-2" />
                        Apply Annotations
                      </Button>
                    </>
                  )}

                  <div className="text-xs text-gray-500 dark:text-gray-400">
                    <p className="font-medium mb-1">How to use:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Select a tool above</li>
                      <li>Click on image to place</li>
                      <li>For shapes: click and drag</li>
                      <li>For arrows: click start, click end</li>
                    </ul>
                  </div>
                </div>
              )}
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}
