import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI, Type } from "@google/genai";
import dotenv from "dotenv";
import fs from "fs";

dotenv.config();

const app = express();
const PORT = 3000;

// Path for file database persistence
const DB_PATH = path.join(process.cwd(), "db_store.json");

interface DBStore {
  pointConfig: {
    placementPoints: Record<number, number>;
    killPoint: number;
  };
  submissions: Record<string, any>;
  announcements: {
    id: string;
    title: string;
    content: string;
    timestamp: string;
  }[];
}

const DEFAULT_CONFIG = {
  placementPoints: {
    1: 12, 2: 9, 3: 7, 4: 5, 5: 4, 6: 3, 7: 2, 
    8: 1, 9: 1, 10: 1, 11: 1, 12: 1
  },
  killPoint: 1
};

const DEFAULT_ANNOUNCEMENTS = [
  {
    id: "1",
    title: "Saluran WhatsApp Resmi",
    content: "https://whatsapp.com/channel/0029VbCarjk3wtazq0Rt070I",
    timestamp: "Senin, 18 Mei 2026 - 00:43"
  },
  {
    id: "2",
    title: "Jumat berkah, semua layanan rekapitulasi poin didukung OCR otomatis",
    content: "Gunakan pemindai gambar pintar kami di dashboard utama.",
    timestamp: "Jumat, 15 Mei 2026 - 13:25"
  }
];

let db: DBStore = {
  pointConfig: JSON.parse(JSON.stringify(DEFAULT_CONFIG)),
  submissions: {},
  announcements: JSON.parse(JSON.stringify(DEFAULT_ANNOUNCEMENTS))
};

// Auto load DB from file
try {
  if (fs.existsSync(DB_PATH)) {
    const rawData = fs.readFileSync(DB_PATH, "utf-8");
    const parsed = JSON.parse(rawData);
    if (parsed.pointConfig) db.pointConfig = parsed.pointConfig;
    if (parsed.submissions) db.submissions = parsed.submissions;
    if (parsed.announcements && Array.isArray(parsed.announcements)) {
      db.announcements = parsed.announcements;
    } else {
      db.announcements = JSON.parse(JSON.stringify(DEFAULT_ANNOUNCEMENTS));
    }
    console.log("Loaded persistent storage from db_store.json successfully.");
  } else {
    // Write default configuration initially
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
    console.log("Initialized empty database at db_store.json.");
  }
} catch (error) {
  console.error("Error initializing JSON DB store. Falling back to memory adapter:", error);
}

// Save helper
function saveDatabase() {
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
  } catch (error) {
    console.error("Failed to write to persistent db_store.json:", error);
  }
}


// High limits for handling large base64 image streams
app.use(express.json({ limit: "50mb" }));
app.use(express.urlencoded({ limit: "50mb", extended: true }));

// Primary API Key setup with fallback
const geminiApiKey = process.env.GEMINI_API_KEY || "AIzaSyA3q4Vch4wP4JHvI67S7cE3uGL-hcTss2Q";

const ai = new GoogleGenAI({
  apiKey: geminiApiKey,
  httpOptions: {
    headers: {
      "User-Agent": "aistudio-build",
    },
  },
});

// JSON Schema definition for scoreboard data extraction
const scoreboardSchema = {
  type: Type.OBJECT,
  properties: {
    matchTeams: {
      type: Type.ARRAY,
      description: "List of all teams or primary players representing teams extracted from the Free Fire match scoreboard.",
      items: {
        type: Type.OBJECT,
        properties: {
          rank: {
            type: Type.INTEGER,
            description: "Placement rank of the team/player in this match (1 to 12)."
          },
          teamName: {
            type: Type.STRING,
            description: "Name of the team or player representing the team (the top listed name on each team block)."
          },
          kills: {
            type: Type.INTEGER,
            description: "Number of kills (eliminations) obtained by this team in this match."
          }
        },
        required: ["rank", "teamName", "kills"]
      }
    }
  },
  required: ["matchTeams"]
};

// API Endpoint to check server status
app.get("/api/health", (req, res) => {
  res.json({ status: "ok", mode: process.env.NODE_ENV || "development" });
});

// API Endpoint to process individual match scoreboard image
app.post("/api/process-match", async (req, res) => {
  try {
    const { image, mimeType, matchNo } = req.body;

    if (!image) {
      return res.status(400).json({ error: "Missing image base64 data" });
    }

    const cleanMimeType = mimeType || "image/png";
    const cleanBase64 = image.replace(/^data:image\/\w+;base64,/, "");

    const imageRef = {
      inlineData: {
        mimeType: cleanMimeType,
        data: cleanBase64,
      },
    };

    const targetPrompt = `
      Anda adalah panitia turnamen Free Fire profesional yang bertugas untuk melakukan OCR saring data dari gambar papan peringkat / scoreboard Free Fire hasil Match ke-${matchNo || 1}.
      Tolong analisa gambar scoreboard Free Fire ini dan kembangkan hasil data tim dalam bentuk JSON yang terstruktur.
      
      Aturan Ekstraksi Data:
      1. Cari daftar tim yang ada di scoreboard. Biasanya format scoreboard Free Fire menampilkan peringkat (Rank) di sebelah kiri, nama pemain/tim di tengah, dan jumlah kill/bermain di sebelah kanan.
      2. Setiap tim pada kelompook baris diwakili oleh nama pemain teratas di baris slot tim tersebut atau nama tim itu sendiri (paling penting agar penamaan tim konsisten diwakili oleh nama teratas squad tersebut).
      3. Ekstrak data untuk setiap tim:
         - rank: Peringkat tim ini (angka bulat antara 1 sampai 12).
         - teamName: Nama Tim atau nama pemain teratas tim tersebut (bersihkan emoji atau simbol aneh jika memungkinkan agar nama tim dapat dicocokkan dengan mudah di match lain).
         - kills: Jumlah kill tim tersebut (angka bulat).
      
      Perhatikan untuk mengambil data dari seluruh baris tim yang terlihat di screenshot secara teliti.
    `;

    const response = await ai.models.generateContent({
      model: "gemini-3.5-flash",
      contents: [
        imageRef,
        { text: targetPrompt }
      ],
      config: {
        responseMimeType: "application/json",
        responseSchema: scoreboardSchema,
        temperature: 0.1,
      }
    });

    const outputText = response.text;
    if (!outputText) {
      throw new Error("No response text received from Gemini");
    }

    const parsedData = JSON.parse(outputText);
    res.json({
      success: true,
      matchNo: matchNo || 1,
      data: parsedData.matchTeams || [],
    });
  } catch (error: any) {
    console.error("Error processing match image:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Gagal memproses gambar melalui Gemini AI.",
    });
  }
});

// API Endpoint to process multiple match images in parallel for ultra fast execution
app.post("/api/process-all", async (req, res) => {
  try {
    const { matches } = req.body; // array of { image, mimeType, matchNo }

    if (!matches || !Array.isArray(matches) || matches.length === 0) {
      return res.status(400).json({ error: "Missing match images" });
    }

    // Process all in parallel for instant execution!
    const results = await Promise.all(
      matches.map(async (m: any) => {
        if (!m.image) {
          return { success: false, matchNo: m.matchNo, error: "Empty image data" };
        }
        try {
          const cleanMimeType = m.mimeType || "image/png";
          const cleanBase64 = m.image.replace(/^data:image\/\w+;base64,/, "");

          const imageRef = {
            inlineData: {
              mimeType: cleanMimeType,
              data: cleanBase64,
            },
          };

          const targetPrompt = `
            Anda adalah panitia turnamen Free Fire profesional yang bertugas untuk melakukan OCR saring data dari gambar papan peringkat / scoreboard Free Fire hasil Match ke-${m.matchNo}.
            Tolong analisa gambar scoreboard Free Fire ini dan kembangkan hasil data tim dalam bentuk JSON yang terstruktur.
            
            Aturan Ekstraksi Data:
            1. Cari daftar tim yang ada di scoreboard. Biasanya format scoreboard Free Fire menampilkan peringkat (Rank) di sebelah kiri, nama pemain/tim di tengah, dan jumlah kill/bermain di sebelah kanan.
            2. Setiap tim pada kelompok baris diwakili oleh nama pemain teratas di baris slot tim tersebut atau nama tim itu sendiri.
            3. Ekstrak data untuk setiap tim:
               - rank: Peringkat tim ini (angka bulat antara 1 sampai 12).
               - teamName: Nama Tim atau nama pemain teratas tim tersebut (bersihkan nama dari karakter aneh jika perlu).
               - kills: Jumlah kill tim tersebut (angka bulat).
          `;

          const response = await ai.models.generateContent({
            model: "gemini-3.5-flash",
            contents: [
              imageRef,
              { text: targetPrompt }
            ],
            config: {
              responseMimeType: "application/json",
              responseSchema: scoreboardSchema,
              temperature: 0.1,
            }
          });

          const outputText = response.text;
          if (!outputText) {
            return { success: false, matchNo: m.matchNo, error: "Empty Gemini response" };
          }

          const parsed = JSON.parse(outputText);
          return {
            success: true,
            matchNo: m.matchNo,
            data: parsed.matchTeams || [],
          };
        } catch (innerErr: any) {
          return {
            success: false,
            matchNo: m.matchNo,
            error: innerErr.message || "Failed to parse",
          };
        }
      })
    );

    res.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error("Error processing all match images:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Gagal memproses kumpulan gambar.",
    });
  }
});

// =====================================
// POINT CONFIGURATION API ROUTING
// =====================================

app.get("/api/point-config", (req, res) => {
  res.json({ success: true, config: db.pointConfig });
});

app.post("/api/point-config", (req, res) => {
  const { placementPoints, killPoint } = req.body;
  if (placementPoints && typeof placementPoints === "object") {
    db.pointConfig.placementPoints = placementPoints;
  }
  if (typeof killPoint === "number") {
    db.pointConfig.killPoint = killPoint;
  }
  saveDatabase();
  res.json({ success: true, config: db.pointConfig });
});

app.post("/api/point-config/reset", (req, res) => {
  db.pointConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  saveDatabase();
  res.json({ success: true, config: db.pointConfig });
});

// =====================================
// USER SUBMISSIONS REST API ROUTING
// =====================================

app.get("/api/submissions", (req, res) => {
  res.json({ success: true, submissions: Object.values(db.submissions) });
});

app.get("/api/submission/:clientId", (req, res) => {
  const { clientId } = req.params;
  const sub = db.submissions[clientId] || null;
  res.json({ success: true, submission: sub });
});

app.post("/api/submission", (req, res) => {
  const { clientId, matches, calculatedStandings, ipOverride, captains } = req.body;
  if (!clientId) {
    return res.status(400).json({ error: "Missing unique clientId descriptor." });
  }

  // Identify network client IP address
  const requesterIp = req.headers["x-forwarded-for"] || req.socket.remoteAddress || "127.0.0.1";
  const rawIpString = Array.isArray(requesterIp) ? requesterIp[0] : requesterIp;
  const cleanIp = rawIpString.replace(/^.*:/, "") || "127.0.0.1";
  const displayIp = ipOverride || cleanIp;

  db.submissions[clientId] = {
    clientId,
    ip: displayIp,
    timestamp: new Date().toISOString(),
    matches: matches || {},
    calculatedStandings: calculatedStandings || [],
    captains: captains || []
  };

  saveDatabase();
  res.json({ success: true, message: "Standings saved successfully." });
});

app.delete("/api/submission/:clientId", (req, res) => {
  const { clientId } = req.params;
  if (db.submissions[clientId]) {
    delete db.submissions[clientId];
    saveDatabase();
    return res.json({ success: true, message: "Submission successfully deleted." });
  }
  res.status(404).json({ success: false, error: "Participant session not found." });
});

app.post("/api/submissions/reset", (req, res) => {
  db.submissions = {};
  db.pointConfig = JSON.parse(JSON.stringify(DEFAULT_CONFIG));
  db.announcements = JSON.parse(JSON.stringify(DEFAULT_ANNOUNCEMENTS));
  saveDatabase();
  res.json({ success: true, message: "All system sessions and point configurations have been reset to default values." });
});

// =====================================
// ANNOUNCEMENTS REST API ROUTING
// =====================================

app.get("/api/announcements", (req, res) => {
  res.json({ success: true, announcements: db.announcements || [] });
});

app.post("/api/announcements", (req, res) => {
  const { announcements } = req.body;
  if (Array.isArray(announcements)) {
    db.announcements = announcements;
    saveDatabase();
    res.json({ success: true, announcements: db.announcements });
  } else {
    res.status(400).json({ success: false, error: "Format data pengumuman tidak sah." });
  }
});

// Setup Vite & start server
async function startServer() {
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
