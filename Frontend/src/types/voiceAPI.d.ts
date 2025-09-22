
// src/types/voiceAPI.d.ts

// ✅ Define success + error response types
export type VoiceApiOkResponse = { ok: true; name: string; bytes: string };
export type VoiceApiErrorResponse = { error: string };
export type VoiceApiResponse = VoiceApiOkResponse | VoiceApiErrorResponse;

// ✅ Type guard for safe usage
export function isOkResponse(resp: VoiceApiResponse): resp is VoiceApiOkResponse {
  return "ok" in resp && resp.ok === true && "bytes" in resp;
}

// ✅ Main VoiceAPI interface
export interface VoiceAPI {
  startListening: () => void;
  stopListening: () => void;
  onCommand: (callback: (command: string) => void) => void;

  // Returns either file data or null
  getFile: (fileName: string) => Promise<VoiceApiResponse | null>;

  // Opens Downloads folder
  openDownloads: () => void;

  // Optional: list files in downloads
  listFiles?: () => Promise<{ ok: true; folder: string; files: string[] } | { error: string }>;

  // Optional: upload file
  uploadFile?: (
    fileName: string,
    fileType?: string
  ) => Promise<{ ok: true; response: any } | { error: string }>;
}

// ✅ Proper global augmentation
declare global {
  interface Window {
    voiceAPI?: VoiceAPI; // ✅ optional prevents conflicts
  }
}