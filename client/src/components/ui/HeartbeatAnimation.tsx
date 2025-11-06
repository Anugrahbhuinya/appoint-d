import React from 'react';

// This component creates a long, looping EKG/heartbeat line
// that scrolls from left to right.
export const HeartbeatAnimation = () => {
  return (
    <div className="absolute top-0 left-0 w-full h-40 overflow-hidden -z-10 opacity-10">
      {/* We use a <svg> that is 200% wide and animate it to move 50% to the left.
          When the animation loops, it creates a seamless, infinite scroll.
      */}
      <svg
        className="animate-scroll-left"
        xmlns="http://www.w3.org/2000/svg"
        width="200%" // 200% width is key for a seamless loop
        height="100%"
        viewBox="0 0 400 160"
        preserveAspectRatio="xMidYMid slice"
      >
        {/* The EKG path. This 'd' attribute is a path that repeats. */}
        <path
          d="M0 80 H 40 L 50 60 L 60 80 H 70 L 80 70 L 90 80 L 100 80 H 130 L 140 60 L 150 80 H 160 L 170 70 L 180 80 L 190 80 H 220 L 230 60 L 240 80 H 250 L 260 70 L 270 80 L 280 80 H 310 L 320 60 L 330 80 H 340 L 350 70 L 360 80 L 370 80 H 400"
          stroke="currentColor" // Uses the current text color (white in your dark theme)
          strokeWidth="2"
          fill="none"
        />
        {/* This is the 2nd half of the path, identical to the first for looping */}
        <path
          d="M400 80 H 440 L 450 60 L 460 80 H 470 L 480 70 L 490 80 L 500 80 H 530 L 540 60 L 550 80 H 560 L 570 70 L 580 80 L 590 80 H 620 L 630 60 L 640 80 H 650 L 660 70 L 670 80 L 680 80 H 710 L 720 60 L 730 80 H 740 L 750 70 L 760 80 L 770 80 H 800"
          stroke="currentColor"
          strokeWidth="2"
          fill="none"
        />
      </svg>
    </div>
  );
};