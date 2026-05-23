"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, FileText, ChevronRight, Zap, PlayCircle, X, CheckCircle2, ShieldAlert } from "lucide-react";
import { supabase } from "@/lib/supabase";

interface Candidate {
  id: string;
  name: string;
  stage: string;
  region: string;
  projected_reduction_pct: number;
  projected_reduction_tonnes: number;
  effort_level: "Low" | "Medium" | "High";
  urgency: "Low" | "Medium" | "High";
  status: string;
  target_date: string;
  priority_score: number;
}

export function PriorityQueue() {
  const [candidates, setCandidates] = useState<Candidate[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  
  // Slide-over drawer brief state
  const [selectedBrief, setSelectedBrief] = useState<{
    name: string;
    content: string;
    triggeredAt: string;
    id: string;
  } | null>(null);
  const [isGeneratingBriefId, setIsGeneratingBriefId] = useState<string | null>(null);

  const fetchCandidates = async () => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase
        .from("interventions")
        .select("*")
        .eq("status", "candidate");

      if (error) throw error;

      // Compute priority score locally: projected_reduction_tonnes / effort_score
      // Low = 1, Medium = 2, High = 3
      const mapped = (data || []).map((item: any) => {
        let effortScore = 1;
        if (item.effort_level === "Medium") effortScore = 2;
        if (item.effort_level === "High") effortScore = 3;

        const priorityScore = Number((item.projected_reduction_tonnes / effortScore).toFixed(1));

        return {
          ...item,
          priority_score: priorityScore
        };
      });

      // Rank by priority score descending
      mapped.sort((a, b) => b.priority_score - a.priority_score);

      setCandidates(mapped);
    } catch (err) {
      console.error("Error loading candidates:", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCandidates();
  }, []);

  const handleGenerateBrief = async (candidate: Candidate) => {
    if (isGeneratingBriefId) return;
    setIsGeneratingBriefId(candidate.id);
    try {
      // Invoke unified deployed cloud Edge Function "api-v1-us-foodwaste"
      const { data, error } = await supabase.functions.invoke("api-v1-us-foodwaste", {
        body: { 
          intervention_id: candidate.id,
          trigger_reason: "Manual prioritized optimization request from console." 
        },
      });

      if (error) {
        throw new Error(error.message);
      }

      if (data && data.success) {
        setSelectedBrief({
          id: data.brief_id,
          name: candidate.name,
          content: data.content,
          triggeredAt: new Date(data.triggered_at).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
        });
      } else {
        throw new Error("Invalid response format received from brief generator.");
      }
    } catch (err: any) {
      alert("Error generating brief: " + err.message);
    } finally {
      setIsGeneratingBriefId(null);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-4">
        <div className="h-8 w-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-xs font-bold text-stone-400 tracking-wider uppercase">Sorting Candidate Queue...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300 relative">
      
      {/* Upper header */}
      <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-lg font-black text-white flex items-center gap-2">
            <Zap className="h-5 w-5 text-amber-400" />
            Priority Intervention Queue
          </h2>
          <p className="text-xs text-stone-400">
            Pre-aggregated B2B candidate list ranked dynamically by ROI (Reduction tonnes / Effort Score)
          </p>
        </div>
      </div>

      {/* Main candidate table/grid */}
      <div className="glass-panel border-none shadow-xl rounded-2xl overflow-hidden bg-black/10">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-white/5 bg-white/[0.02] text-stone-450 text-stone-400 font-extrabold uppercase tracking-wider text-[10px]">
                <th className="py-4 px-6">Rank & Candidate</th>
                <th className="py-4 px-4">Supply Stage</th>
                <th className="py-4 px-4 text-right">Potential Impact</th>
                <th className="py-4 px-4 text-center">Effort / Urgency</th>
                <th className="py-4 px-4 text-center">Priority Score</th>
                <th className="py-4 px-6 text-center">Action</th>
              </tr>
            </thead>
            <tbody>
              {candidates.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-12 text-center text-stone-500 font-bold">
                    No candidate interventions currently logged in the queue.
                  </td>
                </tr>
              ) : (
                candidates.map((cand, idx) => (
                  <tr 
                    key={cand.id}
                    className="border-b border-white/5 hover:bg-white/[0.02] transition-colors group"
                  >
                    {/* Name & Rank */}
                    <td className="py-4 px-6 font-bold">
                      <div className="flex items-center gap-3">
                        <span className="h-6 w-6 rounded-lg bg-white/5 border border-white/10 flex items-center justify-center text-[10px] text-stone-400 font-mono font-extrabold group-hover:border-emerald-500/30 group-hover:text-emerald-400 transition-colors">
                          {idx + 1}
                        </span>
                        <div>
                          <p className="text-white text-xs font-black">{cand.name}</p>
                          <p className="text-[10px] text-stone-400 font-bold mt-0.5">{cand.region}</p>
                        </div>
                      </div>
                    </td>

                    {/* Stage */}
                    <td className="py-4 px-4">
                      <span className="px-2 py-0.5 bg-white/5 border border-white/10 text-[9px] font-bold text-stone-300 rounded uppercase tracking-wider">
                        {cand.stage}
                      </span>
                    </td>

                    {/* Reduction */}
                    <td className="py-4 px-4 text-right">
                      <div className="space-y-1">
                        <span className="text-emerald-400 font-mono font-extrabold">-{cand.projected_reduction_pct}%</span>
                        <span className="text-stone-400 text-[10px] block">~{cand.projected_reduction_tonnes.toLocaleString()} tonnes</span>
                      </div>
                    </td>

                    {/* Badges */}
                    <td className="py-4 px-4 text-center">
                      <div className="flex flex-col items-center gap-1">
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          cand.effort_level === "Low"
                            ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/20"
                            : cand.effort_level === "Medium"
                            ? "bg-amber-500/10 text-amber-400 border border-amber-500/20"
                            : "bg-rose-500/10 text-rose-400 border border-rose-500/20"
                        }`}>
                          Effort: {cand.effort_level}
                        </span>
                        <span className={`px-1.5 py-0.5 rounded text-[8px] font-black uppercase ${
                          cand.urgency === "High"
                            ? "bg-rose-500/10 text-rose-400 border border-rose-500/20 animate-pulse"
                            : "bg-stone-500/10 text-stone-400 border border-white/5"
                        }`}>
                          Urgency: {cand.urgency}
                        </span>
                      </div>
                    </td>

                    {/* Priority Score */}
                    <td className="py-4 px-4 text-center">
                      <span className="text-sm font-mono font-black text-amber-400 bg-amber-500/5 border border-amber-500/10 rounded-lg px-2.5 py-1">
                        {cand.priority_score}
                      </span>
                    </td>

                    {/* Action */}
                    <td className="py-4 px-6 text-center">
                      <button
                        onClick={() => handleGenerateBrief(cand)}
                        disabled={isGeneratingBriefId !== null}
                        className="bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white font-extrabold text-[10px] uppercase tracking-wider px-3.5 py-2 rounded-xl flex items-center justify-center gap-1.5 border border-emerald-500/20 hover:border-emerald-400 shadow-md transition-all cursor-pointer mx-auto"
                      >
                        {isGeneratingBriefId === cand.id ? (
                          <>
                            <span className="h-3.5 w-3.5 border border-white border-t-transparent rounded-full animate-spin shrink-0" />
                            Thinking...
                          </>
                        ) : (
                          <>
                            <Sparkles className="h-3.5 w-3.5 shrink-0" />
                            Generate Brief
                            <ChevronRight className="h-3.5 w-3.5" />
                          </>
                        )}
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Slide-over Diagnostic AI Brief panel */}
      {selectedBrief && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex justify-end animate-in fade-in duration-200">
          <div className="w-full max-w-xl bg-stone-950 border-l border-white/10 h-full flex flex-col shadow-2xl animate-in slide-in-from-right duration-300">
            {/* Drawer Header */}
            <div className="px-6 py-5 border-b border-white/15 bg-white/[0.02] flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <FileText className="h-5 w-5 text-emerald-400" />
                <div>
                  <h3 className="font-extrabold text-sm text-white">AI Corrective Action Brief</h3>
                  <p className="text-[10px] text-stone-400">Grounded Diagnostic // {selectedBrief.name}</p>
                </div>
              </div>
              <button 
                onClick={() => setSelectedBrief(null)}
                className="p-1 text-stone-400 hover:text-white hover:bg-white/5 border border-transparent hover:border-white/10 rounded-lg cursor-pointer transition-colors"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Brief Output Terminal */}
            <div className="flex-1 p-6 overflow-y-auto font-mono text-xs leading-relaxed space-y-4 scrollbar-thin text-stone-300 select-text">
              <div className="p-3.5 bg-black/40 border border-white/5 rounded-xl text-[10px] text-stone-400 font-bold space-y-1 select-none">
                <p>⚡ TARGET NODE IDENTIFIED: {selectedBrief.name}</p>
                <p>🔒 ENFORCE SECURITY CONTEXT: ROLE = OPERATOR, COMPLIANCE = COMPLETED</p>
                <p>⏰ GENERATION TIMESTAMP: {selectedBrief.triggeredAt}</p>
              </div>

              {/* Render generated brief markdown formatted */}
              <div className="prose prose-invert prose-xs max-w-none text-stone-300 font-sans space-y-6">
                {selectedBrief.content.split('\n').map((line, lIdx) => {
                  if (line.startsWith('# ')) {
                    return <h1 key={lIdx} className="text-lg font-black text-white border-b border-white/5 pb-2 mt-4">{line.replace('# ', '')}</h1>;
                  }
                  if (line.startsWith('## ')) {
                    return <h2 key={lIdx} className="text-sm font-extrabold text-emerald-405 text-emerald-400 pt-2 mt-3">{line.replace('## ', '')}</h2>;
                  }
                  if (line.startsWith('- ') || line.startsWith('* ')) {
                    return <li key={lIdx} className="ml-4 list-disc pl-1 font-bold text-stone-350">{line.replace(/^[-*]\s+/, '')}</li>;
                  }
                  if (line.trim().length === 0) return null;
                  return <p key={lIdx} className="leading-relaxed font-bold text-stone-400">{line}</p>;
                })}
              </div>
            </div>

            {/* Drawer Footer Actions */}
            <div className="p-4 bg-black/40 border-t border-white/10 flex items-center justify-between select-none">
              <span className="text-[9px] font-bold text-stone-500 uppercase tracking-widest">
                ID: {selectedBrief.id.slice(0, 8)}...
              </span>
              
              <div className="flex items-center gap-3">
                <button 
                  onClick={() => setSelectedBrief(null)}
                  className="px-4 py-2 border border-white/10 hover:bg-white/5 text-stone-400 hover:text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all cursor-pointer"
                >
                  Close Console
                </button>
                <button 
                  onClick={async () => {
                    // Mark as acknowledged
                    await supabase.from('briefs').update({ acknowledged_at: new Date().toISOString() }).eq('id', selectedBrief.id);
                    setSelectedBrief(null);
                    alert("Brief successfully acknowledged and committed to database history!");
                  }}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-extrabold text-[10px] uppercase tracking-wider rounded-xl transition-all shadow-md shadow-emerald-950/20 border border-emerald-500/20 hover:border-emerald-400 cursor-pointer"
                >
                  Acknowledge & Deploy
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
