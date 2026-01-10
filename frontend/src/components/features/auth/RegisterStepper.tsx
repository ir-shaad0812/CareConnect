"use client";

import { motion } from "framer-motion";
import { Check } from "lucide-react";

interface Step {
  id: number;
  label: string;
}

interface Props {
  steps: Step[];
  current: number; // 1-based
}

export default function RegisterStepper({ steps, current }: Props) {
  return (
    <div className="flex items-center w-full">
      {steps.map((step, idx) => {
        const status: "done" | "active" | "upcoming" =
          step.id < current ? "done" : step.id === current ? "active" : "upcoming";

        const isLast = idx === steps.length - 1;

        return (
          <div key={step.id} className="flex items-center flex-1 last:flex-none">
            {/* Circle */}
            <div className="flex flex-col items-center">
              <motion.div
                initial={false}
                animate={
                  status === "done"
                    ? { backgroundColor: "#4461F2", borderColor: "#4461F2", scale: 1 }
                    : status === "active"
                    ? { backgroundColor: "#4461F2", borderColor: "#4461F2", scale: 1.1 }
                    : { backgroundColor: "#ffffff", borderColor: "#d1d5db", scale: 1 }
                }
                transition={{ duration: 0.25 }}
                className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-xs font-bold"
              >
                {status === "done" ? (
                  <Check className="w-4 h-4 text-white" strokeWidth={2.5} />
                ) : (
                  <span
                    className={status === "active" ? "text-white" : "text-gray-400"}
                  >
                    {step.id}
                  </span>
                )}
              </motion.div>

              {/* Label */}
              <span
                className={`mt-1.5 text-[10px] font-medium text-center leading-tight ${
                  status === "upcoming" ? "text-gray-400" : "text-primary-500"
                }`}
                style={{ maxWidth: 60 }}
              >
                {step.label}
              </span>
            </div>

            {/* Connector line */}
            {!isLast && (
              <div className="flex-1 mx-2 h-[2px] relative overflow-hidden rounded-full bg-gray-200 mb-5">
                <motion.div
                  className="absolute inset-y-0 left-0 bg-primary-500 rounded-full"
                  initial={false}
                  animate={{ width: status === "done" ? "100%" : "0%" }}
                  transition={{ duration: 0.4, ease: "easeInOut" }}
                />
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
