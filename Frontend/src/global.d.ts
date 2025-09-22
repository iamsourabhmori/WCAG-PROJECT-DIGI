// src/global.d.ts

declare global {
    interface Window {
      voiceAPI?: import("./types/voiceAPI").VoiceAPI;
    }
  }
  
  export {};
  