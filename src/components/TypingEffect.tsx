"use client";

import { useState, useEffect } from 'react';

type TypingEffectProps = {
  text: string;
  speed?: number;
  className?: string;
};

const TypingEffect: React.FC<TypingEffectProps> = ({ text, speed = 150, className }) => {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    setDisplayedText('');
    setCurrentIndex(0);
  }, [text]);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText((prev) => prev + text[currentIndex]);
        setCurrentIndex((prev) => prev + 1);
      }, speed);

      return () => clearTimeout(timeout);
    }
  }, [currentIndex, speed, text]);

  return (
    <h1 className={className}>
      {displayedText}
      <span className="typing-cursor"></span>
    </h1>
  );
};

export default TypingEffect;