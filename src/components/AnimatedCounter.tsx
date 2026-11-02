'use client';

import { useEffect, useState, useRef } from 'react';

interface AnimatedCounterProps {
  value: number;
  duration?: number; // duration in ms
}

export default function AnimatedCounter({ value, duration = 800 }: AnimatedCounterProps) {
  const [displayValue, setDisplayValue] = useState(value);
  const prevValueRef = useRef(value);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    const startValue = prevValueRef.current;
    const endValue = value;
    if (startValue === endValue) return;

    // cancel any in-flight animation
    if (rafRef.current !== null) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }

    let startTimestamp: number | null = null;

    const step = (timestamp: number) => {
      if (!startTimestamp) startTimestamp = timestamp;
      const progress = Math.min((timestamp - startTimestamp) / duration, 1);

      // Easing: easeOutQuad
      const easedProgress = progress * (2 - progress);
      const currentVal = startValue + (endValue - startValue) * easedProgress;

      setDisplayValue(currentVal);
      prevValueRef.current = currentVal;

      if (progress < 1) {
        rafRef.current = window.requestAnimationFrame(step);
      } else {
        setDisplayValue(endValue);
        prevValueRef.current = endValue;
        rafRef.current = null;
      }
    };

    rafRef.current = window.requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
    };
  }, [value, duration]);

  // keep ref in sync when value changes without animation (e.g. initial)
  useEffect(() => {
    prevValueRef.current = value;
  }, []);

  // Format with toLocaleString to preserve up to 2 decimal places cleanly
  return (
    <>
      {displayValue.toLocaleString(undefined, {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
      })}
    </>
  );
}
