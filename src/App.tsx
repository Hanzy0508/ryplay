import React, { useState, useEffect, useRef } from "react";
import { 
  Trophy, 
  Upload, 
  Trash2, 
  Play, 
  RefreshCw, 
  Sparkles, 
  Download, 
  CheckCircle2, 
  X, 
  AlertTriangle,
  Info,
  Layers,
  ChevronRight,
  TrendingUp,
  User,
  Plus,
  Eye,
  Settings,
  Database,
  LogOut,
  Sun,
  Moon,
  BarChart3,
  Users,
  Check,
  FileText,
  UserCheck,
  Megaphone,
  ThumbsUp
} from "lucide-react";
import { MatchState, TeamResult, StandingResult, PointConfig, UserSubmission, MatchPhotoSlot } from "./types";
import { generateUUID, normalizeTeamName, downloadFile, getDemoSubmissions } from "./utils";
import RulesBanner from "./components/RulesBanner";
import MatchDataTabs from "./components/MatchDataTabs";
import html2canvas from "html2canvas";
import Swal from "sweetalert2";
import logoPath from "./assets/images/logo.jpg";

// Default point policy
const DEFAULT_CONFIG: PointConfig = {
  placementPoints: {
    1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 
    8: 3, 9: 2, 10: 1, 11: 0, 12: 0
  },
  killPoint: 1
};

export default function App() {
  // Navigation & General Role state
  const [role, setRole] = useState<"user" | "admin">("user");
  const [clientId, setClientId] = useState<string>("");
  const [clientIp, setClientIp] = useState<string>("Loading IP...");
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Dynamic system point settings
  const [config, setConfig] = useState<PointConfig>(DEFAULT_CONFIG);

  // Participant 6 Matches State
  const [matches, setMatches] = useState<Record<number, MatchState>>({
    1: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
    2: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
    3: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
    4: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
    5: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
    6: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
  });

  const [captains, setCaptains] = useState<Array<{ id: number; teamName: string; captainNick: string }>>(() => {
  const list = [];
  for (let i = 1; i <= 12; i++) {
    list.push({ id: i, teamName: "", captainNick: "" });
  }
  return list;
});
  
  const [activeTab, setActiveTab] = useState<"overall" | "details">("overall");
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [toast, setToast] = useState<{ message: string; type: "success" | "info" | "error" } | null>(null);
  const [serverMode, setServerMode] = useState<string>("System Sedang Mengerjakan");
  const exportAreaRef = useRef<HTMLDivElement>(null);

  // =====================================
  // ADMIN DASHBOARD LOCAL STATE
  // =====================================
  const [isAdminLoggedIn, setIsAdminLoggedIn] = useState<boolean>(false);
  const [adminUsername, setAdminUsername] = useState<string>("");
  const [adminPassword, setAdminPassword] = useState<string>("");
  const [adminAuthError, setAdminAuthError] = useState<string | null>(null);
  
  // Admin panel configuration
  const [adminTab, setAdminTab] = useState<"dashboard" | "users" | "points" | "statistics" | "announcements">("dashboard");
  const [adminIsDark, setAdminIsDark] = useState<boolean>(true);
  const [adminSearchIp, setAdminSearchIp] = useState<string>("");
  const [selectedUserDetail, setSelectedUserDetail] = useState<UserSubmission | null>(null);
  const [allSubmissions, setAllSubmissions] = useState<UserSubmission[]>([]);

  // Announcements states
  const [announcements, setAnnouncements] = useState<Array<{ id: string; title: string; content: string; timestamp: string }>>([]);
  const [showUserAnnouncements, setShowUserAnnouncements] = useState<boolean>(false);
  
  // Create / edit announcement form states
  const [newAnnTitle, setNewAnnTitle] = useState<string>("");
  const [newAnnContent, setNewAnnContent] = useState<string>("");
  const [newAnnTimestamp, setNewAnnTimestamp] = useState<string>("");

  // Points mode (bawaan = default, settings = custom)
  const [pointsMode, setPointsMode] = useState<"bawaan" | "settings">(() => {
    return (localStorage.getItem("ff_ft_points_mode") as "bawaan" | "settings") || "bawaan";
  });

  // Admin editable placements state
  const [editPlacements, setEditPlacements] = useState<Record<number, number>>({ ...DEFAULT_CONFIG.placementPoints });
  const [editKillVal, setEditKillVal] = useState<number>(1);
  const [bulkText, setBulkText] = useState<string>("");
  const [captainInputMode, setCaptainInputMode] = useState<"manual" | "bulk">("manual");
  const [ocrErrorHelp, setOcrErrorHelp] = useState<{
    matchNo: number;
    column: "A" | "B";
    errorMsg?: string;
  } | null>(null);
  const [showResetConfirm, setShowResetConfirm] = useState<boolean>(false);

  // =====================================
  // NOTIFICATIONS UTILS
  // =====================================
  const showToast = (message: string, type: "success" | "info" | "error" = "success") => {
    const iconColor = type === "success" ? "#10b981" : type === "error" ? "#ef4444" : "#f59e0b";
    
    Swal.fire({
      toast: true,
      position: "top-end",
      icon: type,
      title: message,
      showConfirmButton: false,
      timer: 3500,
      timerProgressBar: true,
      background: "#14141d",
      color: "#f1f5f9",
      iconColor: iconColor,
      customClass: {
        popup: "rounded-2xl border border-slate-800/80 shadow-2xl font-sans text-xs tracking-wide"
      },
      didOpen: (toast) => {
        toast.onmouseenter = Swal.stopTimer;
        toast.onmouseleave = Swal.resumeTimer;
      }
    });

    setToast({ message, type });
    setTimeout(() => {
      setToast(null);
    }, 3500);
  };

  // =====================================
  // SYSTEM INITIALIZATION & API SYNC
  // =====================================
  useEffect(() => {
    // 1. Load active PointConfig from Express DB or fallback custom profile
    const loadSystemConfig = async () => {
      const activeId = localStorage.getItem("ff_ft_client_id") || "";
      if (activeId) {
        const clientCustomConfig = localStorage.getItem(`ff_ft_config_${activeId}`);
        if (clientCustomConfig) {
          try {
            const parsed = JSON.parse(clientCustomConfig);
            setConfig(parsed);
            setEditPlacements(parsed.placementPoints);
            setEditKillVal(parsed.killPoint);
            setServerMode("System Sedang Mengerjakan");
            return;
          } catch (e) {}
        }
      }

      try {
        const res = await fetch("/api/point-config");
        const json = await res.json();
        if (json.success && json.config) {
          setConfig(json.config);
          setEditPlacements(json.config.placementPoints);
          setEditKillVal(json.config.killPoint);
          setServerMode("System Sedang Mengerjakan");
        }
      } catch (err) {
        console.warn("Failed to retrieve master point config, using fallback.", err);
        setServerMode("Koneksi Lokal Sandbox");
      }
    };

    // 2. Fetch IP & Identity logic
    const resolveIdentityAndLoadData = async () => {
      let resolvedIp = "127.0.0.1";
      let resolvedId = localStorage.getItem("ff_ft_client_id") || "";

      // Retrieve network public IP addresses address safely from api.ipify.org
      try {
        const ipRes = await fetch("https://api.ipify.org?format=json");
        const ipJson = await ipRes.json();
        if (ipJson.ip) {
          resolvedIp = ipJson.ip;
        }
      } catch (e) {
        console.warn("Failed IP validation lookup. Using intranet/host fallback.", e);
      }
      setClientIp(resolvedIp);

      if (!resolvedId) {
        resolvedId = generateUUID();
        localStorage.setItem("ff_ft_client_id", resolvedId);
      }
      setClientId(resolvedId);

      // Fetch existing user scoreboard submission details from Express DB
      try {
        const dataRes = await fetch(`/api/submission/${resolvedId}`);
        const dataJson = await dataRes.json();
        if (dataJson.success && dataJson.submission) {
          const sub = dataJson.submission;
          if (sub.matches && Object.keys(sub.matches).length > 0) {
            setMatches(sub.matches);
          }
          if (sub.captains && sub.captains.length > 0) {
            setCaptains(sub.captains);
          } else {
            const cachedCaptains = localStorage.getItem(`ff_ft_captains_backup_${resolvedId}`);
            if (cachedCaptains) {
              try { setCaptains(JSON.parse(cachedCaptains)); } catch (e) {}
            }
          }
          showToast("Sesi pertandingan Anda berhasil dipulihkan dari server!", "success");
        } else {
          // No submission on server, let's load from localStorage as client backup
          const cachedLocal = localStorage.getItem(`ff_ft_matches_backup_${resolvedId}`);
          if (cachedLocal) {
            try {
              setMatches(JSON.parse(cachedLocal));
            } catch (err) {}
          }
          const cachedCaptains = localStorage.getItem(`ff_ft_captains_backup_${resolvedId}`);
          if (cachedCaptains) {
            try {
              setCaptains(JSON.parse(cachedCaptains));
            } catch (err) {}
          }
          showToast("Meload data backup sesi lokal Anda.", "info");
        }
      } catch (err) {
        console.error("Networking submission restore failure.", err);
      } finally {
        setIsLoaded(true);
      }
    };

    // 3. Fetch portal announcements/information updates
    const fetchAnnouncementsListOnMount = async () => {
      // Load fallback from localStorage first immediately to avoid flicker or offline loss
      const cached = localStorage.getItem("ff_ft_announcements_backup");
      if (cached) {
        try {
          const parsed = JSON.parse(cached);
          if (Array.isArray(parsed) && parsed.length > 0) {
            setAnnouncements(parsed);
          }
        } catch (e) {}
      }

      try {
        const res = await fetch("/api/announcements");
        const json = await res.json();
        if (json.success && json.announcements) {
          setAnnouncements(json.announcements);
          localStorage.setItem("ff_ft_announcements_backup", JSON.stringify(json.announcements));
          
          if (json.announcements.length > 0) {
            const latestId = json.announcements[0].id;
            const lastReadId = localStorage.getItem("announcements_last_read_id");
            
            if (lastReadId !== latestId) {
              // A new announcement has been published since the last visit! Clear reading completed status
              localStorage.removeItem("announcements_read_completed");
              setShowUserAnnouncements(true);
            } else if (localStorage.getItem("announcements_read_completed") !== "true") {
              // No new announcement, but user hasn't marked the current one as read
              setShowUserAnnouncements(true);
            }
          }
        }
      } catch (err) {
        console.error("Gagal memuat informasi portal pada inisialisasi:", err);
      }
    };

    // Check administrator session login status on mount
    const hasSession = sessionStorage.getItem("admin_logged_in") === "true";
    if (hasSession) {
      setIsAdminLoggedIn(true);
    }

    loadSystemConfig();
    resolveIdentityAndLoadData();
    fetchAnnouncementsListOnMount();
  }, []);

  // Sync / refresh submissions list when in admin panel
  useEffect(() => {
    if (isAdminLoggedIn && role === "admin") {
      fetchSubmissionsList();
    }
  }, [role, isAdminLoggedIn]);

  const fetchSubmissionsList = async () => {
    try {
      const res = await fetch("/api/submissions");
      const json = await res.json();
      if (json.success && json.submissions) {
        setAllSubmissions(json.submissions);
      }
    } catch (e) {
      console.error("Error retrieving participant submissions.", e);
    }
  };

  // Active config selector based on pointsMode
  const activeConfig = React.useMemo(() => {
    if (pointsMode === "bawaan") {
      return DEFAULT_CONFIG;
    }
    return config;
  }, [pointsMode, config]);

  // =====================================
  // DYNAMIC DATA STANDINGS CALCULATION
  // =====================================
  const finalStandings = React.useMemo(() => {
    const registry: Record<string, {
      matches: Record<number, { rank: number; kills: number; pp: number }>;
      totalKills: number;
      totalPP: number;
      totalPoints: number;
      booyahCount: number;
    }> = {};

    const placementPoints = activeConfig.placementPoints || {};
    const killRatio = activeConfig.killPoint ?? 1;

    const normalizeName = (name: string): string => {
      return name.trim().toUpperCase().replace(/[^\w\s-]/g, "");
    };

    const originalNames: Record<string, string> = {};

    // Cycle through all 6 matches
    for (let mNo = 1; mNo <= 6; mNo++) {
      const matchData = matches[mNo]?.combinedData || [];
      matchData.forEach((team) => {
        if (!team.teamName) return;
        const clean = normalizeName(team.teamName);
        if (!registry[clean]) {
          registry[clean] = {
            matches: {
              1: { rank: 0, kills: 0, pp: 0 },
              2: { rank: 0, kills: 0, pp: 0 },
              3: { rank: 0, kills: 0, pp: 0 },
              4: { rank: 0, kills: 0, pp: 0 },
              5: { rank: 0, kills: 0, pp: 0 },
              6: { rank: 0, kills: 0, pp: 0 }
            },
            totalKills: 0,
            totalPP: 0,
            totalPoints: 0,
            booyahCount: 0
          };
        }

        if (!originalNames[clean] || team.teamName.length < originalNames[clean].length) {
          originalNames[clean] = team.teamName.trim();
        }

        const pp = placementPoints[team.rank] ?? 0;
        const kp = team.kills * killRatio;

        registry[clean].matches[mNo] = {
          rank: team.rank,
          kills: team.kills,
          pp
        };
        registry[clean].totalKills += team.kills;
        registry[clean].totalPP += pp;
        registry[clean].totalPoints += pp + kp;
        if (team.rank === 1) {
          registry[clean].booyahCount += 1;
        }
      });
    }

    const list: StandingResult[] = Object.entries(registry).map(([cleanName, item]) => {
      return {
        teamName: originalNames[cleanName] || cleanName,
        match1: item.matches[1],
        match2: item.matches[2],
        match3: item.matches[3],
        match4: item.matches[4],
        match5: item.matches[5],
        match6: item.matches[6],
        totalKills: item.totalKills,
        totalPP: item.totalPP,
        totalPoints: item.totalPoints,
        booyahCount: item.booyahCount
      };
    });

    // Sort: Total Points desc, Total Kills desc, Booyah desc
    return list.sort((a, b) => {
      if (b.totalPoints !== a.totalPoints) {
        return b.totalPoints - a.totalPoints;
      }
      if (b.totalKills !== a.totalKills) {
        return b.totalKills - a.totalKills;
      }
      return b.booyahCount - a.booyahCount;
    });
  }, [matches, activeConfig]);

  // =====================================
  // AUTO SAVE TO BACKEND PIPELINE
  // =====================================
  const saveStandingsToBackend = async (
    updatedMatches: Record<number, MatchState>,
    updatedCaptains: Array<{ id: number; teamName: string; captainNick: string }> = captains
  ) => {
    if (!clientId) return;
    setIsSaving(true);
    try {
      localStorage.setItem(`ff_ft_matches_backup_${clientId}`, JSON.stringify(updatedMatches));
      localStorage.setItem(`ff_ft_captains_backup_${clientId}`, JSON.stringify(updatedCaptains));

      // Build standing result list to cache on server
      const currentStandings = finalStandings;

      await fetch("/api/submission", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientId,
          matches: updatedMatches,
          calculatedStandings: currentStandings,
          ipOverride: clientIp,
          captains: updatedCaptains
        })
      });
    } catch (err) {
      console.warn("Storage network synchronization skipped, backup cached in client.", err);
    } finally {
      setIsSaving(false);
    }
  };

  const displayMatchNumbers = React.useMemo(() => {
    const active = [1, 2, 3, 4, 5, 6].filter((num) => {
      const match = matches[num];
      return (
        (match.photoA && match.photoA.image !== null) ||
        (match.photoB && match.photoB.image !== null) ||
        (match.combinedData && match.combinedData.length > 0)
      );
    });
    return active.length > 0 ? active : [1, 2, 3];
  }, [matches]);

  const findCaptainNick = (name: string): string => {
    const norm = name.trim().toUpperCase().replace(/[^\w\s-]/g, "");
    if (!norm) return "";
    const found = captains.find(c => {
      const normCapTeam = c.teamName.trim().toUpperCase().replace(/[^\w\s-]/g, "");
      return normCapTeam && norm === normCapTeam;
    });
    return found ? found.captainNick : "";
  };

  const handleCaptainChange = (id: number, field: "teamName" | "captainNick", val: string) => {
    setCaptains((prev) => {
      const updated = prev.map((item) => {
        if (item.id === id) {
          return { ...item, [field]: val };
        }
        return item;
      });
      // Save synchronously
      saveStandingsToBackend(matches, updated);
      return updated;
    });
  };

  const handleClearAllColumns = () => {
    const emptyMatches: Record<number, MatchState> = {
      1: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      2: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      3: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      4: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      5: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      6: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
    };
    // Ensure accurate structure for Match 3 photoA slot
    emptyMatches[3].photoA = { image: null, fileName: null, mimeType: null, status: "idle", data: [] };

    const emptyCaptains = [];
    for (let i = 1; i <= 12; i++) {
      emptyCaptains.push({ id: i, teamName: "", captainNick: "" });
    }

    setMatches(emptyMatches);
    setCaptains(emptyCaptains);
    setBulkText("");
    setShowResetConfirm(false);

    // Save empty state to backend
    saveStandingsToBackend(emptyMatches, emptyCaptains);
    showToast("Semua kolom, foto, & data kapten berhasil dibersihkan!", "success");
  };

  const convertCaptainsToBulkText = (caps) => {
  return caps
    .map((c, idx) => {
      if (!c.teamName && !c.captainNick) return "";
      return `${idx + 1}.${c.teamName}/${c.captainNick}`;
    })
    .filter(Boolean)
    .join("\n");
};

  const parseAndApplyBulkText = (textVal: string) => {
    if (!textVal.trim()) return;
    const lines = textVal.split("\n").map(l => l.trim()).filter(Boolean);
    const updatedCaptains = [...captains];

    lines.forEach((line, lineIdx) => {
      let cleaned = line;
      if (cleaned.startsWith("(")) cleaned = cleaned.substring(1);
      if (cleaned.endsWith(")")) cleaned = cleaned.substring(0, cleaned.length - 1);

      const numberMatch = cleaned.match(/^([0-9]+)[\.\-\)\s:]+\s*(.*)$/);
      let targetIndex = lineIdx;
      let content = cleaned;

      if (numberMatch) {
        const parsedNum = parseInt(numberMatch[1]);
        if (parsedNum >= 1 && parsedNum <= 12) {
          targetIndex = parsedNum - 1;
          content = numberMatch[2].trim();
        }
      }

      const parts = content.split("/");
      const teamName = parts[0] ? parts[0].trim() : "";
      const captainNick = parts[1] ? parts[1].trim() : "";

      if (targetIndex >= 0 && targetIndex < 12) {
        updatedCaptains[targetIndex] = {
          id: targetIndex + 1,
          teamName: teamName,
          captainNick: captainNick
        };
      }
    });

    setCaptains(updatedCaptains);
    saveStandingsToBackend(matches, updatedCaptains);
  };

  const handleToggleInputMode = (targetMode: "manual" | "bulk") => {
    if (targetMode === "manual") {
      if (bulkText.trim()) {
        parseAndApplyBulkText(bulkText);
      }
    } else {
      // Textarea dibiarkan kosong saat switch ke bulk mode
      // User dapat menginput data bulk mereka sendiri
      // Placeholder akan menampilkan instruksi input
    }
    setCaptainInputMode(targetMode);
  };

  const handleApplyBulkText = () => {
    if (!bulkText.trim()) {
      showToast("Teks masukan kosong!", "error");
      return;
    }
    parseAndApplyBulkText(bulkText);
    showToast("Berhasil menerapkan bulk teks ke data kapten!", "success");
  };

  // =====================================
  // FILE UPLOAD AND DRAG-DROP HANDLERS
  // =====================================
  const handleImageRead = (matchNo: number, column: "A" | "B", file: File) => {
    // Show notification start upload
    showToast(`Membaca gambar Match ${matchNo} (Foto ${column})...`, "info");
    
    const reader = new FileReader();
    reader.onloadend = () => {
      setMatches((prev) => {
        const targetMatch = { ...prev[matchNo] };
        const slotKey = column === "A" ? "photoA" : "photoB";
        
        targetMatch[slotKey] = {
          image: reader.result as string,
          fileName: file.name,
          mimeType: file.type,
          status: "idle",
          data: []
        };

        const updated = { ...prev, [matchNo]: targetMatch };
        saveStandingsToBackend(updated);
        return updated;
      });
      showToast(`Gambar ${file.name} berhasil diunggah kolom Match ${matchNo} - Slot ${column}! Harap ketuk 'Proses OCR/Pindai'.`, "success");
    };
    reader.onerror = () => {
      showToast("Kesalahan saat mengunggah gambar screenshot.", "error");
    };
    reader.readAsDataURL(file);
  };

  const clearSlotImage = (matchNo: number, column: "A" | "B") => {
    setMatches((prev) => {
      const targetMatch = { ...prev[matchNo] };
      const slotKey = column === "A" ? "photoA" : "photoB";
      
      targetMatch[slotKey] = {
        image: null,
        fileName: null,
        mimeType: null,
        status: "idle",
        data: []
      };

      // Recalculate combinedData when a slot is stripped empty
      const otherSlotData = column === "A" ? targetMatch.photoB.data : targetMatch.photoA.data;
      targetMatch.combinedData = [...otherSlotData].sort((a,b)=> a.rank - b.rank);

      const updated = { ...prev, [matchNo]: targetMatch };
      saveStandingsToBackend(updated);
      return updated;
    });
    showToast(`Slot Match ${matchNo} ${column} telah dikosongkan.`, "info");
  };

  // =====================================
  // DYNAMIC COMPRESSED OCR PARSER
  // =====================================
  const runSingleScanOcr = async (matchNo: number, column: "A" | "B") => {
    const slot = matches[matchNo][column === "A" ? "photoA" : "photoB"];
    if (!slot.image) return;

    // Update status to loading
    setMatches((prev) => {
      const targetMatch = { ...prev[matchNo] };
      targetMatch[column === "A" ? "photoA" : "photoB"].status = "loading";
      return { ...prev, [matchNo]: targetMatch };
    });

    try {
      showToast(`Mengirim ke Sistem OCR: M${matchNo} Slot ${column}...`, "info");
      
      const response = await fetch("/api/process-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          image: slot.image,
          mimeType: slot.mimeType || "image/png",
          matchNo: matchNo
        })
      });

      if (!response.ok) {
        throw new Error("Koneksi gagal ke server OCR.");
      }

      const resData = await response.json();
      if (resData.success && Array.isArray(resData.data)) {
        setMatches((prev) => {
          const target = { ...prev[matchNo] };
          const results = resData.data;

          target[column === "A" ? "photoA" : "photoB"] = {
            ...target[column === "A" ? "photoA" : "photoB"],
            status: "success",
            data: results
          };

          // Combine photoA and photoB results reactively!
          const allTeamsMerged = [...target.photoA.data, ...target.photoB.data];
          // Sort teams by rank automatically
          target.combinedData = allTeamsMerged.sort((a, b) => a.rank - b.rank);

          const updated = { ...prev, [matchNo]: target };
          saveStandingsToBackend(updated);
          return updated;
        });
        showToast(`Kemajuan OCR berhasil! Extraced ${resData.data.length} tim dari Match ${matchNo} (${column}).`, "success");
      } else {
        throw new Error(resData.error || "Format respons tidak valid.");
      }
    } catch (err: any) {
      console.error(err);
      setMatches((prev) => {
        const target = { ...prev[matchNo] };
        target[column === "A" ? "photoA" : "photoB"].status = "error";
        target[column === "A" ? "photoA" : "photoB"].errorMsg = err.message;
        return { ...prev, [matchNo]: target };
      });
      showToast(`OCR Gagal (M${matchNo} - ${column}): ${err.message || "Gagal menghubungi Sistem OCR"}`, "error");
    }
  };

  // Big trigger calculate: processes any unparsed screenshots, merges values and compiles spreadsheet.
  const handleCalculateAll = async () => {

    // Identify which screenshots are uploaded but still in "idle" or "error" state
    const pendingScans: { matchNo: number; column: "A" | "B" }[] = [];
    for (let m = 1; m <= 6; m++) {
      if (matches[m].photoA.image && (matches[m].photoA.status === "idle" || matches[m].photoA.status === "error")) {
        pendingScans.push({ matchNo: m, column: "A" });
      }
      if (matches[m].photoB.image && (matches[m].photoB.status === "idle" || matches[m].photoB.status === "error")) {
        pendingScans.push({ matchNo: m, column: "B" });
      }
    }

    // Validation check: match 1 to 3 must have at least photoA (Screenshot Atas) loaded! Screenshot Bawah is optional.
    const missingWajib: number[] = [];
    for (let m = 1; m <= 3; m++) {
      if (!matches[m].photoA.image) {
        missingWajib.push(m);
      }
    }

    if (missingWajib.length > 0) {
      showToast(`Match 1, Match 2, dan Match 3 wajib dilengkapi dengan Screenshot Atas (#1 - #6)! Match ${missingWajib.join(", ")} belum memiliki foto.`, "error");
      return;
    }

    if (pendingScans.length === 0) {
      showToast("Seluruh lembar klasemen berhasil direkap & dikalkulasi!", "success");
      setActiveTab("overall");
      return;
    }

    setIsProcessing(true);
    showToast(`Memulai scanning paralel pada ${pendingScans.length} screenshot...`, "info");

    try {
      // Run pending OCRs in parallel!
      await Promise.all(
        pendingScans.map((item) => runSingleScanOcr(item.matchNo, item.column))
      );
      showToast("Kalkulasi & OCR Selesai! Klasemen telah dihitung.", "success");
      setActiveTab("overall");
    } catch (e) {
      console.error(e);
      showToast("Terjadi problem saat men-scan seluruh foto paralel.", "error");
    } finally {
      setIsProcessing(false);
    }
  };

  // =====================================
  // DEMO DATA PRESENTATION SEEDING
  // =====================================
  const seedDemoFast = () => {
    const demoA: TeamResult[] = [
      { rank: 1, teamName: "Matahari Esports", kills: 9 },
      { rank: 2, teamName: "Evos Divine", kills: 7 },
      { rank: 3, teamName: "RRQ Kazu", kills: 5 },
      { rank: 4, teamName: "Onic Olympus", kills: 3 },
      { rank: 5, teamName: "Pahlawan Muda", kills: 1 },
      { rank: 6, teamName: "Thorrad", kills: 0 }
    ];
    const demoB: TeamResult[] = [
      { rank: 7, teamName: "Bigetron Delta", kills: 4 },
      { rank: 8, teamName: "Krakatau Gaming", kills: 2 },
      { rank: 9, teamName: "Dewetara FF", kills: 3 },
      { rank: 10, teamName: "Tiger Clan", kills: 1 },
      { rank: 11, teamName: "Morph Team", kills: 0 },
      { rank: 12, teamName: "Kuda Terbang", kills: 0 }
    ];

    setMatches({
      1: {
        photoA: { image: "demo", fileName: "Match1_Atas.jpg", mimeType: "image/jpeg", status: "success", data: demoA },
        photoB: { image: "demo", fileName: "Match1_Bawah.jpg", mimeType: "image/jpeg", status: "success", data: demoB },
        combinedData: [...demoA, ...demoB].sort((a,b)=>a.rank - b.rank)
      },
      2: {
        photoA: { image: "demo", fileName: "Match2_Atas.jpg", mimeType: "image/jpeg", status: "success", data: [
          { rank: 1, teamName: "Evos Divine", kills: 12 },
          { rank: 2, teamName: "Thorrad", kills: 8 },
          { rank: 3, teamName: "Matahari Esports", kills: 4 },
          { rank: 4, teamName: "RRQ Kazu", kills: 6 },
          { rank: 5, teamName: "Onic Olympus", kills: 2 },
          { rank: 6, teamName: "Krakatau Gaming", kills: 1 }
        ]},
        photoB: { image: "demo", fileName: "Match2_Bawah.jpg", mimeType: "image/jpeg", status: "success", data: [
          { rank: 7, teamName: "Dewetara FF", kills: 5 },
          { rank: 8, teamName: "Bigetron Delta", kills: 2 },
          { rank: 9, teamName: "Pahlawan Muda", kills: 1 },
          { rank: 10, teamName: "Tiger Clan", kills: 0 },
          { rank: 11, teamName: "Morph Team", kills: 1 },
          { rank: 12, teamName: "Kuda Terbang", kills: 0 }
        ]},
        combinedData: [
          { rank: 1, teamName: "Evos Divine", kills: 12 },
          { rank: 2, teamName: "Thorrad", kills: 8 },
          { rank: 3, teamName: "Matahari Esports", kills: 4 },
          { rank: 4, teamName: "RRQ Kazu", kills: 6 },
          { rank: 5, teamName: "Onic Olympus", kills: 2 },
          { rank: 6, teamName: "Krakatau Gaming", kills: 1 },
          { rank: 7, teamName: "Dewetara FF", kills: 5 },
          { rank: 8, teamName: "Bigetron Delta", kills: 2 },
          { rank: 9, teamName: "Pahlawan Muda", kills: 1 },
          { rank: 10, teamName: "Tiger Clan", kills: 0 },
          { rank: 11, teamName: "Morph Team", kills: 1 },
          { rank: 12, teamName: "Kuda Terbang", kills: 0 }
        ].sort((a,b)=>a.rank - b.rank)
      },
      3: {
        photoA: { image: "demo", fileName: "Match3_Atas.jpg", mimeType: "image/jpeg", status: "success", data: [
          { rank: 1, teamName: "RRQ Kazu", kills: 11 },
          { rank: 2, teamName: "Thorrad", kills: 7 },
          { rank: 3, teamName: "Evos Divine", kills: 9 },
          { rank: 4, teamName: "Onic Olympus", kills: 4 },
          { rank: 5, teamName: "Bigetron Delta", kills: 2 },
          { rank: 6, teamName: "Matahari Esports", kills: 1 }
        ]},
        photoB: { image: "demo", fileName: "Match3_Bawah.jpg", mimeType: "image/jpeg", status: "success", data: [
          { rank: 7, teamName: "Pahlawan Muda", kills: 3 },
          { rank: 8, teamName: "Dewetara FF", kills: 2 },
          { rank: 9, teamName: "Tiger Clan", kills: 1 },
          { rank: 10, teamName: "Krakatau Gaming", kills: 0 },
          { rank: 11, teamName: "Morph Team", kills: 0 },
          { rank: 12, teamName: "Kuda Terbang", kills: 0 }
        ]},
        combinedData: [
          { rank: 1, teamName: "RRQ Kazu", kills: 11 },
          { rank: 2, teamName: "Thorrad", kills: 7 },
          { rank: 3, teamName: "Evos Divine", kills: 9 },
          { rank: 4, teamName: "Onic Olympus", kills: 4 },
          { rank: 5, teamName: "Bigetron Delta", kills: 2 },
          { rank: 6, teamName: "Matahari Esports", kills: 1 },
          { rank: 7, teamName: "Pahlawan Muda", kills: 3 },
          { rank: 8, teamName: "Dewetara FF", kills: 2 },
          { rank: 9, teamName: "Tiger Clan", kills: 1 },
          { rank: 10, teamName: "Krakatau Gaming", kills: 0 },
          { rank: 11, teamName: "Morph Team", kills: 0 },
          { rank: 12, teamName: "Kuda Terbang", kills: 0 }
        ].sort((a,b)=>a.rank - b.rank)
      },
      4: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      5: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] },
      6: { photoA: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, photoB: { image: null, fileName: null, mimeType: null, status: "idle", data: [] }, combinedData: [] }
    });

    showToast("Data Contoh Pertandingan 1-3 Berhasil Dimuat!", "success");
    setActiveTab("overall");
  };

  // =====================================
  // SPREADSHEET EDITOR CALLBACK HANDLERS
  // =====================================
  const handleUpdateTeam = (matchNo: number, index: number, field: keyof TeamResult, value: any) => {
    setMatches((prev) => {
      const match = { ...prev[matchNo] };
      const currentList = [...match.combinedData];
      if (currentList[index]) {
        currentList[index] = {
          ...currentList[index],
          [field]: value
        };
      }
      match.combinedData = currentList;
      
      const updated = { ...prev, [matchNo]: match };
      saveStandingsToBackend(updated);
      return updated;
    });
  };

  const handleAddTeam = (matchNo: number) => {
    setMatches((prev) => {
      const match = { ...prev[matchNo] };
      const currentList = [...match.combinedData];
      
      const proposedRank = currentList.length + 1;
      const newTeam: TeamResult = {
        rank: proposedRank <= 12 ? proposedRank : 12,
        teamName: `Tim Baru #${proposedRank}`,
        kills: 0
      };

      match.combinedData = [...currentList, newTeam];
      const updated = { ...prev, [matchNo]: match };
      saveStandingsToBackend(updated);
      return updated;
    });
    showToast(`Tim Baru telah ditambahkan ke Match ${matchNo}.`, "success");
  };

  const handleDeleteTeam = (matchNo: number, index: number) => {
    setMatches((prev) => {
      const match = { ...prev[matchNo] };
      const currentList = [...match.combinedData];
      currentList.splice(index, 1);
      match.combinedData = currentList;

      const updated = { ...prev, [matchNo]: match };
      saveStandingsToBackend(updated);
      return updated;
    });
    showToast("Baris berhasil dipotong.", "info");
  };

  const handleSortMatch = (matchNo: number) => {
    setMatches((prev) => {
      const match = { ...prev[matchNo] };
      match.combinedData = [...match.combinedData].sort((a,b) => a.rank - b.rank);
      const updated = { ...prev, [matchNo]: match };
      saveStandingsToBackend(updated);
      return updated;
    });
    showToast(`Urutan Match ${matchNo} dirapikan kembali.`, "info");
  };

  // =====================================
  // REKAP EXPORT IMAGE CAPTURING (html2canvas)
  // =====================================
  const handleExportPNG = () => {
    if (!exportAreaRef.current) return;
    showToast("Mengonversi tabel klasemen ke gambar...", "info");

    setTimeout(() => {
      if (!exportAreaRef.current) return;
      html2canvas(exportAreaRef.current, {
        backgroundColor: "#07070b",
        scale: 2, // 2x ultra quality clarity
        windowWidth: 1200, // Forces high-fidelity landscape rendering regardless of user screen size
        useCORS: true,
        allowTaint: false, // Must be false so it doesn't fail on toDataURL
        logging: false
      }).then((canvas) => {
        try {
          const imgData = canvas.toDataURL("image/png");
          const link = document.createElement("a");
          link.download = `FF_Standing_By_Ryu_Classification_${new Date().toISOString().slice(0, 10)}.png`;
          link.href = imgData;
          document.body.appendChild(link);
          link.click();
          document.body.removeChild(link);
          showToast("Tabel Standing berhasil disimpan dalam format PNG!", "success");
        } catch (downloadErr) {
          console.warn("Direct download failed due to browser sandboxing or CORS. Attempting popup fallback.", downloadErr);
          try {
            const rawImg = canvas.toDataURL("image/png");
            const newWindow = window.open();
            if (newWindow) {
              newWindow.document.write(`<div style="background:#111; min-height:100vh; display:flex; flex-direction:column; justify-content:center; align-items:center; margin:0; padding:20px;"><img src="${rawImg}" style="max-width:100%; border-radius:12px; box-shadow:0 10px 30px rgba(0,0,0,0.5);" /><p style="font-family:sans-serif; color:#ccc; text-align:center; font-size:14px; margin-top:15px;">Tekan lama pada HP atau klik kanan pada PC lalu pilih <b>"Simpan Gambar / Save Image As"</b> untuk mengunduh Klasemen Resmi</p></div>`);
              showToast("Membuka gambar klasemen di tab baru!", "success");
            } else {
              showToast("Tangkapan layar tergagalkan oleh cookie blocker. Klik kanan pada tabel atau tangkap layar HP.", "error");
            }
          } catch (e2) {
            showToast("Metode pengunduhan diblokir oleh iframe browser. Lakukan tangkapan layar (screenshot) manual perangkat Anda.", "error");
          }
        }
      }).catch((canvasErr) => {
        console.error("html2canvas generation error", canvasErr);
        showToast("Gagal menangkap layar tabel klasemen secara otomatis.", "error");
      });
    }, 150);
  };

  // Total uploaded progress for mandatory images (Only FOTO 1 is mandatory for Matches 1,2,3)
  const calculateWajibProgress = () => {
    let uploaded = 0;
    for (let m = 1; m <= 3; m++) {
      if (matches[m].photoA.image) uploaded++;
    }
    return Math.round((uploaded / 3) * 100);
  };

  const wajibProgress = calculateWajibProgress();

  // =====================================
  // ADMIN DASHBOARD LOGIN HANDLERS
  // =====================================
  const handleAdminLogin = (e: React.FormEvent) => {
    e.preventDefault();
    setAdminAuthError(null);
    if (adminUsername === "hanzzyoo" && adminPassword === "hanzz0508") {
      setIsAdminLoggedIn(true);
      sessionStorage.setItem("admin_logged_in", "true");
      showToast("Selamat datang kembali, Admin utama!", "success");
      setAdminUsername("");
      setAdminPassword("");
    } else {
      setAdminAuthError("Username Atau Password Salah");
      showToast("Login gagal. Username Atau Password Salah.", "error");
    }
  };

  const handleAdminLogout = () => {
    setIsAdminLoggedIn(false);
    sessionStorage.removeItem("admin_logged_in");
    showToast("Sesi Admin telah berakhir.", "info");
  };

  // =====================================
  // ADMIN SYSTEM POINTS SETTINGS SAVING
  // =====================================
  const handleSavePointsSettings = async () => {
    try {
      const res = await fetch("/api/point-config", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          placementPoints: editPlacements,
          killPoint: editKillVal
        })
      });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        showToast("Pengaturan sistem & standing points berhasil disimpan secara permanen!", "success");
      }
    } catch (e) {
      showToast("Gagal menyimpan poin ke database backend.", "error");
    }
  };

  const handleResetPointsToDefault = async () => {
    try {
      const res = await fetch("/api/point-config/reset", { method: "POST" });
      const data = await res.json();
      if (data.success && data.config) {
        setConfig(data.config);
        setEditPlacements(data.config.placementPoints);
        setEditKillVal(data.config.killPoint);
        showToast("Konfigurasi poin dikembalikan ke pengaturan awal pabrik.", "info");
      }
    } catch (e) {
      showToast("Gagal me-rest konfigurasi server.", "error");
    }
  };

  // =====================================
  // ADMIN SYSTEM ANNOUNCEMENTS HANDLING
  // =====================================
  const handleSaveAnnouncements = async (updatedList: typeof announcements) => {
    setIsSaving(true);
    // Support instant client-side persistence as robust recovery cache
    localStorage.setItem("ff_ft_announcements_backup", JSON.stringify(updatedList));
    // Clear read counters so everyone (including this admin) can see the changes instantly
    localStorage.removeItem("announcements_read_completed");
    localStorage.removeItem("announcements_last_read_id");

    try {
      const res = await fetch("/api/announcements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ announcements: updatedList })
      });
      const data = await res.json();
      if (data.success && data.announcements) {
        setAnnouncements(data.announcements);
        showToast("Daftar Pengumuman berhasil disimpan di server!", "success");
      } else {
        throw new Error(data.error || "Gagal memperbarui");
      }
    } catch (err: any) {
      console.error(err);
      showToast(`Kesalahan: ${err.message}`, "error");
    } finally {
      setIsSaving(false);
    }
  };

  const handleAddAnnouncement = () => {
    if (!newAnnTitle.trim() || !newAnnContent.trim()) {
      showToast("Judul dan isi pengumuman tidak boleh kosong!", "error");
      return;
    }

    const tstamp = newAnnTimestamp.trim() || (() => {
      const days = ["Minggu", "Senin", "Selasa", "Rabu", "Kamis", "Jumat", "Sabtu"];
      const months = ["Januari", "Februari", "Maret", "April", "Mei", "Juni", "Juli", "Agustus", "September", "Oktober", "November", "Desember"];
      const d = new Date();
      const pad = (n: number) => n.toString().padStart(2, '0');
      return `${days[d.getDay()]}, ${d.getDate()} ${months[d.getMonth()]} ${d.getFullYear()} - ${pad(d.getHours())}:${pad(d.getMinutes())}`;
    })();

    const newItem = {
      id: generateUUID(),
      title: newAnnTitle.trim(),
      content: newAnnContent.trim(),
      timestamp: tstamp
    };

    const updated = [newItem, ...announcements];
    setAnnouncements(updated);
    handleSaveAnnouncements(updated);

    // reset fields
    setNewAnnTitle("");
    setNewAnnContent("");
    setNewAnnTimestamp("");
  };

  const handleDeleteAnnouncement = (idToDel: string) => {
    const updated = announcements.filter(item => item.id !== idToDel);
    setAnnouncements(updated);
    handleSaveAnnouncements(updated);
  };

  const handlePurgeAllSystemData = async () => {
    if (!window.confirm("PERINGATAN KRITIS: Apakah Anda yakin bermaksud untuk menghapus seluruh sesi user dan mengosongkan server? Tindakan ini tidak dapat dibatalkan!")) {
      return;
    }
    try {
      const res = await fetch("/api/submissions/reset", { method: "POST" });
      const data = await res.json();
      if (data.success) {
        setAllSubmissions([]);
        setSelectedUserDetail(null);
        setConfig(DEFAULT_CONFIG);
        setEditPlacements(DEFAULT_CONFIG.placementPoints);
        setEditKillVal(DEFAULT_CONFIG.killPoint);
        showToast("Seluruh database dan sesi pengguna telah dikosongkan secara berkala!", "success");
      }
    } catch (e) {
      showToast("Kesalahan sistem saat membersihkan data.", "error");
    }
  };

  const handleDeleteUserSubmission = async (targetClientId: string) => {
    if (!window.confirm(`Hapus sesi partisipan ${targetClientId}?`)) return;
    try {
      const res = await fetch(`/api/submission/${targetClientId}`, { method: "DELETE" });
      const json = await res.json();
      if (json.success) {
        setAllSubmissions((prev) => prev.filter((s) => s.clientId !== targetClientId));
        if (selectedUserDetail?.clientId === targetClientId) {
          setSelectedUserDetail(null);
        }
        showToast("Sesi target telah dihapus selamanya dari database.", "success");
      }
    } catch (e) {
      showToast("Gagal menghapus partisipan.", "error");
    }
  };

  // =====================================
  // DUMMY BACKUP EXPORTS (JSON, CSV)
  // =====================================
  const exportAllToJSON = () => {
    const payload = JSON.stringify({
      exportedAt: new Date().toISOString(),
      config,
      submissions: allSubmissions
    }, null, 2);
    downloadFile(payload, `FT_FF_AdminBackup_${Date.now()}.json`, "application/json");
    showToast("Berhasil mencetak database server ke JSON!", "success");
  };

  const exportAllToCSV = () => {
    let csv = "ID Client,Alamat IP,Tanggal Submit,Tim Terbaik,Skor Kompetisi Akhir\n";
    allSubmissions.forEach((sub) => {
      const topTeam = sub.calculatedStandings?.[0]?.teamName || "N/A";
      const topScore = sub.calculatedStandings?.[0]?.totalPoints || 0;
      csv += `"${sub.clientId}","${sub.ip}","${sub.timestamp}","${topTeam}",${topScore}\n`;
    });
    downloadFile(csv, `FT_FF_AdminClassifications_${Date.now()}.csv`, "text/csv;charset=utf-8;");
    showToast("Berhasil mencetak spreadsheet klasemen ke CSV!", "success");
  };


  // =====================================
  // STATISTICS METRICS FOR ADMIN VIEW
  // =====================================
  // Segmented metrics computed from submissions
  const statsSummary = React.useMemo(() => {
    const totalUsers = allSubmissions.length;
    let sumTotalPoints = 0;
    let submissionCounts = 0;
    const globalTeams: Record<string, { totalPoints: number; counts: number }> = {};

    allSubmissions.forEach((sub) => {
      if (sub.calculatedStandings && sub.calculatedStandings.length > 0) {
        submissionCounts++;
        sub.calculatedStandings.forEach((team) => {
          sumTotalPoints += team.totalPoints;
          const cleanName = team.teamName.trim().toUpperCase();
          if (!globalTeams[cleanName]) globalTeams[cleanName] = { totalPoints: 0, counts: 0 };
          globalTeams[cleanName].totalPoints += team.totalPoints;
          globalTeams[cleanName].counts += 1;
        });
      }
    });

    const averagePoints = submissionCounts > 0 ? Math.round(sumTotalPoints / submissionCounts) : 0;
    
    // Sort global teams
    const sortedGlobalTeams = Object.entries(globalTeams).map(([name, val]) => ({
      name,
      avgPoints: Math.round(val.totalPoints / val.counts),
      totalPoints: val.totalPoints
    })).sort((a,b) => b.totalPoints - a.totalPoints);

    return {
      totalUsers,
      averagePoints,
      topTeams: sortedGlobalTeams.slice(0, 5)
    };
  }, [allSubmissions]);


  return (
    <div className={`min-h-screen font-sans transition-colors duration-300 ${
      role === "admin" && !adminIsDark ? "bg-slate-50 text-slate-800" : "bg-[#07070a] text-slate-100"
    } flex flex-col selection:bg-orange-500 selection:text-black`}>



      {/* GLOBAL NAVBAR */}
      <header className={`border-b ${
        role === "admin" && !adminIsDark ? "border-slate-200 bg-white" : "border-orange-500/20 bg-[#0c0c0f]"
      } py-4 px-6 sm:px-8 flex flex-col md:flex-row items-stretch md:items-center justify-between gap-4 relative overflow-hidden`}>
        {/* Decorative background Esports Glow */}
        <div className="absolute right-0 top-0 w-96 h-96 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
        
        <div className="flex flex-col">
          <div className="flex items-center gap-3">
            <img 
              src={logoPath} 
              alt="Tournament Logo" 
              referrerPolicy="no-referrer"
              className="w-12 h-12 rounded-xl object-cover border border-orange-500/30 shadow-md shadow-orange-500/10 shrink-0"
            />
            <div>
              <h1 className={`text-xl sm:text-2xl font-black tracking-tighter ${
                role === "admin" && !adminIsDark ? "text-slate-900" : "text-white"
              }`}>
                FF <span className="text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">STANDING POINT BY RYU</span>
              </h1>
              <p className="text-[10px] uppercase tracking-[0.25em] text-orange-500 font-bold leading-none mt-1">
                OCR VISION ENGINE & RAPID SCORING PLATFORM
              </p>
            </div>
          </div>
        </div>

        {/* Dynamic Navigation Roles & Status Panel */}
        <div className="flex flex-wrap items-center gap-3.5">
          {/* Connection badge */}
          <div className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg border ${
            role === "admin" && !adminIsDark 
              ? "bg-slate-100 border-slate-200" 
              : "bg-slate-900/60 border-slate-800"
          }`}>
            <span className={`w-2 h-2 rounded-full ${serverMode.includes("Online") || serverMode.includes("Core") ? "bg-emerald-500 animate-ping" : "bg-amber-500"}`} />
            <div className="text-left font-mono">
              <div className="text-[8px] text-slate-500 font-bold opacity-80">SERVER CONNECTION</div>
              <div className="text-[10px] text-orange-500 font-semibold leading-none">{serverMode}</div>
            </div>
          </div>

          {/* Role Switching Panels Switch */}
          <div className="flex p-1 rounded-xl bg-slate-950 border border-slate-800">
            <button
              onClick={() => setRole("user")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                role === "user"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Trophy className="w-3.5 h-3.5" />
              <span>Portal Peserta</span>
            </button>
            <button
              onClick={() => setRole("admin")}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition-all duration-300 flex items-center gap-1.5 ${
                role === "admin"
                  ? "bg-gradient-to-r from-orange-500 to-amber-500 text-slate-950 shadow-md"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <User className="w-3.5 h-3.5" />
              <span>Dashboard Admin</span>
            </button>
          </div>

          {/* Demo injector & Clear All buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {role === "user" && (
              <>
                <button
                  type="button"
                  onClick={() => setShowUserAnnouncements(true)}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-850 border border-blue-500/20 hover:border-blue-500 text-blue-400 font-sans font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                  title="Tampilkan Informasi & Pengumuman Terbaru"
                >
                  <Megaphone className="w-3.5 h-3.5 text-blue-400" />
                  <span>Informasi Portal</span>
                </button>

                <button
                  onClick={seedDemoFast}
                  className="flex items-center gap-1.5 bg-slate-900 hover:bg-slate-800 border border-amber-500/20 hover:border-amber-500 text-amber-400 font-sans font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Muat Data Contoh</span>
                </button>
              </>
            )}

            {showResetConfirm ? (
              <div className="flex items-center gap-1.5 bg-red-950/40 border border-red-500/30 rounded-xl p-0.5 px-2">
                <span className="text-[10px] text-red-400 font-bold font-mono">Yakin?</span>
                <button
                  onClick={handleClearAllColumns}
                  className="bg-red-600 hover:bg-red-500 text-white font-sans font-black text-[10px] px-2 py-1 rounded-lg transition uppercase tracking-wider cursor-pointer"
                >
                  Ya, Bersihkan!
                </button>
                <button
                  type="button"
                  onClick={() => setShowResetConfirm(false)}
                  className="text-slate-400 hover:text-slate-200 text-[10px] px-1 font-bold cursor-pointer"
                >
                  Batal
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowResetConfirm(true)}
                className="flex items-center gap-1.5 bg-slate-900 hover:bg-red-950/20 border border-red-500/10 hover:border-red-500/40 text-red-400 font-sans font-bold text-xs px-3.5 py-2 rounded-xl transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5 text-red-500" />
                <span>Bersihkan Semua</span>
              </button>
            )}
          </div>
        </div>
      </header>

      {/* DUAL WORKSPACE SWITCH */}

      {role === "user" ? (
        // ====================================================================
        // WEB 1: PESERTA PORTAL (USER SCREEN)
        // ====================================================================
        <main className="flex-1 grid grid-cols-1 xl:grid-cols-12 gap-8 p-6 sm:p-8 max-w-[1600px] mx-auto w-full select-none">
          
          {/* Left Column (Upload modules + Rules) */}
          <section className="xl:col-span-5 flex flex-col gap-6">

            {/* Ke-1: Panduan Singkat Untuk User */}
            <div className="bg-slate-900/40 p-5 rounded-2xl border border-slate-800/80">
              <h4 className="text-xs font-bold font-mono text-amber-500 uppercase tracking-widest mb-1.5 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5" /> Panduan Singkat Untuk User
              </h4>
              <ul className="list-decimal list-inside text-[11px] text-slate-400 space-y-1.5 leading-relaxed">
                <li>Buka Menu <strong>Portal Peserta</strong> turnamen Free Fire Anda.</li>
                <li>Lengkapi setidaknya 1 screenshot per Match untuk Match 1 s/d 3 (FOTO 1). Foto kedua (FOTO 2) bersifat opsional.</li>
                <li>Tambahkan lembar opsional Match 4 s/d 6 jika turnamen berlangsung lebih lama.</li>
                <li>Pilih sistem perhitungan poin di panel <strong>System Standing Point</strong>. Gunakan <strong>Mode Bawaan</strong> untuk regulasi standar Free Fire resmi (Rank #1 mendapat 12 PP, dll), atau <strong>Mode Settings</strong> untuk kustomisasi poin posisi placement & eliminasi (kill) pribadi Anda.</li>
                <li>Isi <strong>Nama Tim & Nick Kapten</strong> agar nama tim Anda terpetakan otomatis ke kapten. Anda bisa menggunakan <strong>Fitur Bulk Teks</strong> untuk mendaftarkan semua sekaligus.</li>
                <li>Klik tombol <strong>"Kalkulasi OCR & Rekap Klasemen"</strong> untuk memindai data secara otomatis ke tabel rekap Klasemen Utama.</li>
                <li>Apabila terdapat ketidakakuratan OCR, buka tab <strong>"Match Log & Editor"</strong> untuk merevisi, menambah baris, atau merapikan data secara interaktif.</li>
              </ul>
            </div>

            {/* Ke-2: Nick Kapten (Captain Register & Bulk Input) */}
            <div className="bg-[#14141a]/95 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-2.5">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-4 h-4 text-orange-500 animate-pulse" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-sans">
                    NICK KAPTEN SETIAP TEAM (WAJIB DIISI)
                  </h3>
                </div>
                
                {/* Tab Switch Buttons */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 select-none self-start sm:self-auto shrink-0 shadow-inner">
                  <button
                    type="button"
                    onClick={() => handleToggleInputMode("manual")}
                    className={`px-3 py-1.5 text-[9.5px] font-mono tracking-wider uppercase font-extrabold rounded-lg transition-all cursor-pointer ${
                      captainInputMode === "manual"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow-md animate-pulse"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Manual
                  </button>
                  <button
                    type="button"
                    onClick={() => handleToggleInputMode("bulk")}
                    className={`px-3 py-1.5 text-[9.5px] font-mono tracking-wider uppercase font-extrabold rounded-lg transition-all cursor-pointer ${
                      captainInputMode === "bulk"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow-md animate-pulse"
                        : "text-slate-400 hover:text-slate-200"
                    }`}
                  >
                    Bulk Teks
                  </button>
                </div>
              </div>
              
              <p className="text-[10.5px] text-slate-400 mb-4 leading-relaxed font-sans">
                {captainInputMode === "manual" 
                  ? "Atur nama tim & kapten secara satu per satu di bawah, atau beralih ke mode Bulk Teks untuk input otomatis cepat."
                  : "Daftarkan nama tim & kapten sekaligus menggunakan baris teks terformat secara instan."}
              </p>

              {captainInputMode === "bulk" ? (
                /* Bulk register textarea widget */
                <div className="p-3 bg-slate-950/80 rounded-xl border border-slate-900">
                  <label className="text-[8.5px] uppercase font-mono tracking-wider text-slate-400 font-black block mb-1">
                    ⚡ Format Bulk Teks instan (Otomatis Tersinkron):
                  </label>
                  <textarea
                    rows={8}
                    value={bulkText}
                    onChange={(e) => setBulkText(e.target.value)}
                    placeholder={`CONTOH:
Format:
NAMA TEAM/NICK KAPTEN

Contoh Pengisian:

1.VESA ZYPHER/VESA.RYU
2.KINGS RYU/RYU GACOR
3.DARK PHOENIX/PHOENIX.Ryu`}
                    className="w-full bg-slate-900 border border-slate-800 focus:border-orange-500 text-white font-mono text-[10.5px] p-3 rounded-lg outline-none placeholder:text-slate-700 resize-none font-sans leading-relaxed"
                  />
                  <div className="flex gap-2 mt-2">
                    <button
                      type="button"
                      onClick={handleApplyBulkText}
                      className="flex-1 py-1.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-black text-[10.5px] uppercase tracking-wider rounded-lg transition cursor-pointer"
                    >
                      Terapkan Perubahan
                    </button>
                  </div>
                </div>
              ) : (
                /* Scrollable list of captains */
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[260px] overflow-y-auto pr-1">
                  {captains.map((c, idx) => (
                    <div 
                      key={c.id} 
                      className="p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 hover:border-slate-700/60 transition flex flex-col gap-2"
                    >
                      <div className="flex items-center justify-between text-[10px] font-mono text-slate-550 border-b border-slate-850 pb-1 mb-0.5">
                        <span className="font-bold text-slate-400"># REGISTRASI {idx + 1}</span>
                        <span className="text-amber-500/80 font-bold uppercase text-[9px]">FREE FIRE</span>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-2">
                        <div>
                          <label className="text-[8.5px] uppercase font-mono tracking-wider text-slate-500 block mb-1">Nama Tim</label>
                          <input
                            type="text"
                            value={c.teamName}
                            onChange={(e) => handleCaptainChange(c.id, "teamName", e.target.value)}
                            placeholder="Contoh: TIM ABC"
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-orange-500 text-white font-sans text-[11px] px-2 py-1.5 rounded outline-none placeholder:text-slate-850"
                          />
                        </div>
                        <div>
                          <label className="text-[8.5px] uppercase font-mono tracking-wider text-slate-400 block mb-1">Nick Kapten</label>
                          <input
                            type="text"
                            value={c.captainNick}
                            onChange={(e) => handleCaptainChange(c.id, "captainNick", e.target.value)}
                            placeholder="Contoh: KAPTEN ABC"
                            className="w-full bg-slate-950/80 border border-slate-800 focus:border-orange-500 text-white font-sans text-[11px] px-2 py-1.5 rounded outline-none placeholder:text-slate-850"
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* KE 3 BARU FOTO FOTO */}
            <div className="bg-[#111116] border border-white/5 rounded-3xl p-6 shadow-2xl relative">
              <div className="absolute top-0 right-0 w-32 h-32 bg-orange-600/5 rounded-full blur-3xl pointer-events-none" />
              
              <div className="flex justify-between items-start mb-2">
                <div>
                  <h2 className="text-sm font-semibold text-orange-400 uppercase tracking-widest">
                    SCOREBOARD SCREENSHOTS
                  </h2>
                  <p className="text-xs text-slate-400 mt-1 max-w-sm leading-relaxed">
                    Unggah 2 foto per match karena slot klasemen scoreboard terbagi (FOTO 1: Posisi 1-6 & FOTO 2: Posisi 7-12).
                  </p>
                </div>
              </div>

              {/* Progress Indicator for Mandatory Upload (3 Matches) */}
              <div className="mb-5 bg-slate-950/80 p-4 rounded-2xl border border-slate-900">
                <div className="flex justify-between text-xs text-slate-300 font-mono font-medium mb-1.5">
                  <span className="flex items-center gap-1.5">
                    <CheckCircle2 className={`w-3.5 h-3.5 ${wajibProgress === 100 ? "text-emerald-400" : "text-amber-500"}`} />
                    Progress Upload Match Wajib (M1 - M3)
                  </span>
                  <span>{wajibProgress}% ({Math.round(wajibProgress / 33.33)} / 3 Form)</span>
                </div>
                
                {/* Visual Progress Bar */}
                <div className="w-full bg-slate-850 h-2.5 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-gradient-to-r from-orange-500 to-amber-500 transition-all duration-500"
                    style={{ width: `${wajibProgress}%` }}
                  />
                </div>

                <div className="flex justify-between items-center text-[10px] text-slate-500 mt-2 font-mono">
                  <span>M1 - M3 (Wajib Terisi)</span>
                  <span>M4 - M6 (Opsional)</span>
                </div>
              </div>

              {/* Dynamic Scrollable List of 1-6 Matches Slots */}
              <div className="space-y-5 max-h-[50vh] overflow-y-auto pr-2 custom-scrollbar">
                {[1, 2, 3, 4, 5, 6].map((mNo) => {
                  const isOptional = mNo > 3;
                  const matchState = matches[mNo];

                  return (
                    <div key={mNo} className={`p-4 rounded-2xl border ${
                      isOptional 
                        ? "bg-[#14141a]/60 border-slate-800/40" 
                        : "bg-[#14141a]/90 border-slate-800 shadow-sm"
                    }`}>
                      <div className="flex justify-between items-center mb-3">
                        <span className="text-xs font-bold uppercase tracking-wider text-slate-200 flex items-center gap-2">
                          <span className={`w-5 h-5 rounded-lg flex items-center justify-center text-[10px] font-mono font-bold ${
                            isOptional ? "bg-slate-800 text-slate-400" : "bg-orange-500 text-slate-950"
                          }`}>
                            {mNo}
                          </span>
                          Match {mNo} Scoreboard
                          {isOptional && (
                            <span className="bg-slate-900 border border-slate-800 text-slate-500 font-normal px-2 py-0.5 rounded text-[9px] font-mono uppercase">
                              Opsional
                            </span>
                          )}
                        </span>
                        
                        {/* Clear column button if either slot is loaded */}
                        {(matchState.photoA.image || matchState.photoB.image) && (
                          <div className="flex gap-2">
                            <button
                              onClick={() => {
                                clearSlotImage(mNo, "A");
                                clearSlotImage(mNo, "B");
                              }}
                              className="text-[10px] text-red-400 hover:text-red-300 transition"
                            >
                              Bersihkan Match
                            </button>
                          </div>
                        )}
                      </div>

                      {/* 2 columns file input slot */}
                      <div className="grid grid-cols-2 gap-3.5">
                        {/* PHOTO SLOT A (FOTO 1) */}
                        <div className="flex flex-col">
                          <div className="text-[10px] text-slate-450 font-semibold mb-1 font-mono uppercase tracking-wider text-center">
                            FOTO 1
                          </div>
                                                   <div className={`h-24 rounded-xl border-2 border-dashed flex flex-col justify-center items-center p-2.5 transition relative overflow-hidden ${
                            matchState.photoA.image 
                              ? "border-emerald-500/30 bg-emerald-500/5" 
                              : "border-slate-800 hover:border-slate-700 bg-black/40"
                          }`}>
                            {matchState.photoA.image && (
                              <img 
                                src={matchState.photoA.image} 
                                alt="FOTO 1 Preview" 
                                className="absolute inset-0 w-full h-full object-cover opacity-25 hover:opacity-90 transition-opacity duration-300 pointer-events-none z-0"
                              />
                            )}
                            {matchState.photoA.image ? (
                              <div className="flex flex-col items-center justify-between h-full w-full relative z-10">
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider truncate max-w-full block leading-none text-slate-300 z-10 p-1 bg-black/80 rounded">
                                  {matchState.photoA.fileName || "Screenshot_A.png"}
                                </span>
                                
                                {/* Status overlay tags */}
                                <div className="flex flex-col gap-1 items-center justify-center mt-1 z-10">
                                  {matchState.photoA.status === "loading" && (
                                    <span className="text-[8px] text-amber-400 font-mono uppercase font-bold animate-pulse flex items-center gap-1 bg-slate-950/90 px-1 py-0.5 rounded">
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sedang OCR...
                                    </span>
                                  )}
                                  {matchState.photoA.status === "success" && (
                                    <span className="text-[8.5px] text-emerald-400 font-mono font-black uppercase flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.5 rounded">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Terbaca
                                    </span>
                                  )}
                                  {matchState.photoA.status === "error" && (
                                    <div className="flex flex-col items-center justify-center gap-1 bg-slate-950/90 p-1 rounded border border-red-500/30">
                                      <span className="text-[8.5px] text-red-500 font-mono font-bold uppercase">
                                        ⚠️ Gagal
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setOcrErrorHelp({ matchNo: mNo, column: "A", errorMsg: matchState.photoA.errorMsg })}
                                        className="text-[7.5px] text-amber-400 hover:underline font-extrabold cursor-pointer"
                                      >
                                        Cara Atasi?
                                      </button>
                                    </div>
                                  )}
                                  {matchState.photoA.status === "idle" && (
                                    <button
                                      onClick={() => runSingleScanOcr(mNo, "A")}
                                      className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-mono uppercase text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer leading-none hover:scale-105 transition"
                                    >
                                      Pindai OCR
                                    </button>
                                  )}
                                </div>
 
                                <button
                                  onClick={() => clearSlotImage(mNo, "A")}
                                  className="text-[9px] text-red-400 hover:underline hover:text-red-300 font-semibold z-10 px-1 bg-black/80 rounded"
                                >
                                  Hapus Foto
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer text-center w-full h-full flex flex-col justify-center items-center">
                                <Upload className="w-4 h-4 text-slate-500 mb-1" />
                                <span className="text-[10px] text-slate-400 block">Pilih / Seret</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageRead(mNo, "A", f);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>
 
                        {/* PHOTO SLOT B (FOTO 2) */}
                        <div className="flex flex-col">
                          <div className="text-[10px] text-slate-450 font-semibold mb-1 font-mono uppercase tracking-wider text-center">
                            FOTO 2
                          </div>
                          
                          <div className={`h-24 rounded-xl border-2 border-dashed flex flex-col justify-center items-center p-2.5 transition relative overflow-hidden ${
                            matchState.photoB.image 
                              ? "border-emerald-500/30 bg-emerald-500/5" 
                              : "border-slate-800 hover:border-slate-700 bg-black/40"
                          }`}>
                            {matchState.photoB.image && (
                              <img 
                                src={matchState.photoB.image} 
                                alt="FOTO 2 Preview" 
                                className="absolute inset-0 w-full h-full object-cover opacity-25 hover:opacity-90 transition-opacity duration-300 pointer-events-none z-0"
                              />
                            )}
                            {matchState.photoB.image ? (
                              <div className="flex flex-col items-center justify-between h-full w-full relative z-10">
                                <span className="text-[9px] font-mono uppercase font-bold tracking-wider truncate max-w-full block leading-none text-slate-300 z-10 p-1 bg-black/80 rounded">
                                  {matchState.photoB.fileName || "Screenshot_B.png"}
                                </span>
                                
                                {/* Status overlay tags */}
                                <div className="flex flex-col gap-1 items-center justify-center mt-1 z-10">
                                  {matchState.photoB.status === "loading" && (
                                    <span className="text-[8px] text-amber-400 font-mono uppercase font-bold animate-pulse flex items-center gap-1 bg-slate-950/90 px-1 py-0.5 rounded">
                                      <RefreshCw className="w-2.5 h-2.5 animate-spin" /> Sedang OCR...
                                    </span>
                                  )}
                                  {matchState.photoB.status === "success" && (
                                    <span className="text-[8.5px] text-emerald-400 font-mono font-black uppercase flex items-center gap-0.5 bg-slate-950/90 px-1 py-0.5 rounded">
                                      <CheckCircle2 className="w-3 h-3 text-emerald-400" /> Terbaca
                                    </span>
                                  )}
                                  {matchState.photoB.status === "error" && (
                                    <div className="flex flex-col items-center justify-center gap-1 bg-slate-950/90 p-1 rounded border border-red-500/30">
                                      <span className="text-[8.5px] text-red-500 font-mono font-bold uppercase">
                                        ⚠️ Gagal
                                      </span>
                                      <button
                                        type="button"
                                        onClick={() => setOcrErrorHelp({ matchNo: mNo, column: "B", errorMsg: matchState.photoB.errorMsg })}
                                        className="text-[7.5px] text-amber-400 hover:underline font-extrabold cursor-pointer"
                                      >
                                        Cara Atasi?
                                      </button>
                                    </div>
                                  )}
                                  {matchState.photoB.status === "idle" && (
                                    <button
                                      onClick={() => runSingleScanOcr(mNo, "B")}
                                      className="bg-orange-500 hover:bg-orange-400 text-slate-950 font-mono uppercase text-[9px] font-bold px-2 py-0.5 rounded cursor-pointer leading-none hover:scale-105 transition"
                                    >
                                      Pindai OCR
                                    </button>
                                  )}
                                </div>
 
                                <button
                                  onClick={() => clearSlotImage(mNo, "B")}
                                  className="text-[9px] text-red-400 hover:underline hover:text-red-300 font-semibold z-10 px-1 bg-black/80 rounded"
                                >
                                  Hapus Foto
                                </button>
                              </div>
                            ) : (
                              <label className="cursor-pointer text-center w-full h-full flex flex-col justify-center items-center">
                                <Upload className="w-4 h-4 text-slate-500 mb-1" />
                                <span className="text-[10px] text-slate-400 block">Pilih / Seret</span>
                                <input
                                  type="file"
                                  accept="image/*"
                                  className="hidden"
                                  onChange={(e) => {
                                    const f = e.target.files?.[0];
                                    if (f) handleImageRead(mNo, "B", f);
                                  }}
                                />
                              </label>
                            )}
                          </div>
                        </div>

                      </div>
                    </div>
                  );
                })}
              </div>

              {/* ACTION EXECUTOR BUTTON */}
              <button
                onClick={handleCalculateAll}
                disabled={isProcessing}
                className={`w-full py-4 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 disabled:from-slate-800 disabled:to-slate-800 text-slate-950 font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg hover:shadow-orange-600/10 active:scale-[0.98] transition-all flex items-center justify-center gap-2 ${
                  isProcessing ? "cursor-not-allowed opacity-80" : "cursor-pointer"
                }`}
              >
                {isProcessing ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Mengekstrak & Merapikan Poin Komprehensif...</span>
                  </>
                ) : (
                  <>
                    <Play className="w-4 h-4 fill-current" />
                    <span>Kalkulasi OCR & Rekap Klasemen</span>
                  </>
                )}
              </button>

              <div className="mt-3 text-center">
                <span className="text-[9.5px] text-slate-500 font-mono tracking-wide uppercase italic">
                  *Proses ini menggunakan sistem cerdas pemindaian gambar otomatis
                </span>
              </div>
            </div>

            {/* Ke-4: System Point Standing */}
            <div className="bg-[#14141a]/95 p-5 rounded-2xl border border-slate-800 shadow-sm">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-3">
                <div className="flex items-center gap-2">
                  <Settings className="w-4 h-4 text-orange-500" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-100 font-sans">
                    SYSTEM STANDING POINT
                  </h3>
                </div>

                {/* Tab Switch Buttons */}
                <div className="flex bg-slate-950 p-1 rounded-xl border border-slate-900 select-none self-start sm:self-auto shrink-0 shadow-inner">
                  <button
                    type="button"
                    onClick={() => {
                      setPointsMode("bawaan");
                      localStorage.setItem("ff_ft_points_mode", "bawaan");
                      showToast("Sistem poin dialihkan ke Mode Bawaan (Aturan Resmi)!", "success");
                    }}
                    className={`px-3 py-1.5 text-[9.5px] font-mono tracking-wider uppercase font-extrabold rounded-lg transition-all cursor-pointer ${
                      pointsMode === "bawaan"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-slate-200 font-bold"
                    }`}
                  >
                    Bawaan
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setPointsMode("settings");
                      localStorage.setItem("ff_ft_points_mode", "settings");
                      showToast("Sistem poin dialihkan ke Mode Settings (Custom)!", "success");
                    }}
                    className={`px-3 py-1.5 text-[9.5px] font-mono tracking-wider uppercase font-extrabold rounded-lg transition-all cursor-pointer ${
                      pointsMode === "settings"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow-md"
                        : "text-slate-400 hover:text-slate-200 font-bold"
                    }`}
                  >
                    Settings
                  </button>
                </div>
              </div>

              <p className="text-[10.5px] text-slate-400 mb-4 leading-relaxed font-sans">
                {pointsMode === "bawaan"
                  ? "Sistem Poin Aktif: MODE BAWAAN (Regulasi Resmi Free Fire dengan Rank #1 mendapat 12 PP & Eliminasi bernilai 1 poin)."
                  : "Sistem Poin Aktif: MODE SETTINGS (Ubah dan sesuaikan sendiri poin posisi placement & kill sesuka hati Anda di bawah)."
                }
              </p>

              <div className={`grid grid-cols-3 sm:grid-cols-4 gap-2 mb-4 transition-all duration-300 ${pointsMode === "bawaan" ? "opacity-60" : "opacity-100"}`}>
                {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rankNo) => {
                  const val = pointsMode === "bawaan" ? (DEFAULT_CONFIG.placementPoints[rankNo] ?? 0) : (editPlacements[rankNo] ?? 0);
                  return (
                    <div key={rankNo} className="bg-slate-900/60 border border-slate-850 p-2 rounded-xl flex flex-col items-center justify-center gap-1">
                      <span className="text-[9px] font-mono font-bold text-amber-500/80">Rank #{rankNo}</span>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        disabled={pointsMode === "bawaan"}
                        value={val}
                        onChange={(e) => {
                          if (pointsMode === "bawaan") return;
                          const val = parseInt(e.target.value) || 0;
                          setEditPlacements(prev => {
                            const updated = { ...prev, [rankNo]: val };
                            const newConfig = {
                              placementPoints: updated,
                              killPoint: editKillVal
                            };
                            setConfig(newConfig);
                            localStorage.setItem(`ff_ft_config_${clientId}`, JSON.stringify(newConfig));
                            return updated;
                          });
                        }}
                        className={`w-12 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded p-1 text-center font-mono text-[11px] font-black text-white focus:outline-none placeholder:text-slate-700 ${pointsMode === "bawaan" ? "cursor-not-allowed opacity-90 text-slate-400 bg-slate-900" : ""}`}
                      />
                    </div>
                  );
                })}
              </div>

              <div className={`flex items-center justify-between gap-4 p-2.5 bg-slate-950/60 rounded-xl border border-slate-900 mb-4 transition-all duration-300 ${pointsMode === "bawaan" ? "opacity-60" : "opacity-100"}`}>
                <span className="text-[10px] text-slate-400 font-mono font-medium">Poin Per 1 Kill (Rasio):</span>
                <div className="flex items-center gap-1.5">
                  <input
                    type="number"
                    min="0"
                    max="50"
                    disabled={pointsMode === "bawaan"}
                    value={pointsMode === "bawaan" ? DEFAULT_CONFIG.killPoint : editKillVal}
                    onChange={(e) => {
                      if (pointsMode === "bawaan") return;
                      const val = Math.max(0, parseInt(e.target.value) || 0);
                      setEditKillVal(val);
                      const newConfig = {
                        placementPoints: editPlacements,
                        killPoint: val
                      };
                      setConfig(newConfig);
                      localStorage.setItem(`ff_ft_config_${clientId}`, JSON.stringify(newConfig));
                    }}
                    className={`w-12 bg-slate-900 border border-slate-850 focus:border-amber-500 rounded p-1 text-center font-mono text-[11px] font-black text-white focus:outline-none ${pointsMode === "bawaan" ? "cursor-not-allowed opacity-90 text-slate-400" : ""}`}
                  />
                  <span className="text-[9px] font-mono font-bold text-amber-500">Poin</span>
                </div>
              </div>

              {pointsMode === "settings" && (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const newConfig = {
                        placementPoints: editPlacements,
                        killPoint: editKillVal
                      };
                      setConfig(newConfig);
                      localStorage.setItem(`ff_ft_config_${clientId}`, JSON.stringify(newConfig));
                      showToast("Sistem poin kustom berhasil disimpan ke dalam sesi peranti!", "success");
                    }}
                    className="py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-black text-[10px] uppercase tracking-wider rounded-lg transition"
                  >
                    Simpan Sesi Poin
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      const defaultPoints = {
                        1: 12, 2: 9, 3: 8, 4: 7, 5: 6, 6: 5, 7: 4, 8: 3, 9: 2, 10: 1, 11: 0, 12: 0
                      };
                      setEditPlacements(defaultPoints);
                      setEditKillVal(1);
                      const resetConfig = {
                        placementPoints: defaultPoints,
                        killPoint: 1
                      };
                      setConfig(resetConfig);
                      localStorage.setItem(`ff_ft_config_${clientId}`, JSON.stringify(resetConfig));
                      showToast("Sistem poin diatur ke default semula!", "error");
                    }}
                    className="py-2.5 bg-slate-900 hover:bg-slate-850 text-slate-400 border border-slate-800 font-semibold text-[10px] uppercase tracking-wider rounded-lg transition"
                  >
                    Reset Default
                  </button>
                </div>
              )}
            </div>

            {/* ERROR TROUBLESHOOTING HELP DIALOG MODAL */}
            {ocrErrorHelp && (
              <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
                <div className="bg-[#14141a] border-2 border-orange-500/30 max-w-md w-full rounded-2xl p-6 shadow-2xl relative">
                  <div className="flex items-start gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-red-500/10 border border-red-500/30 flex items-center justify-center shrink-0">
                      <AlertTriangle className="w-5 h-5 text-red-500 animate-pulse" />
                    </div>
                    <div>
                      <h3 className="text-sm font-black uppercase text-slate-100 tracking-wider">
                        ASISTEN REKAP: KESALAHAN SCAN OCR
                      </h3>
                      <p className="text-[10px] text-slate-400 font-mono mt-0.5">
                        Match {ocrErrorHelp.matchNo} — Foto {ocrErrorHelp.column === "A" ? "1" : "2"}
                      </p>
                    </div>
                  </div>

                  <div className="p-3 bg-slate-950 rounded-xl border border-slate-900 text-[11px] mb-4 font-mono leading-relaxed text-slate-300">
                    <span className="text-slate-500 block text-[9px] uppercase tracking-wide mb-1 font-bold">Respon Error:</span>
                    {ocrErrorHelp.errorMsg || "Screenshot gagal dipecahkan oleh engine visual."}
                  </div>

                  <div className="space-y-3 mb-6">
                    <h4 className="text-[10.5px] font-bold text-amber-500 uppercase tracking-widest">
                      💡 CARA MUDAH MENGATASI INI:
                    </h4>
                    <ul className="list-decimal list-inside text-[11px] text-slate-400 space-y-2 leading-relaxed">
                      <li>Pastikan rasio gambar screenshot standar game Free Fire (16:9 lanskap).</li>
                      <li>Pastikan resolusi tajam, jernih, teks nama tim & poin dapat terbaca jelas tanpa kabur.</li>
                      <li>Crop/potong bagian yang tidak perlu jika ada frame hitam berlebih di tepian gambar.</li>
                      <li>Jika gambar tetap sulit terbaca karena kontras buruk, Anda bisa **mengisi/edit baris data secara manual** lewat tab **"Match Log & Editor"** di layar kanan untuk bypass otomatis.</li>
                    </ul>
                  </div>

                  <button
                    type="button"
                    onClick={() => setOcrErrorHelp(null)}
                    className="w-full py-2.5 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider rounded-xl transition cursor-pointer"
                  >
                    Saya Mengerti
                  </button>
                </div>
              </div>
            )}

          </section>

          {/* Right Column (Leaderboard Displays / Spreadsheet details) */}
          <section className="xl:col-span-7 flex flex-col gap-6">
            
            {/* Rule policies dynamic widget */}
            <RulesBanner config={activeConfig} />

            {/* Table tabs controllers */}
            <div className="flex border-b border-slate-800">
              <button
                onClick={() => setActiveTab("overall")}
                className={`px-6 py-3.5 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === "overall"
                    ? "border-orange-500 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                🏆 Klasemen Utama (Overall Classification)
              </button>
              <button
                onClick={() => setActiveTab("details")}
                className={`px-6 py-3.5 text-xs font-bold tracking-widest uppercase border-b-2 transition-all cursor-pointer ${
                  activeTab === "details"
                    ? "border-orange-500 text-white"
                    : "border-transparent text-slate-500 hover:text-slate-300"
                }`}
              >
                📝 Match Log & Spreadsheet Editor
              </button>
            </div>

            {/* Sub-Views Switcher inside Client Portal */}
            {activeTab === "overall" ? (
              
              <div className="flex flex-col gap-4">
                <div className="flex justify-between items-center bg-[#0d0d12] p-4 rounded-2xl border border-slate-800">
                  <div>
                    <h3 className="text-sm font-black uppercase text-slate-200">
                      LEADERBOARD KLASEMEN SEMENTARA
                    </h3>
                    <p className="text-[11px] font-mono text-slate-500 mt-0.5">
                      Urutan murni diakumulasikan berurutan berdasarkan Poin Tertinggi dilanjutkan Total Kills terbanyak.
                    </p>
                  </div>

                  {finalStandings.length > 0 && (
                    <button
                      onClick={handleExportPNG}
                      className="bg-amber-500/10 hover:bg-amber-500 text-amber-400 hover:text-slate-950 px-4 py-2 text-xs font-bold uppercase rounded-xl tracking-wider transition-all border border-amber-500/20 shadow-lg cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5 inline mr-1.5" /> Export Gambar
                    </button>
                  )}
                </div>

                {/* Classification Overall Table with canvas area */}
                <div 
                  ref={exportAreaRef}
                  className="bg-[#0f0f15] border border-white/5 rounded-3xl p-5 sm:p-7 shadow-2xl relative"
                >
                  {/* Decorative classification certificate banner header */}
                  <div className="mb-4 pb-4 border-b border-slate-800/80 flex items-center justify-between">
                    <div>
                      <h4 className="text-sm font-black text-transparent bg-clip-text bg-gradient-to-r from-orange-400 to-amber-500">
                        OFFICIAL FF STANDING POINT BY RYU
                      </h4>
                      <p className="text-[9px] text-slate-500 tracking-widest font-mono uppercase mt-0.5">
                        HASIL REKAPITULASI POIN KLASEMEN TURNAMEN FREE FIRE
                      </p>
                    </div>
                    
                    <div className="text-right font-mono text-[9px] text-slate-500">
                      <span>Tanggal Cetak</span>
                      <strong className="block text-amber-500 text-[10.5px]">
                        {new Date().toLocaleDateString("id-ID", { day: "numeric", month: "long", year: "numeric" })}
                      </strong>
                    </div>
                  </div>

                  {/* Standard Spreadsheet representation table */}
                  <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-slate-950/40">
                    <table className="w-full text-left border-collapse min-w-[700px]">
                      <thead>
                        <tr className="border-b border-indigo-950/20 bg-slate-900/60 text-[10px] font-mono font-bold uppercase tracking-wider text-slate-400 select-none">
                          <th rowSpan={2} className="py-3.5 px-3 text-center w-12 border-r border-slate-800/60">No</th>
                          <th rowSpan={2} className="py-3.5 px-4 min-w-[155px] border-r border-slate-800/60">Nama Tim Pemain</th>
                          {displayMatchNumbers.map((mNo) => (
                            <th key={mNo} colSpan={2} className="py-2 px-2 text-center border-r border-slate-800/60 bg-slate-900/40 text-orange-400 font-black text-[10.5px]">
                              MATCH {mNo}
                            </th>
                          ))}
                          <th rowSpan={2} className="py-3.5 px-2.5 text-center text-amber-400 font-bold border-r border-slate-800/60 bg-amber-500/5">BOOYAH</th>
                          <th rowSpan={2} className="py-3.5 px-3 text-center text-slate-300 font-bold border-r border-slate-800/60 bg-indigo-950/10">P.ST</th>
                          <th rowSpan={2} className="py-3.5 px-3 text-center text-slate-300 font-bold border-r border-slate-800/60 bg-rose-950/10">P.KILL</th>
                          <th rowSpan={2} className="py-3.5 px-4 text-center text-amber-500 font-black border-r border-slate-800/60">TOTAL</th>
                          <th rowSpan={2} className="py-3.5 px-4 text-center w-28">JUARA</th>
                        </tr>
                        <tr className="border-b border-slate-800 bg-slate-950/80 text-[8.5px] font-mono tracking-wider font-bold text-slate-500 uppercase">
                          {displayMatchNumbers.map((mNo) => (
                            <React.Fragment key={mNo}>
                              <th className="py-1 px-1.5 text-center border-r border-slate-800/60 text-indigo-400">P.ST</th>
                              <th className="py-1 px-1.5 text-center border-r border-slate-800/60 text-rose-450">P.KILL</th>
                            </React.Fragment>
                          ))}
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-850">
                        {finalStandings.length === 0 ? (
                          <tr>
                            <td colSpan={7 + displayMatchNumbers.length * 2} className="py-16 text-center text-slate-500 text-xs font-mono leading-relaxed">
                              Belum terdapat rekapitulasi data poin klasemen.<br />
                              <span className="text-[11px] text-slate-600 mt-1 block">Silakan unggah tangkapan layar scoreboard hasil pertandingan atau klik tombol <strong>"Muat Data Contoh"</strong> di kanan atas untuk memuat data demo cepat.</span>
                            </td>
                          </tr>
                        ) : (
                          finalStandings.map((team, idx) => {
                            let rankBadge = "-";
                            let badgeStyle = "text-slate-500 text-xs";

                            if (idx === 0) {
                              rankBadge = "JUARA 1 🏆";
                              badgeStyle = "bg-gradient-to-r from-amber-500 to-orange-500 text-slate-950 font-black px-2.5 py-1 rounded shadow-md text-[9.5px] uppercase tracking-wider block text-center animate-pulse";
                            } else if (idx === 1) {
                              rankBadge = "JUARA 2 🥈";
                              badgeStyle = "bg-slate-200 text-slate-900 font-bold px-2.5 py-1 rounded text-[9.5px] uppercase tracking-wider block text-center";
                            } else if (idx === 2) {
                              rankBadge = "JUARA 3 🥉";
                              badgeStyle = "border border-amber-500/20 bg-amber-500/10 text-amber-400 font-bold px-2.5 py-1 rounded text-[9.5px] uppercase tracking-wider block text-center";
                            } else {
                              rankBadge = "-";
                              badgeStyle = "text-slate-600 text-[10.5px] block text-center";
                            }

                            // Try to look up corresponding captain nickname
                            const capNick = findCaptainNick(team.teamName);

                            return (
                              <tr 
                                key={idx}
                                className={`transition-all hover:bg-slate-900/30 ${
                                  idx === 0 ? "bg-amber-500/5" : ""
                                }`}
                              >
                                <td className="py-3 px-3 text-center font-mono text-xs font-bold text-slate-400 border-r border-slate-900/60">
                                  {idx + 1}
                                </td>
                                <td className="py-3 px-4 font-bold text-slate-200 text-xs border-r border-slate-900/60">
                                  <div className="flex flex-col gap-0.5">
                                    <span className="font-extrabold">{team.teamName}</span>
                                    {capNick && (
                                      <span className="text-[9.5px] font-mono text-amber-400 font-semibold tracking-wide flex items-center gap-1">
                                        <span className="w-1.5 h-1.5 rounded-full bg-orange-500 shrink-0 animate-pulse" />
                                        Capt: {capNick}
                                      </span>
                                    )}
                                  </div>
                                </td>
                                
                                {/* Dynamic Match cells with sub columns */}
                                {displayMatchNumbers.map((mNo) => {
                                  const mVal = (team as any)[`match${mNo}`];
                                  const isMValExist = mVal && mVal.rank > 0;
                                  return (
                                    <React.Fragment key={mNo}>
                                      {/* P.ST cell */}
                                      <td className="py-3 px-1.5 text-center font-mono text-[11px] border-r border-slate-900/40 text-indigo-300">
                                        {isMValExist ? (
                                          <span className="font-semibold">{mVal.pp}</span>
                                        ) : (
                                          <span className="text-slate-800">-</span>
                                        )}
                                      </td>
                                      {/* P.KILL cell */}
                                      <td className="py-3 px-1.5 text-center font-mono text-[11px] border-r border-slate-800/60 text-rose-450">
                                        {isMValExist ? (
                                          <span>{mVal.kills}</span>
                                        ) : (
                                          <span className="text-slate-800">-</span>
                                        )}
                                      </td>
                                    </React.Fragment>
                                  );
                                })}

                                {/* BOOYAH cell */}
                                <td className="py-3 px-2.5 text-center text-amber-400 bg-amber-500/5 font-mono text-xs font-black border-r border-slate-900/60">
                                  {team.booyahCount > 0 ? `🏆 ${team.booyahCount}` : <span className="text-slate-700">0</span>}
                                </td>

                                {/* Total PP (P.ST) */}
                                <td className="py-3 px-3 text-center text-slate-300 font-mono text-xs font-bold border-r border-slate-900/60 bg-indigo-950/10">
                                  {team.totalPP}
                                </td>

                                {/* Total KILLS (P.KILL) */}
                                <td className="py-3 px-3 text-center text-slate-300 font-mono text-xs font-semibold border-r border-slate-900/60 bg-rose-950/10">
                                  {team.totalKills}
                                </td>

                                {/* Grand Total */}
                                <td className="py-3 px-4 text-center font-black text-amber-400 bg-orange-500/5 text-sm border-r border-slate-900/60">
                                  {team.totalPoints}
                                </td>

                                <td className="py-3 px-4 text-center text-[10px]">
                                  {rankBadge !== "-" ? (
                                    <span className={badgeStyle}>{rankBadge}</span>
                                  ) : (
                                    <span className="text-slate-600">-</span>
                                  )}
                                </td>
                              </tr>
                            );
                          })
                        )}
                      </tbody>
                    </table>
                  </div>

                  {finalStandings.length > 0 && (
                    <div className="mt-4 pt-4 border-t border-slate-800/80 flex flex-col sm:flex-row justify-between text-[9px] text-slate-500 font-mono">
                      <span>*Jumlah tim terakumulasi: {finalStandings.length} tim.</span>
                      <span className="italic">Fast Tournament klasemen Free Fire automatic process v2.1</span>
                    </div>
                  )}
                </div>

              </div>

            ) : (
              // SPREADSHEET EDITOR SECTION MODULE
              <MatchDataTabs
                matchesData={{
                  1: matches[1].combinedData,
                  2: matches[2].combinedData,
                  3: matches[3].combinedData,
                  4: matches[4].combinedData,
                  5: matches[5].combinedData,
                  6: matches[6].combinedData,
                }}
                onUpdateTeam={handleUpdateTeam}
                onAddTeam={handleAddTeam}
                onDeleteTeam={handleDeleteTeam}
                onSortMatch={handleSortMatch}
                config={activeConfig}
              />
            )}

          </section>

        </main>
      ) : (
        // ====================================================================
        // WEB 2: ADMINISTRATOR DASHBOARD PANEL
        // ====================================================================
        <div className={`flex-1 flex flex-col md:flex-row min-h-[85vh] font-sans ${
          !adminIsDark ? "bg-slate-50 text-slate-800" : "bg-[#0b0b0e] text-slate-100"
        }`}>
          
          {/* LOGIN WINDOW PANEL IF NOT AUTHORIZED */}
          {!isAdminLoggedIn ? (
            <div className="flex-1 flex justify-center items-center p-6 relative">
              <div className="absolute inset-0 bg-[#07070a]/80 backdrop-blur-2xl absolute-bg-overlay" />
              
              <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
                <div className="text-center mb-6">
                  <div className="w-12 h-12 bg-gradient-to-tr from-orange-600 to-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-3 font-bold text-white text-lg select-none">
                    A
                  </div>
                  <h3 className="text-xl font-black tracking-tight text-white uppercase">
                    E-sports Admin Portal
                  </h3>
                  <p className="text-xs text-slate-400 mt-1 uppercase tracking-wider">
                    Sistem Otentikasi Dashboard Fast Tournament
                  </p>
                </div>

                {adminAuthError && (
                  <div className="mb-4 bg-red-950/70 border border-red-500/30 p-3 rounded-xl text-red-200 text-xs flex items-center gap-1.5 font-mono">
                    <AlertTriangle className="w-4 h-4 text-red-400 flex-shrink-0" />
                    <span>{adminAuthError}</span>
                  </div>
                )}

                <form onSubmit={handleAdminLogin} className="space-y-4">
                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1 uppercase tracking-widest">
                      Username Admin
                    </label>
                    <input
                      type="text"
                      value={adminUsername}
                      onChange={(e) => setAdminUsername(e.target.value)}
                      placeholder="Contoh: admin"
                      className="w-full bg-slate-950/80 border border-slate-850 hover:border-orange-500/40 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <div>
                    <label className="text-[11px] font-mono font-bold text-slate-400 block mb-1 uppercase tracking-widest">
                      Passphrase Sandi
                    </label>
                    <input
                      type="password"
                      value={adminPassword}
                      onChange={(e) => setAdminPassword(e.target.value)}
                      placeholder="Masukkan password admin"
                      className="w-full bg-slate-950/80 border border-slate-850 hover:border-orange-500/40 rounded-xl px-4 py-3 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    className="w-full bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider py-3.5 rounded-xl transition duration-200 hover:shadow-orange-600/10 cursor-pointer"
                  >
                    Masuk Ke Dashboard Admin
                  </button>
                </form>

                <div className="mt-4 text-center">
                  <span className="text-[10px] text-slate-500 font-mono">
                    Hubungi Panitia pusat jika mengalami kendala login token.
                  </span>
                </div>
              </div>

            </div>
          ) : (
            // ENTIRE SIGNED-IN ADMINISTRATOR DASHBOARD
            <>
              {/* SIDEBAR NAVIGATION BAR */}
              <aside className={`w-full md:w-64 flex flex-col border-r ${
                !adminIsDark ? "bg-white border-slate-200" : "bg-slate-950 border-slate-850"
              } py-6`}>
                <div className="px-6 mb-6">
                  <div className="flex items-center gap-2">
                    <span className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-bounce" />
                    <span className="text-[10px] uppercase font-mono tracking-widest text-slate-500 font-black">
                      Super Admin Online
                    </span>
                  </div>
                  <div className="text-[10.5px] mt-1 font-mono text-orange-500 truncate">
                    ip-scope: {clientIp}
                  </div>
                </div>

                {/* Sidebar Tab Options */}
                <nav className="flex-1 px-3 space-y-1">
                  <button
                    onClick={() => { setAdminTab("dashboard"); setSelectedUserDetail(null); }}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "dashboard"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/10"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <BarChart3 className="w-4 h-4" />
                      Dashboard Analytics
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab("users")}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "users"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/10"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Users className="w-4 h-4" />
                      Daftar Submisi Peserta
                    </span>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono ${
                      adminTab === "users" ? "bg-slate-950 text-amber-500" : "bg-slate-900 text-[#d97706]"
                    }`}>
                      {allSubmissions.length}
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab("points")}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "points"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/10"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Settings className="w-4 h-4" />
                      Aturan Point Posisi
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab("announcements")}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "announcements"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/10"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Megaphone className="w-4 h-4" />
                      Pengumuman Portal
                    </span>
                  </button>

                  <button
                    onClick={() => setAdminTab("statistics")}
                    className={`w-full flex items-center justify-between px-3.5 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                      adminTab === "statistics"
                        ? "bg-gradient-to-r from-orange-600 to-amber-600 text-slate-950 shadow"
                        : "text-slate-400 hover:text-white hover:bg-slate-900/10"
                    }`}
                  >
                    <span className="flex items-center gap-2.5">
                      <Database className="w-4 h-4" />
                      Ekspor Statistik & Backup
                    </span>
                  </button>
                </nav>

                <div className="px-3 pt-6 border-t border-slate-800/60 space-y-3">
                  {/* Gelap terang / Dark light mode toggle */}
                  <div className="flex items-center justify-between px-3 text-xs text-slate-400 font-mono">
                    <span>MODE TAMPILAN</span>
                    <button
                      onClick={() => setAdminIsDark(!adminIsDark)}
                      className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-amber-500 border border-slate-800 cursor-pointer"
                      title="Ubah mode kontras admin"
                    >
                      {adminIsDark ? <Sun className="w-3.5 h-3.5" /> : <Moon className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  {/* Log out administrator */}
                  <button
                    onClick={handleAdminLogout}
                    className="w-full flex items-center gap-2 px-3.5 py-2.5 rounded-xl text-xs font-bold text-red-500 hover:bg-red-550/10 cursor-pointer text-left border border-red-550/10 hover:border-red-500/20"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Keluar Dashboard</span>
                  </button>
                </div>
              </aside>

              {/* MAIN CONTENT AREA */}
              <main className="flex-1 p-6 md:p-8 overflow-y-auto max-h-[85vh]">
                
                {/* 1. ADMIN TAB: DASHBOARD OVERVIEW */}
                {adminTab === "dashboard" && (
                  <div className="space-y-6">
                    <div className="flex justify-between items-center">
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">
                          ANALYTICS OVERVIEW
                        </h2>
                        <p className="text-xs text-slate-400 font-mono">
                          Metrik performa turnamen Free Fire dan data interaksi user global.
                        </p>
                      </div>
                      
                      <button
                        onClick={fetchSubmissionsList}
                        className="bg-slate-900 hover:bg-slate-850 p-2.5 px-4 rounded-xl text-xs font-mono font-bold text-amber-500 flex items-center gap-1 border border-slate-805 cursor-pointer"
                      >
                        <RefreshCw className="w-3.5 h-3.5" /> Sync Server
                      </button>
                    </div>

                    {/* Bento Score grids */}
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
                      <div className="p-5 rounded-2xl bg-gradient-to-tr from-orange-600/10 to-[#10b981]/5 border border-orange-500/20 relative shadow shadow-orange-500/5">
                        <div className="text-[10px] font-mono tracking-widest text-[#d97706] uppercase">
                          TOTAL USER TERKAIT
                        </div>
                        <div className="text-3xl font-black mt-2 text-white">
                          {statsSummary.totalUsers} <span className="text-xs font-light text-slate-400">Unique IP</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 leading-none">
                          *Berdasarkan log submissions server.
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-gradient-to-tr from-[#3b82f6]/10 to-[#10b981]/5 border border-slate-800 relative">
                        <div className="text-[10px] font-mono tracking-widest text-blue-400 uppercase">
                          RATA-RATA POINT TIM
                        </div>
                        <div className="text-3xl font-black mt-2 text-white">
                          {statsSummary.averagePoints} <span className="text-xs font-light text-slate-400">Total</span>
                        </div>
                        <div className="text-[10px] text-slate-500 font-mono mt-1 leading-none">
                          *Rata-rata poin keseluruhan tim.
                        </div>
                      </div>

                      <div className="p-5 rounded-2xl bg-gradient-to-tr from-amber-500/10 to-[#10b981]/5 border border-slate-800 relative">
                        <div className="text-[10px] font-mono tracking-widest text-amber-500 uppercase">
                          TIM PERFORMA PUNCAK
                        </div>
                        <div className="text-xl font-bold mt-2 text-white truncate">
                          {statsSummary.topTeams[0]?.name || "Belum ada rekap"}
                        </div>
                        <div className="text-[10px] text-slate-450 font-mono mt-1 leading-none">
                          Avg: {statsSummary.topTeams[0]?.avgPoints || 0} Poin per pengguna.
                        </div>
                      </div>
                    </div>

                    {/* Bento visual custom interactive SVG Bar Chart */}
                    <div className={`p-6 rounded-3xl border ${
                      !adminIsDark ? "bg-white border-slate-200" : "bg-[#111115] border-slate-850"
                    }`}>
                      <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4">
                        GRAFIK TOP PERFORMANCE TIM (TIM TERABAIK BY TOTAL POIN)
                      </h4>

                      {statsSummary.topTeams.length === 0 ? (
                        <div className="py-12 text-center text-slate-500 font-mono text-xs">
                          Belum ada statistik grafik terekam.
                        </div>
                      ) : (
                        <div className="space-y-4">
                          {statsSummary.topTeams.map((item, idx) => {
                            const maxVal = Math.max(...statsSummary.topTeams.map(t=>t.totalPoints)) || 100;
                            const percent = Math.round((item.totalPoints / maxVal) * 100);

                            return (
                              <div key={idx} className="flex items-center gap-3 font-mono text-xs">
                                <div className="w-32 truncate font-bold text-slate-350">{item.name}</div>
                                <div className="flex-1 bg-slate-900 rounded-full h-4 overflow-hidden relative">
                                  <div 
                                    className="bg-gradient-to-r from-orange-500 to-amber-500 h-full rounded-full transition-all duration-700"
                                    style={{ width: `${percent}%` }}
                                  />
                                  <span className="absolute right-2 top-0.5 text-[8.5px] font-black text-white">{percent}%</span>
                                </div>
                                <div className="w-16 text-right font-black text-amber-500">{item.totalPoints} Pts</div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* 2. ADMIN TAB: DAFTAR USER SECTION */}
                {adminTab === "users" && (
                  <div className="space-y-6">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3">
                      <div>
                        <h2 className="text-xl font-black uppercase tracking-tight">
                          DAFTAR SUBMISI USER IP
                        </h2>
                        <p className="text-xs text-slate-400 font-mono">
                          Segmentasi data turnamen yang dikirim oleh peserta berdasarkan alamat IP komputer mereka.
                        </p>
                      </div>

                      {/* Search Bar IP filter */}
                      <input
                        type="text"
                        value={adminSearchIp}
                        onChange={(e) => setAdminSearchIp(e.target.value)}
                        placeholder="Filter alamat IP..."
                        className="bg-slate-950 border border-slate-800 rounded-xl px-4 py-2 text-xs text-slate-100 focus:outline-none focus:border-amber-500 max-w-xs font-mono"
                      />
                    </div>

                    {/* Left & Right drilldown panel splits */}
                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
                      {/* Submisi list table (Span 5) */}
                      <div className="lg:col-span-5 bg-slate-950/60 p-4 rounded-3xl border border-slate-800">
                        <h3 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3.5 px-1.5">
                          Antrean Konsol IP
                        </h3>

                        <div className="overflow-x-auto">
                          <table className="w-full text-left">
                            <thead>
                              <tr className="border-b border-slate-800 bg-slate-900/40 text-[10.5px] font-mono tracking-wider font-bold text-slate-400 uppercase">
                                <th className="p-3">IP Address</th>
                                <th className="p-3">Update Terakhir</th>
                                <th className="p-3 text-center">Aksi</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-850">
                              {allSubmissions.filter(sub => sub.ip.includes(adminSearchIp)).length === 0 ? (
                                <tr>
                                  <td colSpan={3} className="py-8 text-center text-slate-500 font-mono text-xs">
                                    Belum ada sesi partisipan terekam.
                                  </td>
                                </tr>
                              ) : (
                                allSubmissions
                                  .filter(sub => sub.ip.includes(adminSearchIp))
                                  .map((sub) => (
                                    <tr 
                                      key={sub.clientId} 
                                      onClick={() => setSelectedUserDetail(sub)}
                                      className={`text-xs cursor-pointer hover:bg-slate-900/60 transition ${
                                        selectedUserDetail?.clientId === sub.clientId ? "bg-orange-500/10" : ""
                                      }`}
                                    >
                                      <td className="p-3 font-mono font-bold text-slate-200">
                                        {sub.ip}
                                      </td>
                                      <td className="p-3 font-mono text-[10px] text-slate-400">
                                        {new Date(sub.timestamp).toLocaleTimeString("id-ID", { hour: '2-digit', minute: '2-digit' })} ({new Date(sub.timestamp).toLocaleDateString()})
                                      </td>
                                      <td className="p-3 text-center" onClick={(e) => e.stopPropagation()}>
                                        <button
                                          onClick={() => handleDeleteUserSubmission(sub.clientId)}
                                          className="text-red-500 hover:text-red-400 p-1 rounded"
                                        >
                                          <Trash2 className="w-3.5 h-3.5" />
                                        </button>
                                      </td>
                                    </tr>
                                  ))
                              )}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Detail analysis (Span 7) */}
                      <div className="lg:col-span-7 bg-slate-950 p-6 rounded-3xl border border-slate-800">
                        {selectedUserDetail ? (
                          <div className="space-y-5">
                            <div className="flex justify-between items-center border-b border-slate-800 pb-3">
                              <div>
                                <h4 className="text-sm font-bold text-white font-mono">
                                  KONSOL PESERTA: {selectedUserDetail.ip}
                                </h4>
                                <span className="text-[10px] font-mono text-slate-500 uppercase block mt-0.5">
                                  Sesi UUID: {selectedUserDetail.clientId}
                                </span>
                              </div>
                              <button
                                onClick={() => setSelectedUserDetail(null)}
                                className="text-slate-400 hover:text-white p-1 rounded font-mono text-xs"
                              >
                                Tutup
                              </button>
                            </div>

                            {/* Recalculated result standings list for target user */}
                            <div>
                              <h5 className="text-[11px] font-mono font-bold text-amber-500 uppercase tracking-widest mb-2.5">
                                Hasil Kalkulasi Standings User
                              </h5>
                              
                              <div className="overflow-x-auto rounded-xl border border-slate-804 p-2 bg-slate-900/40">
                                <table className="w-full text-left">
                                  <thead>
                                    <tr className="border-b border-slate-800 text-[9.5px] uppercase font-mono tracking-wider font-bold text-slate-400">
                                      <th className="py-2 px-1 text-center w-10">No</th>
                                      <th className="py-2 px-2">Nama Tim</th>
                                      <th className="py-2 px-2 text-center">Kills</th>
                                      <th className="py-2 px-2 text-center text-amber-400">Total Poin</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-slate-850">
                                    {selectedUserDetail.calculatedStandings && selectedUserDetail.calculatedStandings.length > 0 ? (
                                      selectedUserDetail.calculatedStandings.map((team, idx) => (
                                        <tr key={idx} className="text-xs hover:bg-slate-900 font-mono">
                                          <td className="py-2 px-1 text-center text-slate-500">{idx + 1}</td>
                                          <td className="py-2 px-2 font-bold text-slate-300">{team.teamName}</td>
                                          <td className="py-2 px-2 text-center text-slate-400">{team.totalKills}</td>
                                          <td className="py-2 px-2 text-center font-black text-amber-400">{team.totalPoints} pts</td>
                                        </tr>
                                      ))
                                    ) : (
                                      <tr>
                                        <td colSpan={4} className="py-4 text-center text-slate-500 text-[10px]">
                                          User belum men-scan screenshot atau lembar data kosong.
                                        </td>
                                      </tr>
                                    )}
                                  </tbody>
                                </table>
                              </div>
                            </div>

                            {/* List matches state */}
                            <div>
                              <h5 className="text-[11px] font-mono font-bold text-slate-400 uppercase tracking-widest mb-2">
                                Lembar Foto Terlampir / Status Upload
                              </h5>
                              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                                {[1, 2, 3, 4, 5, 6].map((mNo) => {
                                  const subMatches = selectedUserDetail.matches || {};
                                  const matchItem = subMatches[mNo];
                                  const photoAok = matchItem?.photoA?.image ? "Yes (Terbaca)" : "No Image";
                                  const photoBok = matchItem?.photoB?.image ? "Yes (Terbaca)" : "No Image";

                                  return (
                                    <div key={mNo} className="bg-slate-900 p-2.5 rounded-xl border border-slate-800 text-[10.5px]">
                                      <strong className="block text-slate-200">Match {mNo}</strong>
                                      <div className="text-slate-500 font-mono mt-0.5">
                                        Slot A: <span className={photoAok.includes("Yes") ? "text-emerald-400" : "text-slate-650"}>{photoAok}</span>
                                      </div>
                                      <div className="text-slate-500 font-mono">
                                        Slot B: <span className={photoBok.includes("Yes") ? "text-emerald-400" : "text-slate-650"}>{photoBok}</span>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="py-16 text-center text-slate-500 font-mono text-xs">
                            <Eye className="w-8 h-8 text-slate-600 mx-auto mb-2.5" />
                            Silakan ketuk salah satu Alamat IP di sebelah kiri untuk menelaah detail match terunggah & hasil perhitungan.
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                )}

                {/* 3. ADMIN TAB: POINT CONFIGURATION PANEL */}
                {adminTab === "points" && (
                  <div className="space-y-6 max-w-4xl">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">
                        PENGATURAN STANDING POINT SYSTEM
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        Sesuaikan poin posisi (Placement Points) dari Rank 1 s/d 12 dan rasio pengali poin per satu kill.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-6">
                      
                      {/* PLACEMENT POINTS LIST FORM GRIDS */}
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-4">
                          Placement Point Setiap Rank (Posisi 1 - 12)
                        </h4>
                        
                        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                          {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12].map((rankNo) => (
                            <div key={rankNo} className="bg-slate-900 border border-slate-800 p-3 rounded-2xl flex items-center justify-between gap-2.5">
                              <label className="text-xs font-mono font-bold text-amber-500">
                                Rank #{rankNo}
                              </label>
                              <input
                                type="number"
                                min="0"
                                max="100"
                                value={editPlacements[rankNo] ?? 1}
                                onChange={(e) => {
                                  const val = parseInt(e.target.value) || 0;
                                  setEditPlacements(prev => ({ ...prev, [rankNo]: val }));
                                }}
                                className="w-14 bg-slate-950 border border-slate-800 focus:border-amber-500 rounded px-2 py-1.5 text-center font-mono text-xs font-black text-white focus:outline-none"
                              />
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* POINT PER KILL RATIO FORM */}
                      <div className="pt-4 border-t border-slate-850">
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3">
                          Poin Untuk Setiap Satu Kill (Rasio Eliminasi)
                        </h4>
                        
                        <div className="flex items-center gap-4 max-w-sm">
                          <span className="text-xs text-slate-500 font-mono">
                            1 Kill =
                          </span>
                          <input
                            type="number"
                            min="0"
                            max="20"
                            value={editKillVal}
                            onChange={(e) => setEditKillVal(Math.max(0, parseInt(e.target.value) || 0))}
                            className="w-20 bg-slate-900 border border-slate-800 focus:border-amber-500 rounded-xl px-3 py-2 text-center font-mono text-xs font-black text-white focus:outline-none"
                          />
                          <span className="text-xs font-mono text-amber-500 font-semibold">
                            Poin Komparatif
                          </span>
                        </div>
                      </div>

                      {/* FORM ACTION CONTROL BUTTONS */}
                      <div className="pt-4 border-t border-slate-850 flex flex-wrap gap-3">
                        <button
                          onClick={handleSavePointsSettings}
                          className="bg-amber-500 hover:bg-amber-400 text-slate-950 font-black text-xs uppercase tracking-wider px-5 py-3 rounded-xl transition duration-200 cursor-pointer"
                        >
                          Simpan & Terapkan Pengaturan
                        </button>
                        <button
                          onClick={handleResetPointsToDefault}
                          className="bg-slate-900 hover:bg-slate-800 text-slate-400 border border-slate-800 font-bold text-xs uppercase px-5 py-3 rounded-xl transition cursor-pointer"
                        >
                          Atur Ke default
                        </button>
                      </div>

                    </div>
                  </div>
                )}

                {/* 5. ADMIN TAB: ANNOUNCEMENTS MANAGEMENT */}
                {adminTab === "announcements" && (
                  <div className="space-y-6 max-w-4xl text-slate-100">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">
                        📢 KELOLA INFORMASI & PENGUMUMAN PORTAL
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        Daftar informasi di bawah akan langsung muncul sebagai jendela popup modal "Informasi Terbaru" ketika peserta membuka atau me-refresh portal web.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                      
                      {/* Form Adding New Announcement */}
                      <div className="lg:col-span-5 bg-slate-950 p-5 rounded-3xl border border-slate-850 space-y-4">
                        <h3 className="text-xs font-bold font-mono text-amber-500 uppercase tracking-widest border-b border-slate-850 pb-2">
                          Tambah Pengumuman Baru
                        </h3>

                        <div className="space-y-3.5">
                          <div>
                            <label className="block text-[10.5px] uppercase font-mono tracking-wider text-slate-400 font-bold mb-1">
                              Judul Pengumuman
                            </label>
                            <input
                              type="text"
                              value={newAnnTitle}
                              onChange={(e) => setNewAnnTitle(e.target.value)}
                              placeholder="Contoh: Saluran WhatsApp Terbaru"
                              className="w-full bg-[#0d0d12] border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none"
                            />
                          </div>

                          <div>
                            <label className="block text-[10.5px] uppercase font-mono tracking-wider text-slate-400 font-bold mb-1">
                              Isi Catatan / Teks / Tautan URL
                            </label>
                            <textarea
                              value={newAnnContent}
                              onChange={(e) => setNewAnnContent(e.target.value)}
                              placeholder="Masukkan detail pesan atau link URL rujukan"
                              rows={4}
                              className="w-full bg-[#0d0d12] border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none resize-none font-mono"
                            />
                          </div>

                          <div>
                            <label className="block text-[10.5px] uppercase font-mono tracking-wider text-slate-400 font-bold mb-1">
                              Label Tanggal & Waktu (Opsional)
                            </label>
                            <div className="space-y-1">
                              <input
                                type="text"
                                value={newAnnTimestamp}
                                onChange={(e) => setNewAnnTimestamp(e.target.value)}
                                placeholder="Kosongkan untuk otomatis tgl waktu saat ini"
                                className="w-full bg-[#0d0d12] border border-slate-800 focus:border-amber-500 rounded-xl px-3.5 py-2.5 text-xs text-slate-200 focus:outline-none font-mono"
                              />
                              <p className="text-[9px] text-slate-500 leading-normal">
                                Format: <span className="text-slate-450 font-mono">Senin, 18 Mei 2026 - 00:43</span>.
                              </p>
                            </div>
                          </div>

                          <button
                            type="button"
                            onClick={handleAddAnnouncement}
                            className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-black text-xs uppercase tracking-wider py-3 rounded-xl transition cursor-pointer"
                          >
                            <Plus className="w-4 h-4" />
                            <span>Publikasikan Sekarang</span>
                          </button>
                        </div>
                      </div>

                      {/* Display / List Existing Announcements */}
                      <div className="lg:col-span-7 bg-slate-950 p-5 rounded-3xl border border-slate-850 flex flex-col justify-between">
                        <div>
                          <h3 className="text-xs font-bold font-mono text-amber-500 uppercase tracking-widest border-b border-slate-850 pb-2 mb-4">
                            Daftar Pengumuman Aktif ({announcements.length})
                          </h3>

                          {announcements.length === 0 ? (
                            <div className="p-8 text-center bg-[#0d0d12] rounded-2xl border border-dashed border-slate-800">
                              <Megaphone className="w-8 h-8 text-slate-600 mx-auto mb-2 animate-pulse" />
                              <p className="text-xs text-slate-500 font-mono font-bold">Belum Ada Informasi Terdaftar</p>
                              <p className="text-[10px] text-slate-600 mt-1">Gunakan form di sebelah kiri untuk menambah pengumuman baru.</p>
                            </div>
                          ) : (
                            <div className="space-y-3.5 max-h-[50vh] overflow-y-auto pr-1.5 custom-scrollbar">
                              {announcements.map((item, idx) => (
                                <div key={item.id || idx} className="p-4 bg-[#0d0d12] border border-slate-850 rounded-2xl flex items-start justify-between gap-3">
                                  <div className="space-y-1">
                                    <div className="flex items-center gap-2">
                                      <span className="text-[9px] bg-blue-500/10 text-blue-400 border border-blue-500/20 font-bold uppercase px-2 py-0.5 rounded-md font-mono">
                                        ℹ Informasi
                                      </span>
                                      <span className="text-[9px] text-slate-500 font-mono">
                                        {item.timestamp}
                                      </span>
                                    </div>
                                    <h4 className="text-xs font-black text-slate-200 tracking-tight">
                                      {item.title}
                                    </h4>
                                    <p className="text-[11px] text-slate-400 leading-relaxed font-mono break-all line-clamp-3">
                                      {item.content}
                                    </p>
                                  </div>

                                  <button
                                    type="button"
                                    onClick={() => handleDeleteAnnouncement(item.id)}
                                    className="p-2 text-red-500 hover:text-red-400 hover:bg-red-500/10 rounded-xl transition cursor-pointer shrink-0"
                                    title="Hapus pengumuman ini secara permanen"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>

                        {announcements.length > 0 && (
                          <div className="mt-4 pt-4 border-t border-slate-850 flex items-center justify-between text-[10px] text-slate-500 font-mono">
                            <span>* Disimpan di server secara otomatis</span>
                            <button
                              type="button"
                              onClick={() => {
                                if (window.confirm("Apakah Anda yakin ingin mengosongkan semua daftar pengumuman?")) {
                                  handleSaveAnnouncements([]);
                                }
                              }}
                              className="text-red-500 hover:underline cursor-pointer"
                            >
                              Kosongkan Semua
                            </button>
                          </div>
                        )}
                      </div>

                    </div>
                  </div>
                )}

                {/* 4. ADMIN TAB: STATISTICS AND DATA RESET */}
                {adminTab === "statistics" && (
                  <div className="space-y-6 max-w-4xl">
                    <div>
                      <h2 className="text-xl font-black uppercase tracking-tight">
                        BACKUP DATABASE & RESET SISTEM
                      </h2>
                      <p className="text-xs text-slate-400 font-mono">
                        Ekspor seluruh classification data partisipan ke file CSV atau kosongkan lembar server turnamen Anda.
                      </p>
                    </div>

                    <div className="bg-slate-950 p-6 rounded-3xl border border-slate-850 space-y-6">
                      
                      {/* EXPORTS FOR CONTROL SHEETS */}
                      <div>
                        <h4 className="text-xs font-mono font-bold text-slate-400 uppercase tracking-widest mb-3.5">
                          Backup & Cetak Lembar Turnamen
                        </h4>
                        
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                          <button
                            onClick={exportAllToJSON}
                            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 p-4 text-slate-300 rounded-2xl flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="text-left">
                              <strong className="block text-slate-200 text-xs font-bold font-mono">EXPORTS BACKUP (JSON)</strong>
                              <span className="text-[10px] text-slate-500 block">Semua sesi IP & pointRules lengkap.</span>
                            </div>
                            <FileText className="w-5 h-5 text-amber-500" />
                          </button>

                          <button
                            onClick={exportAllToCSV}
                            className="bg-slate-900 hover:bg-slate-850 border border-slate-800 hover:border-amber-500/40 p-4 text-slate-300 rounded-2xl flex items-center justify-between transition cursor-pointer"
                          >
                            <div className="text-left">
                              <strong className="block text-slate-200 text-xs font-bold font-mono">LEMBAR EXCEL CLASSIFICATION (CSV)</strong>
                              <span className="text-[10px] text-slate-500 block">Paling mudah diolah di Microsoft Excel / Sheets.</span>
                            </div>
                            <FileText className="w-5 h-5 text-amber-500" />
                          </button>
                        </div>
                      </div>

                      {/* SYSTEM RED RESET PORTAL */}
                      <div className="pt-6 border-t border-slate-850">
                        <h4 className="text-xs font-mono font-bold text-red-500 uppercase tracking-widest mb-2.5">
                          Zona Reset Kritis (Sirkuit Berbahaya)
                        </h4>
                        <p className="text-[11px] text-slate-500 leading-relaxed mb-4">
                          Menekan tombol pengosongan di bawah akan menghapus seluruh data user IP yang diunggah dan mengatur ulang pointRules kembali ke awal. Gunakan hanya jika turnamen FT sirkuit baru akan dimulai.
                        </p>

                        <button
                          onClick={handlePurgeAllSystemData}
                          className="bg-red-950/20 hover:bg-red-600/20 text-red-500 hover:text-red-400 border border-red-505/30 px-5 py-3 rounded-xl font-bold font-mono text-xs uppercase cursor-pointer transition"
                        >
                          Kosongkan Seluruh Data Turnamen Server
                        </button>
                      </div>

                    </div>
                  </div>
                )}

              </main>
            </>
          )}

        </div>
      )}

      {/* PORTAL ANNOUNCEMENTS OVERLAY MODAL */}
      {showUserAnnouncements && announcements.length > 0 && (
        <div className="fixed inset-0 z-[110] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#14141d] border border-slate-800 max-w-xl w-full rounded-2xl overflow-hidden shadow-2xl relative flex flex-col max-h-[85vh]">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-[#111118]">
              <div className="flex items-center gap-2 text-slate-100">
                <Megaphone className="w-4 h-4 text-amber-500 animate-bounce" />
                <span className="text-xs font-black uppercase tracking-wider">
                  📢 Informasi Terbaru
                </span>
              </div>
              <button 
                type="button"
                onClick={() => {
                  setShowUserAnnouncements(false);
                  localStorage.removeItem("announcements_read_completed"); // Ensure it will appear again on next open/refresh!
                }}
                className="text-slate-500 hover:text-slate-350 transition p-1 hover:bg-slate-850 rounded-lg cursor-pointer"
                title="Tutup Sementara (Akan muncul lagi pada kunjungan berikutnya)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body / Timeline list */}
            <div className="p-5 overflow-y-auto space-y-6 max-h-[55vh] custom-scrollbar bg-slate-950/40">
              <div className="relative pl-6 border-l-2 border-dashed border-slate-800 space-y-6">
                {announcements.map((item, index) => {
                  // Simple URL detector to render pretty clickable links
                  const isUrl = item.content.startsWith("http://") || item.content.startsWith("https://") || item.content.includes("whatsapp.com");

                  return (
                    <div key={item.id || index} className="relative group text-left">
                      {/* Timeline dot */}
                      <div className="absolute -left-[31px] top-1.5 w-4 h-4 rounded-full bg-[#14141d] border-2 border-blue-500 flex items-center justify-center">
                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse" />
                      </div>

                      <div>
                        {/* Blue Info Label */}
                        <div className="flex items-center gap-1 text-xs font-bold text-blue-500">
                          <Info className="w-3.5 h-3.5" />
                          <span>Informasi</span>
                        </div>

                        {/* Timestamp */}
                        <p className="text-[10px] text-slate-500 font-mono mt-0.5 mb-1.5">
                          {item.timestamp || "Baru saja"}
                        </p>

                        {/* Announcement Title */}
                        <h4 className="text-sm font-black text-slate-100 tracking-tight leading-snug">
                          {item.title}
                        </h4>

                        {/* Content */}
                        <div className="text-xs text-slate-400 mt-1 leading-relaxed break-all font-mono">
                          {isUrl ? (
                            <a 
                              href={item.content}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="text-blue-400 hover:underline inline-flex items-center gap-1 font-bold font-sans"
                            >
                              {item.content}
                              <span className="text-[10px]">↗</span>
                            </a>
                          ) : (
                            item.content
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t border-slate-800 bg-[#111118] flex justify-end">
              <button
                type="button"
                onClick={() => {
                  setShowUserAnnouncements(false);
                  if (announcements.length > 0) {
                    const latestId = announcements[0].id;
                    localStorage.setItem("announcements_last_read_id", latestId);
                  }
                  localStorage.setItem("announcements_read_completed", "true"); // Saves read acknowledgement so it does not appear again on refresh!
                }}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-slate-100 font-sans font-bold text-xs px-5 py-2.5 rounded-xl transition cursor-pointer hover:shadow-lg active:scale-95"
              >
                <ThumbsUp className="w-4 h-4 text-slate-100" />
                <span>Saya sudah membaca</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* FOOTER */}
      <footer className={`border-t select-none py-5 px-6 text-center text-[10.5px] font-mono tracking-wider ${
        role === "admin" && !adminIsDark ? "bg-slate-100 border-slate-200 text-slate-500" : "bg-[#060608] border-slate-900 text-slate-600"
      }`}>
        <div className="max-w-[1600px] mx-auto flex flex-col sm:flex-row justify-between items-center gap-3">
          <span>FF STANDING POINT BY RYU © 2026.</span>
          <span>Dukungan OCR: Sistem Cepat Deteksi Gambar OCR</span>
        </div>
      </footer>

    </div>
  );
}
