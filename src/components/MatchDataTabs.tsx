import React, { useState } from "react";
import { TeamResult, PointConfig } from "../types";
import { Plus, Trash2, FileSpreadsheet, RefreshCw } from "lucide-react";

interface MatchDataTabsProps {
  matchesData: Record<number, TeamResult[]>;
  onUpdateTeam: (matchNo: number, index: number, field: keyof TeamResult, value: any) => void;
  onAddTeam: (matchNo: number) => void;
  onDeleteTeam: (matchNo: number, index: number) => void;
  onSortMatch: (matchNo: number) => void;
  config: PointConfig;
}

export default function MatchDataTabs({
  matchesData,
  onUpdateTeam,
  onAddTeam,
  onDeleteTeam,
  onSortMatch,
  config
}: MatchDataTabsProps) {
  const [activeTab, setActiveTab] = useState<number>(1);

  const currentMatchData = matchesData[activeTab] || [];
  const placementPoints = config.placementPoints || {};

  return (
    <div className="bg-slate-900/40 rounded-2xl border border-slate-800 p-6 shadow-inner font-sans">
      <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4 mb-6">
        <div>
          <h2 className="text-lg font-display font-bold text-slate-200 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-amber-500" />
            Detail Data Per Match (Spreadsheet Editor)
          </h2>
          <p className="text-xs text-slate-500 font-mono mt-1">
            Sesuaikan skor hasil OCR atau input nama & kill tim secara langsung pada kolom spreadsheet di bawah ini.
          </p>
        </div>

        {/* Tab Buttons (6 Matches) */}
        <div className="flex flex-wrap bg-slate-950 p-1 rounded-xl border border-slate-800/80 w-full lg:w-auto gap-1">
          {[1, 2, 3, 4, 5, 6].map((num) => {
            const isOptional = num > 3;
            const hasData = matchesData[num] && matchesData[num].length > 0;
            return (
              <button
                key={num}
                onClick={() => setActiveTab(num)}
                className={`px-3 py-2 rounded-lg text-xs font-display font-semibold transition-all duration-300 flex items-center gap-1 ${
                  activeTab === num
                    ? "bg-amber-500 text-slate-950 font-bold shadow-md shadow-amber-500/10"
                    : "text-slate-400 hover:text-slate-200 hover:bg-slate-900/40"
                }`}
              >
                <span>M{num}</span>
                {isOptional && <span className="opacity-60 text-[9px] font-normal">(Opt)</span>}
                {hasData && (
                  <span className={`w-1.5 h-1.5 rounded-full ${activeTab === num ? "bg-slate-950" : "bg-emerald-500"}`} />
                )}
              </button>
            );
          })}
        </div>
      </div>

      <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-950/50">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="border-b border-slate-800 bg-slate-900/30 text-[11px] uppercase tracking-wider text-slate-400 font-mono">
              <th className="py-3 px-4 text-center w-20">Peringkat (Rank)</th>
              <th className="py-3 px-4">Nama Tim / Pemain Representatif</th>
              <th className="py-3 px-4 text-center w-28">Elimasi (Kills)</th>
              <th className="py-3 px-4 text-center w-32">Poin Posisi (PP)</th>
              <th className="py-3 px-4 text-center w-24">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800">
            {currentMatchData.length === 0 ? (
              <tr>
                <td colSpan={5} className="py-12 text-center text-slate-500 font-mono text-xs">
                  Belum ada data tim untuk Match {activeTab}.<br />
                  <span className="text-[11px] text-slate-600 mt-1 block">Silakan unggah tangkapan layar scoreboard pada kotak menu kiri atau klik tombol tambah baris secara langsung.</span>
                </td>
              </tr>
            ) : (
              currentMatchData.map((team, idx) => {
                // Calculate placement point based on dynamic points configuration
                const pp = placementPoints[team.rank] ?? 0;

                return (
                  <tr key={idx} className="hover:bg-slate-900/20 transition-colors">
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        min="1"
                        max="12"
                        value={team.rank}
                        onChange={(e) => onUpdateTeam(activeTab, idx, "rank", Math.max(1, Math.min(12, parseInt(e.target.value) || 1)))}
                        className="w-14 bg-slate-900 border border-slate-800 hover:border-amber-500/40 focus:border-amber-500 rounded px-1.5 py-1 text-center font-mono text-xs text-amber-400 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4">
                      <input
                        type="text"
                        value={team.teamName}
                        onChange={(e) => onUpdateTeam(activeTab, idx, "teamName", e.target.value)}
                        placeholder="Masukkan nama tim / nama pemain utama"
                        className="w-full bg-slate-900 border border-slate-800 hover:border-amber-500/40 focus:border-amber-500 rounded px-2.5 py-1 text-xs text-slate-200 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <input
                        type="number"
                        min="0"
                        value={team.kills}
                        onChange={(e) => onUpdateTeam(activeTab, idx, "kills", Math.max(0, parseInt(e.target.value) || 0))}
                        className="w-16 bg-slate-900 border border-slate-800 hover:border-amber-500/40 focus:border-amber-500 rounded px-1.5 py-1 text-center font-mono text-xs text-slate-200 focus:outline-none"
                      />
                    </td>
                    <td className="py-2.5 px-4 text-center text-xs font-mono font-bold text-amber-500/80">
                      +{pp} PP
                    </td>
                    <td className="py-2.5 px-4 text-center">
                      <button
                        onClick={() => onDeleteTeam(activeTab, idx)}
                        className="p-1 px-2 rounded hover:bg-red-500/10 text-slate-500 hover:text-red-400 transition"
                        title="Hapus tim ini dari lembar pertandingan ini"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Roster Controls */}
      <div className="flex flex-wrap gap-3 mt-4">
        <button
          onClick={() => onAddTeam(activeTab)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg px-3.5 py-2 text-xs transition border border-slate-800 cursor-pointer"
        >
          <Plus className="w-3.5 h-3.5 text-amber-500" />
          <span>Tambah Baris Tim Baru</span>
        </button>
        <button
          onClick={() => onSortMatch(activeTab)}
          className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 rounded-lg px-3.5 py-2 text-xs transition border border-slate-800 cursor-pointer"
          title="Urutkan kembali berdasarkan Rank (Placement)"
        >
          <RefreshCw className="w-3.5 h-3.5 text-amber-500" />
          <span>Rapikan / Sortir Akurasi Rank</span>
        </button>
      </div>
    </div>
  );
}

