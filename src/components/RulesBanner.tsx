import React from "react";
import { Trophy, Award } from "lucide-react";
import { PointConfig } from "../types";

interface RulesBannerProps {
  config: PointConfig;
}

export default function RulesBanner({ config }: RulesBannerProps) {
  const placementPoints = config.placementPoints || {};
  const killPoint = config.killPoint ?? 1;

  return (
    <div className="bg-slate-900/60 backdrop-blur-md rounded-2xl p-6 border border-amber-500/20 shadow-lg relative overflow-hidden">
      {/* Decorative background glow */}
      <div className="absolute -right-12 -top-12 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl pointer-events-none" />
      
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-6 relative z-10 font-sans">
        <div>
          <div className="flex items-center gap-2 mb-2">
            <Trophy className="w-5 h-5 text-amber-500 animate-pulse" />
            <span className="font-display font-semibold tracking-wider text-sm text-amber-500 uppercase">
              SISTEM POIN TURNAMEN CEPAT (FAST TOURNAMENT)
            </span>
          </div>
          <p className="text-xs text-slate-400 max-w-2xl leading-relaxed">
            Perhitungan skor mengikuti regulasi akumulasi poin Free Fire secara otomatis berdasarkan aturan poin posisi penempatan (Placement) dan jumlah eliminasi (Kills) aktif di bawah ini.
          </p>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 bg-slate-950/80 p-4 rounded-xl border border-slate-800">
          <div className="text-center px-2">
            <div className="text-amber-400 font-display font-bold text-lg">#1 Rank</div>
            <div className="text-xs text-slate-500 font-mono">{placementPoints[1] ?? 12} Poin</div>
          </div>
          <div className="text-center px-2 border-l border-slate-800">
            <div className="text-amber-400 font-display font-bold text-lg">#2 Rank</div>
            <div className="text-xs text-slate-500 font-mono">{placementPoints[2] ?? 9} Poin</div>
          </div>
          <div className="text-center px-2 border-l border-slate-800">
            <div className="text-amber-400 font-display font-bold text-lg">#3 Rank</div>
            <div className="text-xs text-slate-500 font-mono">{placementPoints[3] ?? 7} Poin</div>
          </div>
          <div className="text-center px-2 border-l border-slate-800">
            <div className="text-orange-400 font-display font-bold text-lg">1 Kill</div>
            <div className="text-xs text-slate-500 font-mono">{killPoint} Poin</div>
          </div>
        </div>
      </div>

      <div className="mt-4 pt-4 border-t border-slate-800/80 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-3 text-xs text-slate-400 font-mono">
        <div className="bg-slate-950/40 p-2 rounded text-center">#4 Rank: <strong className="text-slate-200">{placementPoints[4] ?? 5} Poin</strong></div>
        <div className="bg-slate-950/40 p-2 rounded text-center">#5 Rank: <strong className="text-slate-200">{placementPoints[5] ?? 4} Poin</strong></div>
        <div className="bg-slate-950/40 p-2 rounded text-center">#6 Rank: <strong className="text-slate-200">{placementPoints[6] ?? 3} Poin</strong></div>
        <div className="bg-slate-950/40 p-2 rounded text-center">#7 Rank: <strong className="text-slate-200">{placementPoints[7] ?? 2} Poin</strong></div>
        <div className="bg-slate-950/40 p-2 rounded text-center">#8-12 Rank: <strong className="text-slate-200">{placementPoints[8] ?? 1} Poin</strong></div>
        <div className="bg-slate-950/40 p-2 rounded text-center flex items-center justify-center gap-1">
          <Award className="w-3.5 h-3.5 text-amber-500" />
          <span>Tiebreaker: Total Kills</span>
        </div>
      </div>
    </div>
  );
}

