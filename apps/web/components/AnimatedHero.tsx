"use client";

import { motion } from "motion/react";
import type { ReactNode } from "react";

interface AnimatedHeroProps {
  title: string | ReactNode;
  subtitle?: string | ReactNode;
  buttons?: ReactNode;
}

export function AnimatedHero({ title, subtitle, buttons }: AnimatedHeroProps) {
  const titleVariants = {
    hidden: { opacity: 0, y: -20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
  };

  const subtitleVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: 0.1, ease: "easeOut" },
    },
  };

  const buttonsVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: {
      opacity: 1,
      y: 0,
      transition: { duration: 0.4, delay: 0.2, ease: "easeOut" },
    },
  };

  return (
    <div className="space-y-6">
      <motion.div
        initial="hidden"
        animate="visible"
        variants={titleVariants}
      >
        {typeof title === "string" ? (
          <h1 className="text-4xl md:text-5xl font-bold">{title}</h1>
        ) : (
          title
        )}
      </motion.div>

      {subtitle && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={subtitleVariants}
        >
          {typeof subtitle === "string" ? (
            <p className="text-lg text-muted-foreground">{subtitle}</p>
          ) : (
            subtitle
          )}
        </motion.div>
      )}

      {buttons && (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={buttonsVariants}
        >
          {buttons}
        </motion.div>
      )}
    </div>
  );
}
