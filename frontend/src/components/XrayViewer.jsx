import React, { useState } from "react";
import "../styles/components/XrayViewer.css";

function XrayViewer({ file, onClose }) {
  const [zoom, setZoom] = useState(1);
  const [rotation, setRotation] = useState(0);

  const handleZoomIn = () => setZoom((prev) => prev * 1.2);
  const handleZoomOut = () => setZoom((prev) => prev / 1.2);
  const handleRotate = () => setRotation((prev) => prev + 90);

  return (
    <div className="xray-viewer-overlay" onClick={onClose}>
      <div className="xray-viewer-content" onClick={(e) => e.stopPropagation()}>
        <div className="xray-viewer-header">
          <h3>{file.name}</h3>
          <div className="xray-viewer-controls">
            <button onClick={handleZoomIn}>Zoom In</button>
            <button onClick={handleZoomOut}>Zoom Out</button>
            <button onClick={handleRotate}>Rotate</button>
            <button onClick={onClose}>Close</button>
          </div>
        </div>
        <div className="xray-image-container">
          <img
            src={file.url}
            alt={file.name}
            style={{
              transform: `scale(${zoom}) rotate(${rotation}deg)`,
            }}
          />
        </div>
      </div>
    </div>
  );
}

export default XrayViewer;
