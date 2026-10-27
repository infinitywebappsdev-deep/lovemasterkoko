import React from "react";

interface BankyLogoProps {
  className?: string;
  variant?: "white" | "dark" | "color" | "gold" | "currentColor";
  size?: number | string;
}

/**
 * Banky Hotel & Suites Official Logo
 * Exact vector reproduction of the brand's 3-tower architectural mark
 * with curved horizon arch.
 * 100% transparent background, zero borderlines, tight viewBox.
 */
export function BankyLogo({
  className = "h-14 w-auto sm:h-16 md:h-[68px]",
  variant = "white",
}: BankyLogoProps) {
  let towerFill = "#ffffff";
  let archFill = "#ffffff";

  if (variant === "color") {
    towerFill = "#0018b3";
    archFill = "#e59a00";
  } else if (variant === "dark") {
    towerFill = "#1a1815";
    archFill = "#1a1815";
  } else if (variant === "gold") {
    towerFill = "#ffbf00";
    archFill = "#ffbf00";
  } else if (variant === "currentColor") {
    towerFill = "currentColor";
    archFill = "currentColor";
  } else {
    // "white" default
    towerFill = "#ffffff";
    archFill = "#ffffff";
  }

  return (
    <svg
      viewBox="148 199 304 202"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Banky Hotel & Suites Logo"
    >
      {/* Curved Base Arch / Horizon Crescent */}
      <path
        d="M 154 395 Q 300 359, 446 395 Q 300 383, 154 395 Z"
        fill={archFill}
      />

      {/* Left Tower */}
      <path
        d="M 220 369.5 L 220 295 Q 220 279, 235 276 L 263 269 L 263 363 C 248.5 365.5, 234 367.5, 220 369.5 Z"
        fill={towerFill}
      />

      {/* Center Tower (tallest, apex curve peaking at top-right) */}
      <path
        d="M 270 362.2 L 270 231 Q 270 211, 319 205 L 319 361.5 C 302.5 361, 286 361.5, 270 362.2 Z"
        fill={towerFill}
      />

      {/* Right Tower (curved roofline sloping down to right) */}
      <path
        d="M 326 361.6 L 326 241 Q 348 245, 369 265 L 369 368.5 C 354.5 366, 340 363.5, 326 361.6 Z"
        fill={towerFill}
      />
    </svg>
  );
}

export default BankyLogo;
