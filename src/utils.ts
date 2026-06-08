// Shared helpers for fast tournament scoring and administrator backups

/**
 * Normalizes team or player names to easily group matches together
 */
export function normalizeTeamName(name: string): string {
  if (!name) return "";
  return name.trim().toUpperCase().replace(/[^\w\s-]/g, "");
}

/**
 * Generates a unique user identifier if IP fetching is unavailable
 */
export function generateUUID(): string {
  try {
    return 'user_' + Math.random().toString(36).substring(2, 9) + '_' + Date.now().toString(36);
  } catch (e) {
    return "user_anon_" + Date.now();
  }
}

/**
 * Downloads a text payload under specified MIME and file name
 */
export function downloadFile(content: string, fileName: string, contentType: string) {
  const a = document.createElement("a");
  const file = new Blob([content], { type: contentType });
  a.href = URL.createObjectURL(file);
  a.download = fileName;
  a.click();
  URL.revokeObjectURL(a.href);
}

/**
 * Generates a mock dataset of submissions to bootstrap state beautifully
 */
export function getDemoSubmissions() {
  return [
    {
      clientId: "demo_user_1",
      ip: "182.253.111.45",
      timestamp: "2026-06-08T10:15:30.000Z",
      matches: {},
      calculatedStandings: [
        { teamName: "Evos Divine", totalKills: 31, totalPP: 28, totalPoints: 59 },
        { teamName: "RRQ Kazu", totalKills: 26, totalPP: 27, totalPoints: 53 },
        { teamName: "Thorrad", totalKills: 24, totalPP: 22, totalPoints: 46 }
      ]
    },
    {
      clientId: "demo_user_2",
      ip: "114.124.230.12",
      timestamp: "2026-06-08T14:40:00.000Z",
      matches: {},
      calculatedStandings: [
        { teamName: "Onic Olympus", totalKills: 18, totalPP: 24, totalPoints: 42 },
        { teamName: "Bigetron Delta", totalKills: 19, totalPP: 18, totalPoints: 37 },
        { teamName: "Besta Esports", totalKills: 12, totalPP: 12, totalPoints: 24 }
      ]
    }
  ];
}
