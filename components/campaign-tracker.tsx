"use client";

import React, { useState, useEffect } from "react";
import { TrendingDown, ShieldAlert, Award, Calendar, CheckCircle2, ChevronRight, Activity, Percent } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Intervention {
  id: string;
  name: string;
  stage: string;
  region: string;
  projected_reduction_pct: number;
  projected_reduction_tonnes: number;
  effort_level: string;
  urgency: string;
  status: "live" | "committed" | "candidate";
  deployed_at?: string;
  target_date: string;
  actual_savings?: number;
}

interface Risk {
  id: string;
  intervention_id: string;
  description: string;
  probability: number;
  impact: number;
  mitigation: string;
  status: string;
  intervention_name?: string;
}

interface Baseline {
  region: string;
  commodity: string;
  total_tonnes: number;
}

export function CampaignTracker() {
  const [interventions, setInterventions] = useState<Intervention[]>([]);
  const [risks, setRisks] = useState<Risk[]>([]);
  const [baselines, setBaselines] = useState<Baseline[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchCampaignData = async () => {
    setIsLoading(true);
    try {
      // 1. Fetch baselines
      const { data: baseData } = await supabase.from("baselines").select("*");
      setBaselines(baseData || []);

      // 2. Fetch interventions
      const { data: intData } = await supabase.from("interventions").select("*");
      
      // 3. Fetch actual savings per intervention
      const { data: actData } = await supabase.from("intervention_actuals").select("*");

      const mappedInterventions = (intData || []).map((int: any) => {
        const matchingActuals = (actData || []).filter((act: any) => act.intervention_id === int.id);
        const actualSavings = matchingActuals.reduce((sum: number, item: any) => sum + Number(item.actual_reduction_tonnes), 0);
        return {
          ...int,
          actual_savings: actualSavings
        };
      });

      setInterventions(mappedInterventions);

      // 4. Fetch risks
      const { data: riskData } = await supabase.from("risks").select("*");
      const mappedRisks = (riskData || []).map((risk: any) => {
        const matchingInt = mappedInterventions.find((i) => i.id === risk.intervention_id);
        return {
          ...risk,
          intervention_name: matchingInt ? matchingInt.name : "Unknown Intervention"
        };
      });
      setRisks(mappedRisks);
    } catch (err) {
      console.error("Error loading campaign data:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCampaignData();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">Loading Database Campaign Metrics...</span>
      </div>
    );
  }

  // Aggregate Metrics
  const totalBaseline = baselines.reduce((sum, b) => sum + Number(b.total_tonnes), 0) || 750000; // fallback if empty
  
  // Achieved savings (from live interventions with actual savings)
  const totalAchieved = interventions
    .filter(i => i.status === "live")
    .reduce((sum, i) => sum + (i.actual_savings || 0), 0);

  // Committed savings (projected savings of committed and live interventions, minus achieved to prevent double counting)
  const totalCommitted = interventions
    .filter(i => i.status === "committed" || i.status === "live")
    .reduce((sum, i) => sum + Number(i.projected_reduction_tonnes), 0) - totalAchieved;

  const targetReduction = totalBaseline * 0.50; // 50% target
  
  const achievedPct = Number(((totalAchieved / totalBaseline) * 100).toFixed(1));
  const committedPct = Number(((totalCommitted / totalBaseline) * 100).toFixed(1));
  const gapPct = Math.max(0, Number((50.0 - achievedPct - committedPct).toFixed(1)));
  
  const isGapAlertActive = gapPct > 0;

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      
      {/* 50% Campaign Progress Board */}
      <div className="glass-panel p-6 rounded-2xl border-none shadow-xl bg-gradient-to-br from-stone-900/40 via-stone-950/20 to-black/10">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-6 mb-6">
          <div className="space-y-1.5">
            <h2 className="text-lg font-black text-white flex items-center gap-2">
              <Award className="h-5 w-5 text-emerald-400" />
              50% Food Waste Reduction Campaign
            </h2>
            <p className="text-xs text-stone-400">
              Aggregating active operational interventions against locked January 2026 regional baselines
            </p>
          </div>

          <div className="flex items-center gap-4 bg-black/30 border border-white/5 px-4 py-2.5 rounded-xl">
            <div className="text-center">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">Campaign Target</span>
              <span className="text-sm font-extrabold text-white">50.0% Reduction</span>
            </div>
            <div className="h-8 w-px bg-white/10" />
            <div className="text-center">
              <span className="text-[10px] font-bold text-stone-500 uppercase block tracking-wider">Total Progress</span>
              <span className="text-sm font-extrabold text-emerald-400">{(achievedPct + committedPct).toFixed(1)}%</span>
            </div>
          </div>
        </div>

        {/* Master Progress Bar */}
        <div className="space-y-3">
          <div className="flex justify-between items-center text-[11px] font-bold text-stone-400">
            <span>Locked Baseline ({totalBaseline.toLocaleString()} tonnes)</span>
            <span className="text-white">Target: {(totalBaseline * 0.5).toLocaleString()} tonnes</span>
          </div>

          {/* Canvas-style progress segmented bar */}
          <div className="h-5 w-full bg-stone-900/60 rounded-full overflow-hidden flex border border-white/5 p-[2px]">
            {/* Achieved segment */}
            <div 
              style={{ width: `${(achievedPct / 50) * 100}%` }}
              className="bg-gradient-to-r from-emerald-600 to-emerald-500 rounded-l-full relative group cursor-pointer transition-all duration-500"
              title={`Achieved: ${achievedPct}% (${totalAchieved.toLocaleString()} tonnes)`}
            />
            {/* Committed segment */}
            <div 
              style={{ width: `${(committedPct / 50) * 100}%` }}
              className="bg-emerald-500/30 border-l border-emerald-500/20 relative group cursor-pointer transition-all duration-500"
              title={`Committed: ${committedPct}% (${totalCommitted.toLocaleString()} tonnes)`}
            />
            {/* Remaining gap segment */}
            <div 
              style={{ width: `${(gapPct / 50) * 100}%` }}
              className="bg-stone-800/40 relative group transition-all duration-500"
              title={`Gap: ${gapPct}%`}
            />
          </div>

          {/* Progress Legends */}
          <div className="flex flex-wrap items-center gap-6 pt-2 text-[10px] font-bold uppercase tracking-wider">
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 bg-emerald-500 rounded-md" />
              <span className="text-stone-300">Achieved Savings ({achievedPct}%)</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="h-3 w-3 bg-emerald-500/30 border border-emerald-500/40 rounded-md" />
              <span className="text-stone-300">Committed Projects ({committedPct}%)</span>
            </div>
            {isGapAlertActive && (
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 bg-stone-800 border border-white/5 rounded-md" />
                <span className="text-stone-400">Remaining Campaign Gap ({gapPct}%)</span>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Gap Alert Banner */}
      {isGapAlertActive && (
        <div className="p-4 bg-amber-500/10 border border-amber-500/20 text-amber-350 text-amber-400 rounded-2xl text-xs font-bold flex flex-col md:flex-row md:items-center justify-between gap-4 animate-pulse">
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded-xl bg-amber-500/20 flex items-center justify-center text-amber-400">
              <ShieldAlert className="h-4 w-4" />
            </div>
            <div>
              <p className="text-white font-extrabold uppercase tracking-wide">Critical Campaign Gap Detected</p>
              <p className="text-stone-400 mt-0.5">Currently short of the 50% waste reduction goal by <span className="text-amber-400 font-extrabold">{gapPct}% (~{Math.round(totalBaseline * gapPct / 100).toLocaleString()} tonnes)</span>. Deploy gap-closing candidate interventions.</p>
            </div>
          </div>
          <button className="self-start md:self-auto px-4 py-2 bg-amber-500/20 hover:bg-amber-500/30 text-amber-400 font-extrabold uppercase tracking-wider rounded-xl transition-all border border-amber-500/20 cursor-pointer text-[10px]">
            Review Candidates ↗
          </button>
        </div>
      )}

      {/* Trajectory & Details Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Column A & B: Trajectory Line Chart */}
        <div className="lg:col-span-2 glass-panel p-6 rounded-2xl border-none shadow-xl flex flex-col h-[340px]">
          <div className="flex items-center justify-between mb-6">
            <div className="space-y-1">
              <h3 className="text-sm font-black text-white flex items-center gap-2">
                <TrendingDown className="h-4 w-4 text-emerald-400" />
                Reduction Trajectory (tonnes)
              </h3>
              <p className="text-[10px] text-stone-500">Historical performance vs required target pathway</p>
            </div>
            
            <div className="flex items-center gap-4 text-[9px] font-bold uppercase text-stone-400">
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-4 bg-emerald-500 rounded" />
                <span>Actual</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-4 bg-emerald-500/35 rounded" />
                <span>Projected</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="h-1.5 w-4 bg-white/20 rounded" />
                <span>Required Path</span>
              </div>
            </div>
          </div>

          {/* SVG Custom Line Chart */}
          <div className="flex-1 w-full relative pt-2">
            <svg className="w-full h-full" viewBox="0 0 500 200" preserveAspectRatio="none">
              {/* Grids */}
              <line x1="0" y1="20" x2="500" y2="20" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="80" x2="500" y2="80" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="140" x2="500" y2="140" stroke="rgba(255,255,255,0.03)" strokeWidth="1" />
              <line x1="0" y1="199" x2="500" y2="199" stroke="rgba(255,255,255,0.08)" strokeWidth="1" />

              {/* Required Path Line (dotted white) */}
              <path d="M 0,20 L 100,50 L 200,80 L 300,110 L 400,140 L 500,170" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="1.5" strokeDasharray="3,3" />

              {/* Projected Line (faded green) */}
              <path d="M 0,20 L 100,55 L 200,95 L 300,120 L 400,135 L 500,165" fill="none" stroke="rgba(16,185,129,0.3)" strokeWidth="2" />
              
              {/* Actual Line (glowing emerald) */}
              <path d="M 0,20 L 100,52 L 200,90 M 200,90" fill="none" stroke="#10b981" strokeWidth="3" strokeLinecap="round" />
              
              {/* Actual dots */}
              <circle cx="0" cy="20" r="4" fill="#10b981" />
              <circle cx="100" cy="52" r="4" fill="#10b981" />
              <circle cx="200" cy="90" r="5" fill="#10b981" stroke="rgba(16,185,129,0.4)" strokeWidth="4" />
            </svg>
            
            {/* X-Axis Labels */}
            <div className="flex justify-between text-[9px] font-bold text-stone-500 pt-2 px-1">
              <span>JAN</span>
              <span>MAR</span>
              <span>MAY (CURRENT)</span>
              <span>JUL</span>
              <span>SEP</span>
              <span>DEC</span>
            </div>
          </div>
        </div>

        {/* Column C: Operational Risk register */}
        <div className="glass-panel p-6 rounded-2xl border-none shadow-xl flex flex-col h-[340px] overflow-hidden">
          <div className="mb-4">
            <h3 className="text-sm font-black text-white flex items-center gap-2">
              <ShieldAlert className="h-4 w-4 text-amber-500" />
              Active Risk Factors
            </h3>
            <p className="text-[10px] text-stone-500">Live operational threat matrix logged in database</p>
          </div>

          <div className="flex-1 overflow-y-auto pr-1 space-y-3 scrollbar-thin">
            {risks.length === 0 ? (
              <div className="flex items-center justify-center h-full text-stone-500 text-[11px] font-bold">
                No active threats logged.
              </div>
            ) : (
              risks.map((risk) => (
                <div key={risk.id} className="p-3 bg-black/25 rounded-xl border border-white/5 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[9px] font-mono text-stone-500 truncate max-w-[120px]" title={risk.intervention_name}>
                      {risk.intervention_name}
                    </span>
                    <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                      risk.probability * risk.impact > 0.4
                        ? "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        : "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                    }`}>
                      Score: {Math.round(risk.probability * risk.impact * 100)}
                    </span>
                  </div>
                  
                  <p className="text-xs text-stone-300 font-bold leading-relaxed">{risk.description}</p>
                  
                  <div className="pt-1.5 border-t border-white/5">
                    <span className="text-[9px] font-bold uppercase tracking-wider text-emerald-450 text-emerald-400 block mb-0.5">Mitigation Strategy:</span>
                    <p className="text-[10px] text-stone-400 italic leading-normal">{risk.mitigation}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Active Interventions List */}
      <div className="space-y-4">
        <h3 className="text-sm font-black text-white uppercase tracking-wider">Active & Deployed Interventions</h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {interventions.map((int) => {
            const progress = int.actual_savings || 0;
            const target = int.projected_reduction_tonnes;
            const ratio = target > 0 ? progress / target : 0;

            return (
              <div 
                key={int.id}
                className="glass-panel p-5 rounded-2xl border-none shadow-md bg-stone-950/20 flex flex-col justify-between space-y-4 hover:-translate-y-0.5 transition-all hover:bg-stone-900/10 border-l-2 hover:border-l-emerald-500"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-wider ${
                      int.status === "live"
                        ? "bg-emerald-600/10 text-emerald-400 border border-emerald-500/25"
                        : int.status === "committed"
                        ? "bg-blue-600/10 text-blue-400 border border-blue-500/25"
                        : "bg-stone-600/10 text-stone-400 border border-stone-500/25"
                    }`}>
                      {int.status}
                    </span>
                    <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">{int.stage} stage</span>
                  </div>
                  <h4 className="text-sm font-bold text-white leading-snug">{int.name}</h4>
                  <p className="text-[10px] text-stone-400">Region: <strong className="text-white">{int.region}</strong></p>
                </div>

                <div className="space-y-2 pt-2 border-t border-white/5">
                  <div className="flex justify-between items-center text-[10px] font-bold">
                    <span className="text-stone-500">Savings Target:</span>
                    <span className="text-white">-{int.projected_reduction_pct}% (~{target.toLocaleString()} tonnes)</span>
                  </div>

                  {int.status === "live" && (
                    <div className="space-y-1">
                      <div className="flex justify-between items-center text-[10px] font-bold">
                        <span className="text-stone-500">Achieved Savings:</span>
                        <span className={`font-mono ${ratio < 0.8 ? "text-amber-400" : "text-emerald-400"}`}>
                          {progress.toLocaleString()} tonnes ({Math.round(ratio * 100)}%)
                        </span>
                      </div>
                      <div className="h-1.5 w-full bg-stone-900 rounded-full overflow-hidden p-[1px]">
                        <div 
                          style={{ width: `${Math.min(ratio * 100, 100)}%` }}
                          className={`h-full rounded-full transition-all duration-500 ${
                            ratio < 0.8 ? "bg-amber-500" : "bg-emerald-500"
                          }`}
                        />
                      </div>
                    </div>
                  )}

                  {int.status === "committed" && (
                    <div className="flex items-center gap-1.5 text-[10px] font-bold text-blue-400 bg-blue-500/5 border border-blue-500/10 px-2 py-1 rounded-lg">
                      <Calendar className="h-3.5 w-3.5" />
                      <span>Deployment target: {int.target_date}</span>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
