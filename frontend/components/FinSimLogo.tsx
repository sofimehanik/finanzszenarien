"use client"

import React from "react"
import { motion } from "framer-motion"

type LogoSize = "sm" | "md" | "lg"

interface FinSimLogoProps {
  showWordmark?: boolean
  size?: LogoSize
  animate?: boolean
}

const ICON_SIZES: Record<LogoSize, number> = {
  sm: 32,
  md: 40,
  lg: 48,
}

const TEXT_CLASSES: Record<LogoSize, string> = {
  sm: "text-lg",
  md: "text-xl",
  lg: "text-2xl",
}

export function FinSimLogo({ showWordmark = true, size = "md", animate = true }: FinSimLogoProps) {
  const iconSize = ICON_SIZES[size]
  const textClass = TEXT_CLASSES[size]

  return (
    <motion.div
      className="flex items-center gap-2"
      initial={animate ? { opacity: 0, y: 8 } : false}
      animate={animate ? { opacity: 1, y: 0 } : undefined}
      transition={{ duration: 0.5, ease: "easeOut" }}
    >
      <motion.div
        className="relative"
        animate={animate ? { rotate: [0, -1, 1, 0] } : undefined}
        transition={animate ? { repeat: Infinity, duration: 8, ease: "easeInOut" } : undefined}
      >
        <svg
          width={iconSize}
          height={iconSize}
          viewBox="0 0 48 48"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="drop-shadow-lg"
        >
          <defs>
            <linearGradient id="finsim-bar" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#1D4ED8" />
              <stop offset="100%" stopColor="#22C55E" />
            </linearGradient>
            <linearGradient id="finsim-arrow" x1="0%" y1="100%" x2="100%" y2="0%">
              <stop offset="0%" stopColor="#38BDF8" />
              <stop offset="100%" stopColor="#4ADE80" />
            </linearGradient>
          </defs>
          <rect x="6" y="22" width="6" height="16" rx="2" fill="url(#finsim-bar)" opacity="0.85" />
          <rect x="16" y="16" width="6" height="22" rx="2" fill="url(#finsim-bar)" opacity="0.9" />
          <rect x="26" y="10" width="6" height="28" rx="2" fill="url(#finsim-bar)" />
          <path
            d="M8 26C18 20 24 18 40 8"
            stroke="url(#finsim-arrow)"
            strokeWidth="4"
            strokeLinecap="round"
          />
          <path
            d="M33 6L41 7L40 15"
            fill="url(#finsim-arrow)"
            opacity="0.95"
          />
        </svg>
        <span className="absolute inset-0 blur-xl bg-gradient-to-tr from-finsim-primary/20 to-finsim-accent/10 -z-10" />
      </motion.div>

      {showWordmark && (
        <motion.div 
          className="flex items-center gap-0.5 font-bold tracking-tight"
          initial={animate ? { opacity: 0, x: -5 } : false}
          animate={animate ? { opacity: 1, x: 0 } : undefined}
          transition={{ delay: 0.2, duration: 0.4 }}
        >
          <span className={`${textClass} text-transparent bg-clip-text bg-gradient-to-r from-finsim-primary via-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:via-finsim-dark-primary dark:to-finsim-dark-accent`}>
            Fin
          </span>
          <span className={`${textClass} text-transparent bg-clip-text bg-gradient-to-r from-finsim-primary to-finsim-accent dark:from-finsim-dark-primary dark:to-finsim-dark-accent`}>
            Sim
          </span>
        </motion.div>
      )}
    </motion.div>
  )
}

