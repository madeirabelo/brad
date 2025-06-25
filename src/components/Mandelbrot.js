import React, { useRef, useEffect, useState, useCallback, useMemo } from 'react';
import './Mandelbrot.css';

const Mandelbrot = () => {
  const canvasRef = useRef(null);
  const [isRendering, setIsRendering] = useState(false);
  const [viewState, setViewState] = useState({
    centerX: -0.5,
    centerY: 0,
    zoom: 1,
    maxIterations: 100,
    colorScheme: 'classic',
    showCoordinates: false
  });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  
  // Touch state for mobile support
  const [touchState, setTouchState] = useState({
    isTouching: false,
    touchStart: { x: 0, y: 0 },
    initialDistance: 0,
    initialZoom: 1
  });

  // Color schemes - wrapped in useMemo to prevent recreation on every render
  const colorSchemes = useMemo(() => ({
    classic: (smooth, maxIterations) => {
      if (smooth === maxIterations) return '#000000';
      // Vibrant, cyclic color map using smooth coloring
      const hue = 360 * smooth / maxIterations;
      const sat = 100;
      const light = 50 + 30 * Math.sin(0.15 * hue); // Add some lightness variation
      return `hsl(${hue}, ${sat}%, ${light}%)`;
    },
    fire: (smooth, maxIterations) => {
      if (smooth === maxIterations) return '#000000';
      // Fire: red-yellow-white
      const t = smooth / maxIterations;
      const r = Math.floor(255 * Math.pow(t, 0.7));
      const g = Math.floor(100 * Math.pow(t, 1.2));
      const b = Math.floor(20 * Math.pow(t, 2));
      return `rgb(${r}, ${g}, ${b})`;
    },
    ocean: (smooth, maxIterations) => {
      if (smooth === maxIterations) return '#000000';
      // Ocean: blue-cyan-white
      const t = smooth / maxIterations;
      const r = Math.floor(20 * Math.pow(t, 2));
      const g = Math.floor(100 * Math.pow(t, 1.2));
      const b = Math.floor(255 * Math.pow(t, 0.7));
      return `rgb(${r}, ${g}, ${b})`;
    },
    grayscale: (smooth, maxIterations) => {
      if (smooth === maxIterations) return '#000000';
      const intensity = Math.floor(255 * (smooth / maxIterations));
      return `rgb(${intensity}, ${intensity}, ${intensity})`;
    }
  }), []);

  // Mandelbrot calculation with smooth coloring
  const mandelbrot = useCallback((x, y, maxIterations) => {
    let zx = 0;
    let zy = 0;
    let smooth = 0;

    while (zx * zx + zy * zy < 4 && smooth < maxIterations) {
      const temp = zx * zx - zy * zy + x;
      zy = 2 * zx * zy + y;
      zx = temp;
      smooth++;
    }

    if (smooth < maxIterations) {
      const zn = Math.sqrt(zx * zx + zy * zy);
      if (zn > 1) {
        smooth = smooth + 1 - Math.log2(Math.log2(zn));
      }
    }
    // Clamp smooth to [0, maxIterations]
    if (!isFinite(smooth) || isNaN(smooth) || smooth < 0) smooth = 0;
    if (smooth > maxIterations) smooth = maxIterations;

    return { smooth };
  }, []);

  // Render the fractal
  const renderFractal = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    const { width, height } = canvas;
    
    setIsRendering(true);

    // Use requestAnimationFrame for smooth rendering
    const render = () => {
      const { centerX, centerY, zoom, maxIterations, colorScheme, showCoordinates } = viewState;
      const colorFn = colorSchemes[colorScheme];

      // Calculate the viewport
      const scale = 4 / zoom;
      const left = centerX - scale / 2;
      const top = centerY - scale / 2;
      const pixelWidth = scale / width;
      const pixelHeight = scale / height;

      // Create image data for better performance
      const imageData = ctx.createImageData(width, height);
      const data = imageData.data;

      for (let py = 0; py < height; py++) {
        for (let px = 0; px < width; px++) {
          const x = left + px * pixelWidth;
          const y = top + py * pixelHeight;
          
          // Use smooth coloring
          const { smooth } = mandelbrot(x, y, maxIterations);
          let color = colorFn(smooth, maxIterations);
          if (smooth < maxIterations && (!color || color === '#000000')) {
            // Fallback: use a visible color if something goes wrong
            color = `hsl(${360 * smooth / maxIterations}, 100%, 50%)`;
          }

          // Debug log for the first 10 pixels in the first row
          if (py === 0 && px < 10) {
            // eslint-disable-next-line no-console
            console.log(`px: ${px}, py: ${py}, smooth: ${smooth}, maxIterations: ${maxIterations}, color: ${color}`);
          }
          
          // Parse color and set pixel
          let rgb;
          if (color.startsWith('rgb')) {
            rgb = color.match(/\d+/g).map(Number);
          } else if (color.startsWith('hsl')) {
            const hsl = color.match(/[\d.]+/g).map(Number);
            rgb = hslToRgb(hsl[0], hsl[1], hsl[2]);
          } else {
            rgb = hexToRgb(color);
          }
          
          const index = (py * width + px) * 4;
          data[index] = rgb[0];     // R
          data[index + 1] = rgb[1]; // G
          data[index + 2] = rgb[2]; // B
          data[index + 3] = 255;    // A
        }
      }

      ctx.putImageData(imageData, 0, 0);

      // Draw coordinate system overlay if enabled
      if (showCoordinates) {
        drawCoordinateSystem(ctx, width, height, left, top, scale);
      }

      setIsRendering(false);
    };

    render();
  }, [viewState, mandelbrot, colorSchemes]);

  // Draw coordinate system overlay
  const drawCoordinateSystem = (ctx, width, height, left, top, scale) => {
    ctx.save();
    
    // Set line style
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1.5;
    
    // Responsive font size based on canvas width
    const isMobile = width < 600;
    const fontSize = isMobile ? 12 : 18;
    const lineHeight = isMobile ? 14 : 20;
    
    ctx.font = `bold ${fontSize}px Arial`;
    ctx.fillStyle = '#FFFFFF';
    
    // Calculate coordinate ranges
    const right = left + scale;
    const bottom = top + scale;
    
    // Draw vertical line (y-axis)
    const centerX = width / 2;
    ctx.beginPath();
    ctx.moveTo(centerX, 0);
    ctx.lineTo(centerX, height);
    ctx.stroke();
    
    // Draw horizontal line (x-axis)
    const centerY = height / 2;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();
    
    // Responsive positioning
    const edgeMargin = isMobile ? 3 : 5;
    const topMargin = isMobile ? 16 : 24;
    const bottomMargin = isMobile ? 8 : 10;
    
    // Draw edge labels with smaller text on mobile
    ctx.textAlign = 'left';
    ctx.fillText(`x min = ${left.toFixed(3)}`, edgeMargin, centerY - (lineHeight / 2));
    ctx.textAlign = 'right';
    ctx.fillText(`x max = ${right.toFixed(3)}`, width - edgeMargin, centerY - (lineHeight / 2));
    ctx.textAlign = 'center';
    ctx.fillText(`y min = ${top.toFixed(3)}`, centerX, topMargin);
    ctx.fillText(`y max = ${bottom.toFixed(3)}`, centerX, height - bottomMargin);
    
    // Draw corner labels with smaller text on mobile
    ctx.textAlign = 'left';
    ctx.fillText(`(${left.toFixed(3)}, ${top.toFixed(3)})`, edgeMargin, topMargin);
    ctx.fillText(`(${left.toFixed(3)}, ${bottom.toFixed(3)})`, edgeMargin, height - bottomMargin);
    ctx.textAlign = 'right';
    ctx.fillText(`(${right.toFixed(3)}, ${top.toFixed(3)})`, width - edgeMargin, topMargin);
    ctx.fillText(`(${right.toFixed(3)}, ${bottom.toFixed(3)})`, width - edgeMargin, height - bottomMargin);
    
    ctx.restore();
  };

  // Convert hex to RGB
  const hexToRgb = (hex) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result ? [
      parseInt(result[1], 16),
      parseInt(result[2], 16),
      parseInt(result[3], 16)
    ] : [0, 0, 0];
  };

  // Convert HSL to RGB
  const hslToRgb = (h, s, l) => {
    h /= 360;
    s /= 100;
    l /= 100;

    const c = (1 - Math.abs(2 * l - 1)) * s;
    const x = c * (1 - Math.abs((h * 6) % 2 - 1));
    const m = l - c / 2;
    let r = 0, g = 0, b = 0;

    if (0 <= h && h < 1/6) {
      r = c; g = x; b = 0;
    } else if (1/6 <= h && h < 1/3) {
      r = x; g = c; b = 0;
    } else if (1/3 <= h && h < 1/2) {
      r = 0; g = c; b = x;
    } else if (1/2 <= h && h < 2/3) {
      r = 0; g = x; b = c;
    } else if (2/3 <= h && h < 5/6) {
      r = x; g = 0; b = c;
    } else if (5/6 <= h && h <= 1) {
      r = c; g = 0; b = x;
    }

    return [
      Math.round((r + m) * 255),
      Math.round((g + m) * 255),
      Math.round((b + m) * 255)
    ];
  };

  // Handle canvas resize
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const resizeCanvas = () => {
      const container = canvas.parentElement;
      canvas.width = container.clientWidth;
      canvas.height = container.clientHeight;
      renderFractal();
    };

    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    return () => window.removeEventListener('resize', resizeCanvas);
  }, [renderFractal]);

  // Re-render when view state changes
  useEffect(() => {
    renderFractal();
  }, [viewState, renderFractal]);

  // Mouse event handlers
  const handleMouseDown = (e) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseMove = (e) => {
    if (!isDragging) return;

    const canvas = canvasRef.current;
    const dx = (e.clientX - dragStart.x) / canvas.width;
    const dy = (e.clientY - dragStart.y) / canvas.height;

    const scale = 4 / viewState.zoom;
    const newCenterX = viewState.centerX - dx * scale;
    const newCenterY = viewState.centerY - dy * scale;

    setViewState(prev => ({
      ...prev,
      centerX: newCenterX,
      centerY: newCenterY
    }));

    setDragStart({ x: e.clientX, y: e.clientY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleWheel = (e) => {
    e.preventDefault();
    const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
    let newZoom = viewState.zoom * zoomFactor;
    if (newZoom < 0.01) newZoom = 0.01;
    if (newZoom > 1000) newZoom = 1000;
    setViewState(prev => ({
      ...prev,
      zoom: newZoom
    }));
  };

  // Touch event handlers for mobile support
  const getTouchDistance = (touches) => {
    if (touches.length < 2) return 0;
    const dx = touches[0].clientX - touches[1].clientX;
    const dy = touches[0].clientY - touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
  };

  const getTouchCenter = (touches) => {
    if (touches.length === 0) return { x: 0, y: 0 };
    if (touches.length === 1) {
      return { x: touches[0].clientX, y: touches[0].clientY };
    }
    return {
      x: (touches[0].clientX + touches[1].clientX) / 2,
      y: (touches[0].clientY + touches[1].clientY) / 2
    };
  };

  const handleTouchStart = (e) => {
    // Only prevent default if we have touches to handle
    const touches = Array.from(e.touches);
    if (touches.length > 0) {
      e.preventDefault();
    }
    
    if (touches.length === 1) {
      // Single touch - start panning
      setTouchState({
        isTouching: true,
        touchStart: { x: touches[0].clientX, y: touches[0].clientY },
        initialDistance: 0,
        initialZoom: viewState.zoom
      });
    } else if (touches.length === 2) {
      // Two touches - start zooming
      const distance = getTouchDistance(touches);
      const center = getTouchCenter(touches);
      setTouchState({
        isTouching: true,
        touchStart: center,
        initialDistance: distance,
        initialZoom: viewState.zoom
      });
    }
  };

  const handleTouchMove = (e) => {
    // Only prevent default if we're actively handling touches
    if (touchState.isTouching) {
      e.preventDefault();
    }
    
    const touches = Array.from(e.touches);
    
    if (!touchState.isTouching) return;

    if (touches.length === 1 && touchState.initialDistance === 0) {
      // Single touch panning
      const canvas = canvasRef.current;
      const dx = (touches[0].clientX - touchState.touchStart.x) / canvas.width;
      const dy = (touches[0].clientY - touchState.touchStart.y) / canvas.height;

      const scale = 4 / viewState.zoom;
      const newCenterX = viewState.centerX - dx * scale;
      const newCenterY = viewState.centerY - dy * scale;

      setViewState(prev => ({
        ...prev,
        centerX: newCenterX,
        centerY: newCenterY
      }));

      setTouchState(prev => ({
        ...prev,
        touchStart: { x: touches[0].clientX, y: touches[0].clientY }
      }));
    } else if (touches.length === 2 && touchState.initialDistance > 0) {
      // Two touch zooming
      const currentDistance = getTouchDistance(touches);
      
      if (touchState.initialDistance > 0) {
        const zoomFactor = currentDistance / touchState.initialDistance;
        let newZoom = touchState.initialZoom * zoomFactor;
        if (newZoom < 0.01) newZoom = 0.01;
        if (newZoom > 1000) newZoom = 1000;
        
        setViewState(prev => ({
          ...prev,
          zoom: newZoom
        }));
      }
    }
  };

  const handleTouchEnd = (e) => {
    // Only prevent default if we were handling touches
    if (touchState.isTouching) {
      e.preventDefault();
    }
    
    setTouchState({
      isTouching: false,
      touchStart: { x: 0, y: 0 },
      initialDistance: 0,
      initialZoom: 1
    });
  };

  // Control handlers
  const handleReset = () => {
    setViewState({
      centerX: -0.5,
      centerY: 0,
      zoom: 1,
      maxIterations: 100,
      colorScheme: 'classic',
      showCoordinates: false
    });
  };

  const handleColorSchemeChange = (scheme) => {
    setViewState(prev => ({
      ...prev,
      colorScheme: scheme
    }));
  };

  const handleIterationsChange = (iterations) => {
    setViewState(prev => ({
      ...prev,
      maxIterations: parseInt(iterations)
    }));
  };

  const handleCoordinateToggle = () => {
    setViewState(prev => ({
      ...prev,
      showCoordinates: !prev.showCoordinates
    }));
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const wheelListener = (e) => handleWheel(e);
    canvas.addEventListener('wheel', wheelListener, { passive: false });
    return () => {
      canvas.removeEventListener('wheel', wheelListener, { passive: false });
    };
  }, [handleWheel]);

  return (
    <div className="mandelbrot-container">
      <h1>Mandelbrot Fractal Explorer</h1>
      
      <div className="mandelbrot-info">
        <p>Click and drag to pan, scroll to zoom. On mobile, touch and drag to pan, pinch to zoom. Explore the infinite complexity of the Mandelbrot set!</p>
      </div>

      <div className="mandelbrot-controls">
        <button 
          className="mandelbrot-button" 
          onClick={handleReset}
          disabled={isRendering}
        >
          Reset View
        </button>
        
        <div className="control-group">
          <label>Color Scheme:</label>
          <select 
            value={viewState.colorScheme}
            onChange={(e) => handleColorSchemeChange(e.target.value)}
            disabled={isRendering}
          >
            <option value="classic">Classic</option>
            <option value="fire">Fire</option>
            <option value="ocean">Ocean</option>
            <option value="grayscale">Grayscale</option>
          </select>
        </div>

        <div className="control-group">
          <label>Zoom: {viewState.zoom.toFixed(4)}</label>
        </div>

        <div className="control-group">
          <label>Max Iterations: {viewState.maxIterations}</label>
          <input
            type="range"
            min="50"
            max="500"
            value={viewState.maxIterations}
            onChange={(e) => handleIterationsChange(e.target.value)}
            disabled={isRendering}
          />
        </div>

        <div className="control-group">
          <label>
            <input
              type="checkbox"
              checked={viewState.showCoordinates}
              onChange={handleCoordinateToggle}
              disabled={isRendering}
            />
            Show Coordinates
          </label>
        </div>
      </div>

      <div className="mandelbrot-canvas-container">
        <canvas
          ref={canvasRef}
          className="mandelbrot-canvas"
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
          style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
        />
        {isRendering && (
          <div className="rendering-overlay">
            <div className="rendering-spinner"></div>
            <p>Rendering...</p>
          </div>
        )}
      </div>

      <div className="mandelbrot-instructions">
        <h3>How to Explore</h3>
        <ul>
          <li><strong>Pan:</strong> Click and drag (desktop) or touch and drag (mobile) to move around the fractal</li>
          <li><strong>Zoom:</strong> Use mouse wheel (desktop) or pinch with two fingers (mobile) to zoom in and out</li>
          <li><strong>Reset:</strong> Click "Reset View" to return to the starting position</li>
          <li><strong>Colors:</strong> Try different color schemes to see the fractal in new ways</li>
          <li><strong>Detail:</strong> Increase iterations for more detailed rendering (slower)</li>
        </ul>
      </div>

      <div className="mandelbrot-math">
        <h3>The Mathematics Behind the Mandelbrot Set</h3>
        <div className="math-formula">
          <p>The Mandelbrot set is defined by the iterative formula:</p>
          <div className="formula">
            <strong>z<sub>n+1</sub> = z<sub>n</sub>² + c</strong>
          </div>
          <p>where:</p>
          <ul>
            <li><strong>z</strong> is a complex number that starts at 0</li>
            <li><strong>c</strong> is a complex number representing each point in the plane</li>
            <li><strong>n</strong> is the iteration number</li>
          </ul>
          <p>A point <strong>c</strong> belongs to the Mandelbrot set if the sequence |z<sub>n</sub>| remains bounded (never exceeds 2) as n approaches infinity.</p>
          <p>In practice, we iterate a finite number of times and check if |z<sub>n</sub>| exceeds 2. If it does, the point escapes and is colored based on how quickly it escaped.</p>
          
          <div className="examples">
            <h4>Examples:</h4>
            
            <div className="example">
              <h5>Point that DIVERGES: c = 1</h5>
              <p>Starting with z₀ = 0:</p>
              <ul>
                <li>z₁ = 0² + 1 = 1</li>
                <li>z₂ = 1² + 1 = 2</li>
                <li>z₃ = 2² + 1 = 5</li>
                <li>z₄ = 5² + 1 = 26</li>
                <li>z₅ = 26² + 1 = 677</li>
              </ul>
              <p><strong>Result:</strong> The sequence grows rapidly and diverges to infinity. This point is <em>outside</em> the Mandelbrot set.</p>
            </div>

            <div className="example">
              <h5>Point that DOESN'T DIVERGE: c = -1</h5>
              <p>Starting with z₀ = 0:</p>
              <ul>
                <li>z₁ = 0² + (-1) = -1</li>
                <li>z₂ = (-1)² + (-1) = 1 + (-1) = 0</li>
                <li>z₃ = 0² + (-1) = -1</li>
                <li>z₄ = (-1)² + (-1) = 1 + (-1) = 0</li>
                <li>z₅ = 0² + (-1) = -1</li>
              </ul>
              <p><strong>Result:</strong> The sequence oscillates between 0 and -1, staying bounded. This point is <em>inside</em> the Mandelbrot set.</p>
            </div>

            <div className="example">
              <h5>Point that DIVERGES: c = 0.5 + 0.5i</h5>
              <p>Starting with z₀ = 0:</p>
              <ul>
                <li>z₁ = 0² + (0.5 + 0.5i) = 0.5 + 0.5i</li>
                <li>z₂ = (0.5 + 0.5i)² + (0.5 + 0.5i) = 0.5 + i</li>
                <li>z₃ = (0.5 + i)² + (0.5 + 0.5i) = -0.25 + 1.5i</li>
                <li>z₄ = (-0.25 + 1.5i)² + (0.5 + 0.5i) = -2.0625 - 0.25i</li>
                <li>z₅ = (-2.0625 - 0.25i)² + (0.5 + 0.5i) = 4.2539 + 1.5313i</li>
              </ul>
              <p><strong>Result:</strong> The sequence grows and diverges. This point is <em>outside</em> the Mandelbrot set.</p>
            </div>
          </div>
        </div>
      </div>

      <div className="mandelbrot-colors">
        <h3>Color Scheme Explanations</h3>
        <p>
          The color of each point outside the Mandelbrot set is now determined by how quickly it escapes, using a smooth (fractional) escape value. This produces continuous gradients and vibrant transitions, rather than discrete color bands. Each color scheme maps this escape speed to colors in a different way:
        </p>
        <div className="coordinate-note" style={{margin: '0.5rem 0 1rem 0', color: '#888', fontSize: '1rem'}}>
          <strong>Note:</strong> In computer graphics, the y-axis increases downward. This means <strong>y<sub>min</sub></strong> is at the top of the image and <strong>y<sub>max</sub></strong> is at the bottom, which is the opposite of standard mathematical graphs.
        </div>
        <div className="color-tables">
          <div className="color-table">
            <h4>Classic (Rainbow)</h4>
            <ul>
              <li><strong>Full rainbow gradient:</strong> Colors cycle smoothly through all hues (red, orange, yellow, green, blue, purple) as escape speed increases.</li>
              <li><strong>Brightness variation:</strong> Lightness varies for extra vibrancy and depth.</li>
              <li><strong>Black:</strong> Points that never escape (inside the Mandelbrot set).</li>
            </ul>
          </div>

          <div className="color-table">
            <h4>Fire</h4>
            <ul>
              <li><strong>Red to yellow to white:</strong> Escape speed is mapped nonlinearly for a dramatic fiery effect.</li>
              <li><strong>Smooth gradient:</strong> No bands, just a continuous ramp from dark red through orange to bright yellow/white.</li>
              <li><strong>Black:</strong> Points inside the Mandelbrot set.</li>
            </ul>
          </div>

          <div className="color-table">
            <h4>Ocean</h4>
            <ul>
              <li><strong>Blue to cyan to white:</strong> Escape speed is mapped nonlinearly for a cool, oceanic effect.</li>
              <li><strong>Smooth gradient:</strong> No bands, just a continuous ramp from deep blue through cyan to light blue/white.</li>
              <li><strong>Black:</strong> Points inside the Mandelbrot set.</li>
            </ul>
          </div>

          <div className="color-table">
            <h4>Grayscale</h4>
            <ul>
              <li><strong>Black to white:</strong> Escape speed is mapped to a smooth grayscale gradient.</li>
              <li><strong>Smooth gradient:</strong> No bands, just a continuous ramp from black (slow escape) to white (fast escape).</li>
              <li><strong>Black:</strong> Points inside the Mandelbrot set.</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Mandelbrot; 