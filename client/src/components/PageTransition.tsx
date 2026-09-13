import { motion, useReducedMotion } from "framer-motion";
import type { ReactNode } from "react";
import { useLocation } from "react-router-dom";

export function PageTransition({ children }: { children: ReactNode }) {
  const location = useLocation();
  const reduceMotion = useReducedMotion();
  return <motion.div key={location.pathname} initial={{ opacity: 0, y: reduceMotion ? 0 : 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: reduceMotion ? 0 : 0.22 }}>{children}</motion.div>;
}
