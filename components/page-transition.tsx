"use client";

import { motion, useReducedMotion } from "motion/react";
import { useSelectedLayoutSegments } from "next/navigation";
import type { ReactNode } from "react";

export function PageTransition({ children }: { children: ReactNode }) {
	const segments = useSelectedLayoutSegments();
	const shouldReduceMotion = useReducedMotion();
	const routeKey = segments.join("/") || "/";

	return (
		<motion.div
			key={routeKey}
			initial={shouldReduceMotion ? false : { opacity: 0, y: 10 }}
			animate={shouldReduceMotion ? { opacity: 1 } : { opacity: 1, y: 0 }}
			transition={{ duration: 0.18, ease: "easeOut" }}
		>
			{children}
		</motion.div>
	);
}
