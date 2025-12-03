// components/visuals/NeonBlob.tsx
"use client";
import React from "react";
import { motion } from "framer-motion";

export default function NeonBlob({ className = "" }: { className?: string }) {
  return (
    <motion.div
      initial={{ opacity: 0.18, scale: 0.9 }}
      animate={{ opacity: 0.28, scale: 1.04 }}
      transition={{ duration: 6, repeat: Infinity, repeatType: "reverse" }}
      className={`pointer-events-none absolute -z-10 rounded-full blur-3xl ${className}`}
    />
  );
}
