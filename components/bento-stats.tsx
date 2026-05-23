"use client";

import React from "react";
import { DollarSign, Scale, Flame, Droplet } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface BentoStatsProps {
  totalCost: number;
  totalWeight: number;
  totalCO2: number;
  totalWater: number;
}

export function BentoStats({ totalCost, totalWeight, totalCO2, totalWater }: BentoStatsProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Metric Box 1: Cost */}
      <Card id="stat-financial-loss" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-rose-50 text-rose-600 rounded-xl">
            <DollarSign className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block">Financial Loss</span>
            <h3 className="text-3xl font-bold text-stone-900 tracking-tight">${totalCost.toFixed(2)}</h3>
            <p className="text-xs text-stone-500 font-medium">Value of items thrown away</p>
          </div>
        </CardContent>
      </Card>

      {/* Metric Box 2: Food Weight */}
      <Card id="stat-wasted-weight" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-amber-50 text-amber-600 rounded-xl">
            <Scale className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block">Wasted Weight</span>
            <h3 className="text-3xl font-bold text-stone-900 tracking-tight">
              {totalWeight.toFixed(1)} <span className="text-sm font-medium text-stone-500">lbs</span>
            </h3>
            <p className="text-xs text-stone-500 font-medium">Aggregate physical mass lost</p>
          </div>
        </CardContent>
      </Card>

      {/* Metric Box 3: CO2 Equivalent */}
      <Card id="stat-co2-footprint" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl">
            <Flame className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block">Carbon Footprint</span>
            <h3 className="text-3xl font-bold text-stone-900 tracking-tight">
              {totalCO2.toFixed(1)} <span className="text-sm font-medium text-stone-500">lbs</span>
            </h3>
            <p className="text-xs text-emerald-800 font-semibold">CO2e emissions created</p>
            <p className="text-[10px] text-stone-400 font-medium">≈ {Math.round(totalCO2 * 1.1)} miles driven in gas car</p>
          </div>
        </CardContent>
      </Card>

      {/* Metric Box 4: Ecological Water footprint */}
      <Card id="stat-water-footprint" className="bg-white border border-stone-200/60 rounded-2xl shadow-sm hover:shadow-md transition-shadow duration-200 overflow-hidden">
        <CardContent className="p-6 flex items-start gap-4">
          <div className="p-3 bg-blue-50 text-blue-600 rounded-xl">
            <Droplet className="h-6 w-6" />
          </div>
          <div className="space-y-1">
            <span className="text-xs font-semibold uppercase tracking-wider text-stone-400 block">Water Footprint</span>
            <h3 className="text-3xl font-bold text-stone-900 tracking-tight">
              {totalWater.toLocaleString()} <span className="text-sm font-medium text-stone-500">gal</span>
            </h3>
            <p className="text-xs text-blue-800 font-semibold">Ecological water lost</p>
            <p className="text-[10px] text-stone-400 font-medium">≈ {Math.round(totalWater / 17.2)} hot showers</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
