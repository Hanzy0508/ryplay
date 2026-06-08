export interface TeamResult {
  rank: number;
  teamName: string;
  kills: number;
}

export interface MatchPhotoSlot {
  image: string | null;     // base64 data string
  fileName: string | null;
  mimeType: string | null;
  status: "idle" | "loading" | "success" | "error";
  errorMsg?: string;
  data: TeamResult[];       // OCR parsed results from this specific screenshot
}

export interface MatchState {
  photoA: MatchPhotoSlot;
  photoB: MatchPhotoSlot;
  combinedData: TeamResult[]; // merged and sorted results
}

export interface PointConfig {
  placementPoints: Record<number, number>; // e.g., 1 -> 12, 2 -> 9, ... 12 -> 1
  killPoint: number;                        // e.g., 1 kill = 1 point
}

export interface UserSubmission {
  clientId: string;            // ip address or local fallback uuid
  ip: string;
  timestamp: string;
  matches: Record<number, MatchState>;
  calculatedStandings: StandingResult[];
}

export interface StandingResult {
  teamName: string;
  match1: { rank: number; kills: number; pp: number };
  match2: { rank: number; kills: number; pp: number };
  match3: { rank: number; kills: number; pp: number };
  match4: { rank: number; kills: number; pp: number };
  match5: { rank: number; kills: number; pp: number };
  match6: { rank: number; kills: number; pp: number };
  totalKills: number;
  totalPP: number;
  totalPoints: number;
  booyahCount: number;
}
