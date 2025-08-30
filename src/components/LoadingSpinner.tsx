import React from 'react';

const LoadingSpinner: React.FC = () => {
  return (
    <div className="fixed inset-0 z-50 flex flex-col items-center justify-center bg-black/80 backdrop-blur-sm">
      <div className="text-2xl text-white font-pixel mb-4">GENERATING...</div>
      <div className="pixel-progress-bar">
        <div className="pixel-progress-bar-fill"></div>
      </div>
    </div>
  );
};

export default LoadingSpinner;