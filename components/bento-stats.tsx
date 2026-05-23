"use client";

import React from "react";
import { DollarSign, Scale, Flame, Droplet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { motion } from "motion/react";

interface BentoStatsProps {
  totalCost: number;
  totalWeight: number;
  totalCO2: number;
  totalWater: number;
}

export function BentoStats({ totalCost, totalWeight, totalCO2, totalWater }: BentoStatsProps) {
  const containerVariants = {
    hidden: { opacity: 0 },
    show: {
      opacity: 1,
      transition: {
        staggerChildren: 0.08,
      },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    show: { opacity: 1, y: 0, transition: { type: "spring" as const, stiffness: 120, damping: 14 } },
  };

  return (
    <motion.div 
      variants={containerVariants}
      initial="hidden"
      animate="show"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5"
    >
      {/* Metric Box 1: Cost (Financial Loss) */}
      <motion.div variants={itemVariants}>
        <Card 
          id="stat-financial-loss" 
          className="glass-panel hover:glass-panel-glow-rose hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default"
        >
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-rose-500/10 text-rose-400 rounded-xl border border-rose-500/20 shadow-inner">
              <DollarSign className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-rose-300/80 block">Financial Loss</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">${totalCost.toFixed(2)}</h3>
              <p className="text-xs text-stone-400 font-medium">Value of food discarded</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Box 2: Food Weight */}
      <motion.div variants={itemVariants}>
        <Card 
          id="stat-wasted-weight" 
          className="glass-panel hover:glass-panel-glow-amber hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default"
        >
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-amber-500/10 text-amber-400 rounded-xl border border-amber-500/20 shadow-inner">
              <Scale className="h-6 w-6" />
            </div>
            <div className="space-y-1">
              <span className="text-xs font-bold uppercase tracking-wider text-amber-300/80 block">Wasted Weight</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {totalWeight.toFixed(1)} <span className="text-sm font-medium text-stone-400">lbs</span>
              </h3>
              <p className="text-xs text-stone-400 font-medium">Physical mass thrown out</p>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Box 3: CO2 Equivalent */}
      <motion.div variants={itemVariants}>
        <Card 
          id="stat-co2-footprint" 
          className="glass-panel hover:glass-panel-glow-emerald hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default"
        >
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-emerald-500/10 text-emerald-400 rounded-xl border border-emerald-500/20 shadow-inner">
              <Flame className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-emerald-300/80 block">Carbon Footprint</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {totalCO2.toFixed(1)} <span className="text-sm font-medium text-stone-400">lbs</span>
              </h3>
              <div className="space-y-1">
                <p className="text-[11px] text-emerald-400/90 font-bold tracking-tight">CO2e emissions created</p>
                <p className="text-[10px] text-stone-400 font-medium leading-none">
                  ≈ {Math.round(totalCO2 * 1.1)} miles driven in gas car
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Metric Box 4: Ecological Water footprint */}
      <motion.div variants={itemVariants}>
        <Card 
          id="stat-water-footprint" 
          className="glass-panel hover:glass-panel-glow-blue hover:-translate-y-1 transition-all duration-300 rounded-2xl overflow-hidden border-none cursor-default"
        >
          <CardContent className="p-6 flex items-start gap-4">
            <div className="p-3 bg-blue-500/10 text-blue-400 rounded-xl border border-blue-500/20 shadow-inner">
              <Droplet className="h-6 w-6" />
            </div>
            <div className="space-y-1.5 w-full">
              <span className="text-xs font-bold uppercase tracking-wider text-blue-300/80 block">Water Footprint</span>
              <h3 className="text-3xl font-extrabold text-white tracking-tight">
                {totalWater.toLocaleString()} <span className="text-sm font-medium text-stone-400">gal</span>
              </h3>
              <div className="space-y-1">
                <p className="text-[11px] text-blue-400/90 font-bold tracking-tight">Ecological freshwater lost</p>
                <p className="text-[10px] text-stone-400 font-medium leading-none">
                  ≈ {Math.round(totalWater / 17.2)} hot showers
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
