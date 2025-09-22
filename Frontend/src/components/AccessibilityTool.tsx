

// src>components>AccessibilityTool.tsx(Video uploaded successfully via vice commmand )

// import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
// import AudioTab from "./tabs/AudioTab";
// import VideoTab from "./tabs/VideoTab";
// import ImageTab from "./tabs/ImageTab";
// import DocumentTab from "./tabs/DocumentTab";
// import { fuzzy } from "fast-fuzzy"; // optional; fallback to levenshteinRatio when not available

// // Extend window interface for voiceAPI (if exists)
// declare global {
//   interface Window {
//     voiceAPI?: {
//       startListening: () => void;
//       stopListening: () => void;
//       onCommand: (callback: (command: string) => void) => void;
//     };
//   }
// }

// // Tab type
// type TabValue = "audio" | "video" | "image" | "document";

// interface TabComponentProps {
//   onTranscriptChange: Dispatch<SetStateAction<string>>;
//   isVoiceMode: boolean;
// }

// // ===== Helper functions (levenshtein, fuzzy matching, infer tab) =====
// function levenshteinRatio(a: string, b: string): number {
//   if (!a && !b) return 1;
//   if (!a || !b) return 0;
//   const la = a.length;
//   const lb = b.length;
//   const dp: number[][] = Array.from({ length: la + 1 }, () =>
//     new Array<number>(lb + 1).fill(0)
//   );
//   for (let i = 0; i <= la; i++) dp[i][0] = i;
//   for (let j = 0; j <= lb; j++) dp[0][j] = j;
//   for (let i = 1; i <= la; i++) {
//     for (let j = 1; j <= lb; j++) {
//       const cost = a[i - 1] === b[j - 1] ? 0 : 1;
//       dp[i][j] = Math.min(
//         dp[i - 1][j] + 1,
//         dp[i][j - 1] + 1,
//         dp[i - 1][j - 1] + cost
//       );
//     }
//   }
//   const dist = dp[la][lb];
//   const maxLen = Math.max(la, lb);
//   return 1 - dist / maxLen;
// }

// function fuzzyMatchFilename(command: string, files: string[]): string | null {
//   if (!command || files.length === 0) return null;

//   const cleanCommand = command.toLowerCase().replace(/[^a-z0-9\s.]/g, "").trim();
//   const tokens = cleanCommand.split(/\s+/).filter(Boolean);

//   let best: { file: string; score: number } | null = null;

//   for (const file of files) {
//     const fileLower = file.toLowerCase().trim();
//     const base = fileLower.replace(/\.[^/.]+$/, ""); 
//     const cleanFile = base.replace(/[^a-z0-9]/g, "");

//     if (cleanCommand.includes(fileLower)) {
//       return file;
//     }

//     let tokenBestScore = 0;
//     for (const tk of tokens) {
//       const tokenClean = tk.replace(/[^a-z0-9]/g, "");
//       if (!tokenClean) continue;

//       if (cleanFile.startsWith(tokenClean)) {
//         tokenBestScore = Math.max(tokenBestScore, 0.95);
//       } else if (cleanFile.includes(tokenClean)) {
//         tokenBestScore = Math.max(tokenBestScore, 0.85);
//       } else {
//         const r = levenshteinRatio(tokenClean, cleanFile);
//         tokenBestScore = Math.max(tokenBestScore, r * 0.9);
//       }
//     }

//     const fullRatio = levenshteinRatio(
//       cleanCommand.replace(/\s+/g, ""),
//       (cleanFile || "").replace(/\s+/g, "")
//     );

//     const score = Math.max(tokenBestScore, fullRatio);

//     if (!best || score > best.score) {
//       best = { file, score };
//     }
//   }

//   if (best && best.score > 0.6) return best.file;
//   return null;
// }

// function inferTabFromFilename(name: string): TabValue | null {
//   const ext = (name || "").split(".").pop()?.toLowerCase() || "";
//   const audioExts = ["mp3", "wav", "aac", "flac", "m4a", "ogg"];
//   const videoExts = ["mp4", "mov", "avi", "mkv"];
//   const imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
//   const docExts = ["pdf", "docx", "doc", "txt", "csv"];

//   if (audioExts.includes(ext)) return "audio";
//   if (videoExts.includes(ext)) return "video";
//   if (imageExts.includes(ext)) return "image";
//   if (docExts.includes(ext)) return "document";
//   return null;
// }

// const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

// // ===== Component =====
// const AccessibilityTool: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<TabValue>("audio");
//   const [isVoiceMode, setIsVoiceMode] = useState(false);
//   const [isListening, setIsListening] = useState(false);
//   const [voiceCommand, setVoiceCommand] = useState("");
//   const [transcript, setTranscript] = useState("");

//   // files state
//   const [downloadFiles, setDownloadFiles] = useState<string[]>([]);
//   const [audioFiles, setAudioFiles] = useState<string[]>([]);
//   const [videoFiles, setVideoFiles] = useState<string[]>([]);
//   const [imageFiles, setImageFiles] = useState<string[]>([]);
//   const [documentFiles, setDocumentFiles] = useState<string[]>([]);
//   const [allFiles, setAllFiles] = useState<string[]>([]);

//   // additional state hooks (for explicit uploaded file name references if needed)
//   const [uploadedVideoFile, setUploadedVideoFile] = useState<string | null>(null);
//   const [uploadedImageFile, setUploadedImageFile] = useState<string | null>(null);
//   const [uploadedDocumentFile, setUploadedDocumentFile] = useState<string | null>(null);
//   const [uploadedAudioFile, setUploadedAudioFile] = useState<string | null>(null);

//   // DEBUG state requested: single uploaded video filename
//   const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);

//   const recognitionRef = useRef<any>(null);
//   const synthRef = useRef(window.speechSynthesis);
//   const isSpeakingRef = useRef(false); // track whether TTS is happening
//   const lastSpokenTextRef = useRef<string | null>(null);

//   const commandSets: Record<string, string[]> = {
//     audio: ["audio", "audio tab", "audio tap"],
//     video: ["video", "video tab", "video tap"],
//     image: ["image", "image tab", "image tap"],
//     document: ["doc", "document", "document tab"],
//     download: ["open download folder", "open downloads", "open folder", "open download"],
//     run: ["play audio", "play video", "play", "run", "transcribe"]
//   };

//   // Debug: log uploadedVideo state whenever it changes
//   useEffect(() => {
//     console.log("🎬 Debug: uploadedVideo state changed:", uploadedVideo);
//   }, [uploadedVideo]);

//   // ----------------------------------
//   // Speech recognition setup
//   // ----------------------------------
//   useEffect(() => {
//     if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
//       const SpeechRecognition =
//         (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
//       const recognizer = new SpeechRecognition();
//       recognitionRef.current = recognizer;

//       recognizer.continuous = true;
//       recognizer.interimResults = true;
//       recognizer.lang = "en-US";

//       recognizer.onresult = (event: any) => {
//         // If we are currently speaking (TTS), ignore to avoid self-trigger
//         if (isSpeakingRef.current) {
//           return;
//         }

//         let interimTranscript = "";
//         let finalTranscript = "";
//         for (let i = event.resultIndex; i < event.results.length; i++) {
//           const transcriptChunk = event.results[i][0].transcript;
//           if (event.results[i].isFinal) {
//             finalTranscript += transcriptChunk + " ";
//           } else {
//             interimTranscript += transcriptChunk + " ";
//           }
//         }

//         const displayedRaw = (finalTranscript || interimTranscript).trim();
//         const displayedLower = displayedRaw.toLowerCase();
//         // Always display last command in lowercase
//         setVoiceCommand(displayedLower);

//         // If the recognized phrase matches our last spoken text, ignore it
//         if (displayedLower && lastSpokenTextRef.current === displayedLower) {
//           console.log("⏩ Ignored self-spoken command:", displayedLower);
//           return;
//         }

//         // Ignore the assistant's own startup phrase as before
//         const ignoredStartup = "voice assistance started say audio tab ,video tab ,image tab, document tab";
//         if (displayedLower.includes(ignoredStartup.toLowerCase())) {
//           console.log("⚠️ Ignored self-startup phrase.");
//           return;
//         }

//         if (finalTranscript) {
//           // handle recognized final command (use trimmed original final transcript to preserve casing for backend if needed)
//           void handleVoiceCommand(finalTranscript.trim());
//         }
//       };

//       recognizer.onerror = (event: any) => {
//         console.error("Speech recognition error:", event);
//       };

//       recognizer.onend = () => {
//         // If voice mode is on and we are not speaking, restart recognition
//         if (isVoiceMode && !isSpeakingRef.current) {
//           setIsListening(true);
//           try {
//             setTimeout(() => recognitionRef.current?.start(), 200);
//           } catch (e) {
//             // ignore start errors
//           }
//         } else {
//           setIsListening(false);
//         }
//       };

//       // start recognizer if voice mode is enabled initially
//       if (isVoiceMode) {
//         try {
//           recognizer.start();
//           setIsListening(true);
//         } catch (e) {
//           // ignore
//         }
//       }
//     }

//     // cleanup on unmount
//     return () => {
//       try {
//         recognitionRef.current?.stop?.();
//       } catch {}
//     };
//   }, [isVoiceMode]); // re-run when voice mode toggles

//   // ----------------------------------
//   // Speech synthesis helper (pauses recognition while speaking)
//   // ----------------------------------
//   const speak = (text: string) => {
//     if (!text) return;
//     const synth = synthRef.current;
//     if (!synth) return;

//     // Keep a lowercase trimmed copy so recognition can ignore this exact phrase
//     lastSpokenTextRef.current = text.toLowerCase().trim();

//     // Cancel any currently queued utterances and stop recognition to avoid hearing ourselves
//     try {
//       synth.cancel();
//     } catch (e) {}

//     try {
//       recognitionRef.current?.abort?.();
//     } catch (e) {}

//     isSpeakingRef.current = true;
//     setIsListening(false);

//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.rate = 0.95;
//     utterance.pitch = 1;
//     utterance.volume = 1;

//     utterance.onstart = () => {
//       isSpeakingRef.current = true;
//       setIsListening(false);
//     };

//     utterance.onend = () => {
//       isSpeakingRef.current = false;
//       // resume recognition after a short delay if voice mode is still active
//       if (isVoiceMode) {
//         setTimeout(() => {
//           try {
//             recognitionRef.current?.start();
//             setIsListening(true);
//           } catch (e) {
//             // ignore start errors
//           }
//         }, 250);
//       }
//     };

//     utterance.onerror = () => {
//       isSpeakingRef.current = false;
//       if (isVoiceMode) {
//         try {
//           recognitionRef.current?.start();
//           setIsListening(true);
//         } catch (e) {}
//       }
//     };

//     synth.speak(utterance);
//   };

//   // ----------------------------------
//   // Fetch file bytes from backend and dispatch to tab (also update lists)
//   // ----------------------------------
//   const fetchAndUploadFile = async (fileName: string) => {
//     try {
//       const url = `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`;
//       console.log("🛰️ fetchAndUploadFile: requesting", url);
//       const res = await fetch(url);
//       if (!res.ok) {
//         console.error("Download-file endpoint returned", res.status, await res.text());
//         speak("Could not fetch the requested file from the server.");
//         return;
//       }

//       const blob = await res.blob();
//       console.log("🛰️ fetchAndUploadFile: fetched blob for", fileName, "size:", blob.size, "type:", blob.type);

//       const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });

//       // dispatch event so Tabs (AudioTab, VideoTab, ImageTab, DocumentTab) can handle an uploaded file
//       window.dispatchEvent(new CustomEvent("fileUploaded", { detail: { file } }));
//       console.log("🛰️ fetchAndUploadFile: dispatched fileUploaded event for", fileName);

//       // ALSO dispatch a filename+url event so tabs that mount late can still react.
      
//       const serverUrl = `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`;

//       window.dispatchEvent(new CustomEvent("fileSelected", { detail: { fileName, url: serverUrl } }));
//       console.log("🛰️ fetchAndUploadFile: dispatched fileSelected event for", fileName, "url:", serverUrl);

//       // Add file to allFiles and per-tab arrays if missing, so UI shows the uploaded file immediately
//       setAllFiles((prev) => {
//         if (!prev.includes(fileName)) return [...prev, fileName];
//         return prev;
//       });

//       const inferred = inferTabFromFilename(fileName);
//       if (inferred === "audio") {
//         setAudioFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
//       } else if (inferred === "video") {
//         setVideoFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
//       } else if (inferred === "image") {
//         setImageFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
//       } else if (inferred === "document") {
//         setDocumentFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
//       }

//       // Clear the filtered downloads view after a short moment
//       setTimeout(() => setDownloadFiles([]), 120);

//       speak(`${fileName} selected and uploaded locally.`);
//     } catch (err) {
//       console.error("fetchAndUploadFile error:", err);
//       speak("Failed to fetch file from server.");
//     }
//   };

//   // ----------------------------------
//   // Send voice command to backend endpoint and handle response
//   // ----------------------------------
//   const sendVoiceCommand = async (command: string) => {
//     try {
//       const response = await fetch("http://127.0.0.1:8000/api/voice-command/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ command }),
//       });

//       const data = await response.json();
//       console.log("📡 Backend response:", data);

//       // backend asks to switch tab
//       if (data.status && data.action === "switch_tab" && data.tab) {
//         setActiveTab(data.tab as TabValue);
//         speak(data.message || `Switched to ${data.tab} tab`);
//         return;
//       }

//       // backend asked to open downloads and returned files
//       if (data.status && data.action === "open_downloads" && data.files) {
//         // Prefer backend-provided tab if present, else use local activeTab
//         const chosenTab: TabValue | "all" = (data.tab as TabValue) || activeTab || "all";

//         // Build per-tab lists and allFiles backup
//         const aud: string[] = [];
//         const vid: string[] = [];
//         const img: string[] = [];
//         const doc: string[] = [];
//         const all: string[] = [];

//         (data.files || []).forEach((f: string) => {
//           all.push(f);
//           const inferred = inferTabFromFilename(f);
//           if (inferred === "audio") aud.push(f);
//           else if (inferred === "video") vid.push(f);
//           else if (inferred === "image") img.push(f);
//           else if (inferred === "document") doc.push(f);
//         });

//         // Update per-tab arrays and backup
//         setAudioFiles(aud);
//         setVideoFiles(vid);
//         setImageFiles(img);
//         setDocumentFiles(doc);
//         setAllFiles(all);

//         // Show filtered list depending on chosenTab and speak tab-specific message
//         if (chosenTab === "audio") {
//           setDownloadFiles(aud);
//           speak("Download folder open showing only audio files");
//         } else if (chosenTab === "video") {
//           setDownloadFiles(vid);
//           speak("Download folder open showing only video files");
//         } else if (chosenTab === "image") {
//           setDownloadFiles(img);
//           speak("Download folder open showing only image files");
//         } else if (chosenTab === "document") {
//           setDownloadFiles(doc);
//           speak("Download folder open showing only document files");
//         } else {
//           // fallback: show all
//           setDownloadFiles(all);
//           speak("Download folder opened. Showing all files.");
//         }
//         return;
//       }

//       // backend says a file was uploaded/selected (server-side) — fetch it to client and dispatch locally
//       if (data.status && data.action === "upload" && data.tab && data.file) {
//         try {
//           // set active tab to what backend says
//           setActiveTab(data.tab as TabValue);
//           // give UI time to mount listeners
//           await wait(500);

//           // fetch and dispatch file
//           await fetchAndUploadFile(data.file);
//         } catch (e) {
//           console.error("Error handling backend upload action:", e);
//           speak("There was an issue processing the uploaded file.");
//         }

//         // speak backend's message if any
//         speak(data.message || `Selected ${data.file}`);

//         // --- DEBUG: set uploadedVideo for visibility in debug UI and console (so you can trace) ---
//         if (data.tab === "video") {
//           console.log("🎬 Debug: backend returned upload for video:", data.file);
//           setUploadedVideo(data.file);
//         }
//         // Also ensure lists have the file (existing logic preserved)
//         if (data.tab === "audio") {
//           setAudioFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
//           setUploadedAudioFile(data.file);
//         } else if (data.tab === "video") {
//           setVideoFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
//           setUploadedVideoFile(data.file);
//         } else if (data.tab === "image") {
//           setImageFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
//           setUploadedImageFile(data.file);
//         } else if (data.tab === "document") {
//           setDocumentFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
//           setUploadedDocumentFile(data.file);
//         }

//         return;
//       }

//       // backend request to stop assistant
//       if (data.status && data.action === "stop") {
//         setIsVoiceMode(false);
//         setIsListening(false);
//         try {
//           recognitionRef.current?.stop();
//         } catch {}
//         synthRef.current?.cancel();
//         speak(data.message || "Voice assistant stopped");
//         return;
//       }

//       // Unknown or error message fallback
//       speak(data.message || "Sorry, I didn't understand that.");
//     } catch (error) {
//       console.error("❌ Error sending voice command:", error);
//       speak("There was an error processing your command.");
//     }
//   };

//   // ----------------------------------
//   // Handle voice commands locally (fuzzy)
//   // ----------------------------------
//   const handleVoiceCommand = async (commandRaw: string) => {
//     if (!commandRaw) return;
//     const command = commandRaw.toLowerCase().trim();
//     console.log("🎤 Voice command received:", commandRaw);

//     // Stop/exit
//     if (["stop", "exit", "end"].some((c) => levenshteinRatio(c, command) > 0.8 || command.includes(c))) {
//       setIsVoiceMode(false);
//       setIsListening(false);
//       try {
//         recognitionRef.current?.stop();
//       } catch {}
//       try {
//         synthRef.current.cancel();
//       } catch {}
//       speak("Voice assistant stopped. Microphone is off.");
//       return;
//     }

//     // If downloads folder is open (we have filtered downloadFiles), handle "upload <name>"
//     if (downloadFiles.length > 0) {
//       const uploadMatch = command.match(/upload\s+(.+)/i);
//       if (uploadMatch) {
//         const spokenName = uploadMatch[1].trim().toLowerCase();
//         const matchedFile = fuzzyMatchFilename(spokenName, downloadFiles);
//         if (matchedFile) {
//           const inferredTab = inferTabFromFilename(matchedFile) || "audio";
//           setActiveTab(inferredTab);
//           await wait(120);
//           await fetchAndUploadFile(matchedFile);
//           return;
//         } else {
//           speak(`I could not find ${spokenName} in your downloads`);
//           return;
//         }
//       }
//     }

//     // fuzzy-match command to keys
//     let matchedKey: string | null = null;
//     for (const [key, variants] of Object.entries(commandSets)) {
//       for (const v of variants) {
//         const score = typeof fuzzy === "function" ? fuzzy(v, command) : levenshteinRatio(v, command);
//         if (score > 0.7) {
//           matchedKey = key;
//           break;
//         }
//       }
//       if (matchedKey) break;
//     }

//     // If downloads folder is open, allow picking by filename spoken alone
//     if (downloadFiles.length > 0) {
//       const matchedFile = fuzzyMatchFilename(command, downloadFiles);
//       if (matchedFile) {
//         const inferredTab = inferTabFromFilename(matchedFile) || activeTab || "audio";
//         setActiveTab(inferredTab);
//         await wait(120);
//         await fetchAndUploadFile(matchedFile);
//         return;
//       }
//     }

//     // Run / transcribe
//     if (matchedKey === "run") {
//       speak("Running the selected file.");
//       window.dispatchEvent(new Event("autoTranscribe"));
//       return;
//     }

//     // Open downloads
//     if (matchedKey === "download") {
//       speak("Opening your downloads folder");
//       // Ask backend to open download folder and return filtered files
//       void sendVoiceCommand("open download folder");
//       return;
//     }

//     // Tab switches (local)
//     if (["audio", "video", "image", "document"].includes(matchedKey || "")) {
//       setActiveTab(matchedKey as TabValue);
//       speak(`Switched to ${matchedKey} tab`);
//       return;
//     }

//     // Fallback: forward raw command to backend and emit local event
//     const event = new CustomEvent("voiceCommand", { detail: commandRaw });
//     window.dispatchEvent(event);
//     void sendVoiceCommand(commandRaw);
//   };

//   // ----------------------------------
//   // Toggle voice mode (start/stop recognition)
//   // ----------------------------------
//   const toggleVoiceMode = async () => {
//     if (!isVoiceMode) {
//       try {
//         await navigator.mediaDevices.getUserMedia({ audio: true });
//         setIsVoiceMode(true);
//         setIsListening(true);
//         speak("Voice assistant activated.");
//         setTimeout(() => {
//           try {
//             recognitionRef.current?.start();
//           } catch (e) {
//             // ignore start errors
//           }
//         }, 500);
//       } catch (err) {
//         console.error("Microphone permission denied:", err);
//         speak("Microphone access is required to use voice mode.");
//       }
//     } else {
//       setIsVoiceMode(false);
//       setIsListening(false);
//       try {
//         recognitionRef.current?.stop();
//       } catch {}
//       try {
//         synthRef.current.cancel();
//       } catch {}
//       speak("Voice assistant deactivated");
//     }
//   };

//   // ----------------------------------
//   // Toggle transcript playback (speech synthesis of transcript)
//   // ----------------------------------
//   const toggleAudio = () => {
//     const synth = synthRef.current;
//     if (!synth) return;
//     if (synth.speaking) {
//       try {
//         synth.cancel();
//       } catch {}
//     } else if (transcript) {
//       speak(transcript);
//     }
//   };

//   // ----------------------------------
//   // When tab manually changed, clear filtered downloads view (so it will be re-opened if user asks)
//   // ----------------------------------
//   const handleTabChange = (tab: TabValue) => {
//     setActiveTab(tab);
//     setDownloadFiles([]); // clear previously filtered listing on manual tab change
//   };

//   // ----------------------------------
//   // Render
//   // ----------------------------------
//   return (
//     <div className="min-h-screen bg-background p-4" role="main">
//       <div className="max-w-6xl mx-auto">
//         {/* Header */}
//         <header className="mb-6 text-center">
//           <h1 className="text-4xl font-bold mb-2" id="tool-title">
//             Accessibility Transcription Tool
//           </h1>
//           <p className="text-muted-foreground mb-4" id="tool-desc">
//             Supporting both manual and voice-based interactions for inclusive access
//           </p>
//         </header>

//         {/* Control Buttons */}
//         <div className="flex justify-center gap-4 mb-4" role="region" aria-label="Voice controls">
//           <Button
//             onClick={toggleVoiceMode}
//             aria-pressed={isVoiceMode}
//             aria-label={isVoiceMode ? "Stop voice assistant" : "Start voice assistant"}
//             variant={isVoiceMode ? "destructive" : "outline"}
//             size="lg"
//             className="text-lg px-6 py-3"
//           >
//             {isVoiceMode ? (
//               <>
//                 <MicOff className="mr-2 h-5 w-5" aria-hidden="true" />
//                 Stop Voice Assistant
//               </>
//             ) : (
//               <>
//                 <Mic className="mr-2 h-5 w-5" aria-hidden="true" />
//                 Start Voice Assistant
//               </>
//             )}
//           </Button>

//           <Button
//             onClick={toggleAudio}
//             aria-label={synthRef.current?.speaking ? "Stop audio playback" : "Read transcript aloud"}
//             variant="outline"
//             size="lg"
//             className="text-lg px-6 py-3"
//           >
//             {synthRef.current?.speaking ? (
//               <>
//                 <VolumeX className="mr-2 h-5 w-5" aria-hidden="true" />
//                 Stop Audio
//               </>
//             ) : (
//               <>
//                 <Volume2 className="mr-2 h-5 w-5" aria-hidden="true" />
//                 Read Transcript
//               </>
//             )}
//           </Button>
//         </div>

//         {/* Voice Status */}
//         {isVoiceMode && (
//           <div className="text-center" role="status" aria-live="polite">
//             <div
//               className={`inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg`}
//             >
//               <div
//                 className={`w-3 h-3 rounded-full ${isListening ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
//                 aria-hidden="true"
//               />
//               <span>Voice Mode: {isListening ? "Listening..." : "Inactive"}</span>
//             </div>
//             {voiceCommand && (
//               <p className="mt-2 text-sm text-muted-foreground">Last command: "{voiceCommand}"</p>
//             )}
//           </div>
//         )}

//         {/* Main Tabs */}
//         <Tabs
//           value={activeTab}
//           onValueChange={handleTabChange}
//           className="w-full"
//           aria-labelledby="tool-title"
//         >
//           <TabsList className="grid w-full grid-cols-4 h-14 text-lg" role="tablist">
//             <TabsTrigger value="audio" className="py-3">Audio</TabsTrigger>
//             <TabsTrigger value="video" className="py-3">Video</TabsTrigger>
//             <TabsTrigger value="image" className="py-3">Image</TabsTrigger>
//             <TabsTrigger value="document" className="py-3">Document</TabsTrigger>
//           </TabsList>

//           <TabsContent value="audio" className="mt-6">
//             <AudioTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
//           </TabsContent>

//           <TabsContent value="video" className="mt-6">
//             <VideoTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
//           </TabsContent>

//           <TabsContent value="image" className="mt-6">
//             <ImageTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
//           </TabsContent>

//           <TabsContent value="document" className="mt-6">
//             <DocumentTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
//           </TabsContent>
//         </Tabs>

//         {/* Debug UI: shows uploaded filename(s) and instructions */}
//         <Card className="mt-6">
//           <CardHeader>
//             <CardTitle>Debug / Upload Status</CardTitle>
//             <CardDescription>
//               Developer debug info — check browser console for detailed logs.
//             </CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2 text-sm">
//               <div>
//                 <strong>Last server-selected uploaded file (video):</strong>{" "}
//                 <span>{uploadedVideo ?? "— none —"}</span>
//               </div>
//               <div>
//                 <strong>Video files list:</strong>{" "}
//                 <span>{videoFiles.length > 0 ? videoFiles.join(", ") : "— none —"}</span>
//               </div>
//               <div className="mt-2 text-xs text-muted-foreground">
//                 Console debug tips:
//                 <ul className="ml-4 list-disc">
//                   <li>Open DevTools → Console to see logs from fetchAndUploadFile and backend responses.</li>
//                   <li>Look for logs starting with <code>🛰️ fetchAndUploadFile</code> and <code>📡 Backend response</code>.</li>
//                   <li>
//                     If backend responds with 
//                     <code>{`{ action: "upload", tab: "video", file: "yourfile.mp4" }`}</code>, 
//                     the UI dispatches <code>fileUploaded</code> and <code>fileSelected</code> events for VideoTab to pick up.
//                   </li>
//                 </ul>
//               </div>
//             </div>
//           </CardContent>
//         </Card>

//         {/* Instructions */}
//         <Card className="mt-8" role="region" aria-labelledby="how-to-title">
//           <CardHeader>
//             <CardTitle id="how-to-title">How to Use</CardTitle>
//             <CardDescription>
//               This tool supports manual and voice-based interactions for maximum accessibility.
//             </CardDescription>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div>
//               <h3 className="font-semibold mb-2">Manual Mode (Default)</h3>
//               <p className="text-sm text-muted-foreground">
//                 Use buttons and file uploads to interact with the tool. Ideal for users navigating visually or with assistive devices.
//               </p>
//             </div>
//             <div>
//               <h3 className="font-semibold mb-2">Voice Mode</h3>
//               <p className="text-sm text-muted-foreground">Activate voice assistant for hands-free operation. Use commands like:</p>
//               <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
//                 <li>"Audio Tab" - Switch to audio processing</li>
//                 <li>"Video Tab" - Switch to video processing</li>
//                 <li>"Image Tab" - Switch to image processing</li>
//                 <li>"Document Tab" - Switch to document processing</li>
//                 <li>"Open Download Folder" - Open downloads folder</li>
//                 <li>"Upload george.mp3" or "Upload george" - Select file from Downloads by voice</li>
//                 <li>"Transcribe" / "Play" - Start processing the selected file</li>
//                 <li>"Exit" or "Stop" - Deactivate voice assistant</li>
//               </ul>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default AccessibilityTool;


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------



// src>components>AccessibilityTool.tsx
// import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
// import { Button } from "@/components/ui/button";
// import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
// import AudioTab from "./tabs/AudioTab";
// import VideoTab from "./tabs/VideoTab";
// import ImageTab from "./tabs/ImageTab";
// import DocumentTab from "./tabs/DocumentTab";
// import { fuzzy } from "fast-fuzzy";

// // Extend window interface for voiceAPI (if exists)
// declare global {
//   interface Window {
//     voiceAPI?: {
//       startListening: () => void;
//       stopListening: () => void;
//       onCommand: (callback: (command: string) => void) => void;
//     };
//   }
// }

// // Tab type
// type TabValue = "audio" | "video" | "image" | "document";

// interface TabComponentProps {
//   onTranscriptChange: Dispatch<SetStateAction<string>>;
//   isVoiceMode: boolean;
// }

// // ===== Helper functions =====
// function levenshteinRatio(a: string, b: string): number {
//   if (!a && !b) return 1;
//   if (!a || !b) return 0;
//   const la = a.length;
//   const lb = b.length;
//   const dp: number[][] = Array.from({ length: la + 1 }, () =>
//     new Array<number>(lb + 1).fill(0)
//   );
//   for (let i = 0; i <= la; i++) dp[i][0] = i;
//   for (let j = 0; j <= lb; j++) dp[0][j] = j;
//   for (let i = 1; i <= la; i++) {
//     for (let j = 1; j <= lb; j++) {
//       const cost = a[i - 1] === b[j - 1] ? 0 : 1;
//       dp[i][j] = Math.min(
//         dp[i - 1][j] + 1,
//         dp[i][j - 1] + 1,
//         dp[i - 1][j - 1] + cost
//       );
//     }
//   }
//   const dist = dp[la][lb];
//   const maxLen = Math.max(la, lb);
//   return 1 - dist / maxLen;
// }

// function fuzzyMatchFilename(command: string, files: string[]): string | null {
//   if (!command || files.length === 0) return null;
//   const cleanCommand = command.toLowerCase().replace(/[^a-z0-9\s.]/g, "").trim();
//   const tokens = cleanCommand.split(/\s+/).filter(Boolean);
//   let best: { file: string; score: number } | null = null;
//   for (const file of files) {
//     const fileLower = file.toLowerCase().trim();
//     const base = fileLower.replace(/\.[^/.]+$/, "");
//     const cleanFile = base.replace(/[^a-z0-9]/g, "");
//     if (cleanCommand.includes(fileLower)) return file;
//     let tokenBestScore = 0;
//     for (const tk of tokens) {
//       const tokenClean = tk.replace(/[^a-z0-9]/g, "");
//       if (!tokenClean) continue;
//       if (cleanFile.startsWith(tokenClean)) tokenBestScore = Math.max(tokenBestScore, 0.95);
//       else if (cleanFile.includes(tokenClean)) tokenBestScore = Math.max(tokenBestScore, 0.85);
//       else tokenBestScore = Math.max(tokenBestScore, levenshteinRatio(tokenClean, cleanFile) * 0.9);
//     }
//     const fullRatio = levenshteinRatio(cleanCommand.replace(/\s+/g, ""), cleanFile.replace(/\s+/g, ""));
//     const score = Math.max(tokenBestScore, fullRatio);
//     if (!best || score > best.score) best = { file, score };
//   }
//   if (best && best.score > 0.6) return best.file;
//   return null;
// }

// function inferTabFromFilename(name: string): TabValue | null {
//   const ext = (name || "").split(".").pop()?.toLowerCase() || "";
//   const audioExts = ["mp3", "wav", "aac", "flac", "m4a", "ogg"];
//   const videoExts = ["mp4", "mov", "avi", "mkv"];
//   const imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
//   const docExts = ["pdf", "docx", "doc", "txt", "csv"];
//   if (audioExts.includes(ext)) return "audio";
//   if (videoExts.includes(ext)) return "video";
//   if (imageExts.includes(ext)) return "image";
//   if (docExts.includes(ext)) return "document";
//   return null;
// }

// const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));

// // ===== Component =====
// const AccessibilityTool: React.FC = () => {
//   const [activeTab, setActiveTab] = useState<TabValue>("audio");
//   const [isVoiceMode, setIsVoiceMode] = useState(false);
//   const [isListening, setIsListening] = useState(false);
//   const [voiceCommand, setVoiceCommand] = useState("");
//   const [transcript, setTranscript] = useState("");
//   const [downloadFiles, setDownloadFiles] = useState<string[]>([]);
//   const [audioFiles, setAudioFiles] = useState<string[]>([]);
//   const [videoFiles, setVideoFiles] = useState<string[]>([]);
//   const [imageFiles, setImageFiles] = useState<string[]>([]);
//   const [documentFiles, setDocumentFiles] = useState<string[]>([]);
//   const [allFiles, setAllFiles] = useState<string[]>([]);
//   const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);

//   // NEW: track last uploaded video for transcription
//   const [lastUploadedFile, setLastUploadedFile] = useState<string | null>(null);

//   const recognitionRef = useRef<any>(null);
//   const synthRef = useRef(window.speechSynthesis);
//   const isSpeakingRef = useRef(false);
//   const lastSpokenTextRef = useRef<string | null>(null);

//   const commandSets: Record<string, string[]> = {
//     audio: ["audio", "audio tab", "audio tap"],
//     video: ["video", "video tab", "video tap"],
//     image: ["image", "image tab", "image tap"],
//     document: ["doc", "document", "document tab"],
//     download: ["open download folder", "open downloads", "open folder", "open download"],
//     run: ["play audio", "play video", "play", "run", "transcribe"]
//   };

//   // DEBUG uploadedVideo state
//   useEffect(() => {
//     console.log("🎬 Debug: uploadedVideo state changed:", uploadedVideo);
//   }, [uploadedVideo]);

//   // ----- Speech Recognition Setup -----
//   useEffect(() => {
//     if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
//       const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
//       const recognizer = new SpeechRecognition();
//       recognitionRef.current = recognizer;
//       recognizer.continuous = true;
//       recognizer.interimResults = true;
//       recognizer.lang = "en-US";

//       recognizer.onresult = (event: any) => {
//         if (isSpeakingRef.current) return;
//         let interimTranscript = "";
//         let finalTranscript = "";
//         for (let i = event.resultIndex; i < event.results.length; i++) {
//           const transcriptChunk = event.results[i][0].transcript;
//           if (event.results[i].isFinal) finalTranscript += transcriptChunk + " ";
//           else interimTranscript += transcriptChunk + " ";
//         }
//         const displayedRaw = (finalTranscript || interimTranscript).trim();
//         const displayedLower = displayedRaw.toLowerCase();
//         setVoiceCommand(displayedLower);

//         if (displayedLower && lastSpokenTextRef.current === displayedLower) return;
//         const ignoredStartup = "voice assistance started say audio tab ,video tab ,image tab, document tab";
//         if (displayedLower.includes(ignoredStartup.toLowerCase())) return;

//         if (finalTranscript) void handleVoiceCommand(finalTranscript.trim());
//       };

//       recognizer.onerror = (event: any) => console.error("Speech recognition error:", event);

//       recognizer.onend = () => {
//         if (isVoiceMode && !isSpeakingRef.current) {
//           setIsListening(true);
//           try { setTimeout(() => recognitionRef.current?.start(), 200); } catch {}
//         } else setIsListening(false);
//       };

//       if (isVoiceMode) try { recognizer.start(); setIsListening(true); } catch {}
//     }
//     return () => { try { recognitionRef.current?.stop?.(); } catch {} };
//   }, [isVoiceMode]);

//   // ----- Speech Synthesis Helper -----
//   const speak = (text: string) => {
//     if (!text) return;
//     const synth = synthRef.current;
//     if (!synth) return;
//     lastSpokenTextRef.current = text.toLowerCase().trim();
//     try { synth.cancel(); } catch {}
//     try { recognitionRef.current?.abort?.(); } catch {}
//     isSpeakingRef.current = true;
//     setIsListening(false);
//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.rate = 0.95; utterance.pitch = 1; utterance.volume = 1;
//     utterance.onstart = () => { isSpeakingRef.current = true; setIsListening(false); };
//     utterance.onend = () => {
//       isSpeakingRef.current = false;
//       if (isVoiceMode) { setTimeout(() => { try { recognitionRef.current?.start(); setIsListening(true); } catch {} }, 250); }
//     };
//     utterance.onerror = () => {
//       isSpeakingRef.current = false;
//       if (isVoiceMode) { try { recognitionRef.current?.start(); setIsListening(true); } catch {} }
//     };
//     synth.speak(utterance);
//   };

//   // ----- Fetch file from backend -----
//   const fetchAndUploadFile = async (fileName: string) => {
//     try {
//       const url = `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`;
//       const res = await fetch(url);
//       if (!res.ok) { speak("Could not fetch the requested file."); return; }
//       const blob = await res.blob();
//       const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });
//       window.dispatchEvent(new CustomEvent("fileUploaded", { detail: { file } }));
//       window.dispatchEvent(new CustomEvent("fileSelected", { detail: { fileName, url } }));
//       setAllFiles(prev => prev.includes(fileName) ? prev : [...prev, fileName]);

//       const inferred = inferTabFromFilename(fileName);
//       if (inferred === "audio") setAudioFiles(prev => prev.includes(fileName) ? prev : [...prev, fileName]);
//       else if (inferred === "video") { setVideoFiles(prev => prev.includes(fileName) ? prev : [...prev, fileName]); setUploadedVideo(fileName); setLastUploadedFile(fileName); }
//       else if (inferred === "image") setImageFiles(prev => prev.includes(fileName) ? prev : [...prev, fileName]);
//       else if (inferred === "document") setDocumentFiles(prev => prev.includes(fileName) ? prev : [...prev, fileName]);
//       setTimeout(() => setDownloadFiles([]), 120);
//       speak(`${fileName} selected and uploaded locally.`);
//     } catch (err) {
//       console.error("fetchAndUploadFile error:", err);
//       speak("Failed to fetch file from server.");
//     }
//   };

//   // ----- Handle voice command locally -----
//   const handleVoiceCommand = async (commandRaw: string) => {
//     if (!commandRaw) return;
//     const command = commandRaw.toLowerCase().trim();
//     console.log("🎤 Voice command received:", commandRaw);

//     // Stop/exit
//     if (["stop", "exit", "end"].some(c => levenshteinRatio(c, command) > 0.8 || command.includes(c))) {
//       setIsVoiceMode(false); setIsListening(false);
//       try { recognitionRef.current?.stop(); } catch {}
//       try { synthRef.current.cancel(); } catch {}
//       speak("Voice assistant stopped. Microphone is off.");
//       return;
//     }

//     // Handle "start transcription" for uploaded video
//     if (command === "start transcription") {
//       if (!lastUploadedFile) {
//         speak("No video file is uploaded for transcription.");
//         return;
//       }
//       console.log("🎬 Starting transcription for:", lastUploadedFile);
//       try {
//         const res = await fetch("http://127.0.0.1:8000/api/voice-command/", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ file: lastUploadedFile }),
//         });
//         const data = await res.json();
//         console.log("📜 Transcript received:", data);
//         if (data?.transcript) setTranscript(data.transcript);
//         speak("Video transcription completed.");
//       } catch (err) {
//         console.error("❌ Transcription error:", err);
//         speak("Error occurred during video transcription.");
//       }
//       return;
//     }

//     // Upload commands
//     if (downloadFiles.length > 0) {
//       const uploadMatch = command.match(/upload\s+(.+)/i);
//       if (uploadMatch) {
//         const spokenName = uploadMatch[1].trim().toLowerCase();
//         const matchedFile = fuzzyMatchFilename(spokenName, downloadFiles);
//         if (matchedFile) { setActiveTab(inferTabFromFilename(matchedFile) || "audio"); await wait(120); await fetchAndUploadFile(matchedFile); return; }
//         else { speak(`I could not find ${spokenName} in your downloads`); return; }
//       }
//     }

//     // Fuzzy match commandSets
//     let matchedKey: string | null = null;
//     for (const [key, variants] of Object.entries(commandSets)) {
//       for (const v of variants) {
//         const score = typeof fuzzy === "function" ? fuzzy(v, command) : levenshteinRatio(v, command);
//         if (score > 0.7) { matchedKey = key; break; }
//       }
//       if (matchedKey) break;
//     }

//     // Run / transcribe (local)
//     if (matchedKey === "run") { speak("Running the selected file."); window.dispatchEvent(new Event("autoTranscribe")); return; }

//     // Downloads
//     if (matchedKey === "download") { speak("Opening your downloads folder"); void sendVoiceCommand("open download folder"); return; }

//     // Tab switches
//     if (["audio", "video", "image", "document"].includes(matchedKey || "")) { setActiveTab(matchedKey as TabValue); speak(`Switched to ${matchedKey} tab`); return; }

//     // Fallback: forward raw command
//     const event = new CustomEvent("voiceCommand", { detail: commandRaw });
//     window.dispatchEvent(event);
//     void sendVoiceCommand(commandRaw);
//   };

//   // ----- Send voice command to backend -----
//   const sendVoiceCommand = async (command: string) => {
//     try {
//       const response = await fetch("http://127.0.0.1:8000/api/voice-command/", {
//         method: "POST",
//         headers: { "Content-Type": "application/json" },
//         body: JSON.stringify({ command }),
//       });
//       const data = await response.json();
//       console.log("📡 Backend response:", data);
//       // Backend handling (switch tab / open downloads / upload / stop)
//       if (data.status && data.action === "upload" && data.tab && data.file) {
//         setActiveTab(data.tab as TabValue); await wait(500); await fetchAndUploadFile(data.file);
//         speak(data.message || `Selected ${data.file}`);
//         return;
//       }
//       if (data.status && data.action === "stop") {
//         setIsVoiceMode(false); setIsListening(false); try { recognitionRef.current?.stop(); } catch {} synthRef.current?.cancel();
//         speak(data.message || "Voice assistant stopped"); return;
//       }
//       speak(data.message || "Sorry, I didn't understand that.");
//     } catch (error) { console.error("❌ Error sending voice command:", error); speak("Error processing your command."); }
//   };

//   // ----- Voice toggle -----
//   const toggleVoiceMode = async () => {
//     if (!isVoiceMode) {
//       try { await navigator.mediaDevices.getUserMedia({ audio: true }); setIsVoiceMode(true); setIsListening(true); speak("Voice assistant activated."); setTimeout(() => { try { recognitionRef.current?.start(); } catch {} }, 500); } 
//       catch (err) { console.error("Microphone permission denied:", err); speak("Microphone access is required to use voice mode."); }
//     } else {
//       setIsVoiceMode(false); setIsListening(false); try { recognitionRef.current?.stop(); } catch {} try { synthRef.current.cancel(); } catch {}
//       speak("Voice assistant deactivated");
//     }
//   };

//   const toggleAudio = () => {
//     const synth = synthRef.current;
//     if (!synth) return;
//     if (synth.speaking) { try { synth.cancel(); } catch {} }
//     else if (transcript) { speak(transcript); }
//   };

//   const handleTabChange = (tab: TabValue) => { setActiveTab(tab); setDownloadFiles([]); };

//   // ----- Render -----
//   return (
//     <div className="min-h-screen bg-background p-4" role="main">
//       <div className="max-w-6xl mx-auto">
//         <header className="mb-6 text-center">
//           <h1 className="text-4xl font-bold mb-2" id="tool-title">Accessibility Transcription Tool</h1>
//           <p className="text-muted-foreground mb-4" id="tool-desc">Supporting both manual and voice-based interactions for inclusive access</p>
//         </header>
//         <div className="flex justify-center gap-4 mb-4" role="region" aria-label="Voice controls">
//           <Button onClick={toggleVoiceMode} aria-pressed={isVoiceMode} aria-label={isVoiceMode ? "Stop voice assistant" : "Start voice assistant"} variant={isVoiceMode ? "destructive" : "outline"} size="lg" className="text-lg px-6 py-3">
//             {isVoiceMode ? <><MicOff className="mr-2 h-5 w-5" /> Stop Voice Assistant</> : <><Mic className="mr-2 h-5 w-5" /> Start Voice Assistant</>}
//           </Button>
//           <Button onClick={toggleAudio} aria-label={synthRef.current?.speaking ? "Stop audio playback" : "Read transcript aloud"} variant="outline" size="lg" className="text-lg px-6 py-3">
//             {synthRef.current?.speaking ? <><VolumeX className="mr-2 h-5 w-5" /> Stop Audio</> : <><Volume2 className="mr-2 h-5 w-5" /> Read Transcript</>}
//           </Button>
//         </div>
//         {isVoiceMode && <div className="text-center" role="status" aria-live="polite">
//           <div className={`inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg`}>
//             <div className={`w-3 h-3 rounded-full ${isListening ? "bg-green-400 animate-pulse" : "bg-red-400"}`} />
//             <span>Voice Mode: {isListening ? "Listening..." : "Inactive"}</span>
//           </div>
//           {voiceCommand && <p className="mt-2 text-sm text-muted-foreground">Last command: "{voiceCommand}"</p>}
//         </div>}
//         <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full" aria-labelledby="tool-title">
//           <TabsList className="grid w-full grid-cols-4 h-14 text-lg">
//             <TabsTrigger value="audio" className="py-3">Audio</TabsTrigger>
//             <TabsTrigger value="video" className="py-3">Video</TabsTrigger>
//             <TabsTrigger value="image" className="py-3">Image</TabsTrigger>
//             <TabsTrigger value="document" className="py-3">Document</TabsTrigger>
//           </TabsList>
//           <TabsContent value="audio" className="mt-6"><AudioTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} /></TabsContent>
//           <TabsContent value="video" className="mt-6"><VideoTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} /></TabsContent>
//           <TabsContent value="image" className="mt-6"><ImageTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} /></TabsContent>
//           <TabsContent value="document" className="mt-6"><DocumentTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} /></TabsContent>
//         </Tabs>
//         <Card className="mt-6">
//           <CardHeader>
//             <CardTitle>Debug / Upload Status</CardTitle>
//             <CardDescription>Developer debug info — check browser console for detailed logs.</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="space-y-2 text-sm">
//               <div><strong>Last uploaded video:</strong> {uploadedVideo ?? "— none —"}</div>
//               <div><strong>Video files list:</strong> {videoFiles.length > 0 ? videoFiles.join(", ") : "— none —"}</div>
//             </div>
//           </CardContent>
//         </Card>
//       </div>
//     </div>
//   );
// };

// export default AccessibilityTool;


//-------------------------------------------------------------------------------------------------------------------------------------------------------------------------

import Fuse from "fuse.js";

import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Mic, MicOff, Volume2, VolumeX } from "lucide-react";
import AudioTab from "./tabs/AudioTab";
import VideoTab from "./tabs/VideoTab";
import ImageTab from "./tabs/ImageTab";
import DocumentTab from "./tabs/DocumentTab";
import { fuzzy } from "fast-fuzzy"; // optional; fallback to levenshteinRatio when not available
import Website from "./Website";


// Extend window interface for voiceAPI (if exists)
declare global {
  interface Window {
    voiceAPI?: {
      startListening: () => void;
      stopListening: () => void;
      onCommand: (callback: (command: string) => void) => void;
    };
  }
}

// Tab type
type TabValue = "audio" | "video" | "image" | "document" | "complianceChecker";

interface TabComponentProps {
  onTranscriptChange: Dispatch<SetStateAction<string>>;
  isVoiceMode: boolean;
}

// ===== Helper functions (levenshtein, fuzzy matching, infer tab) =====
function levenshteinRatio(a: string, b: string): number {
  if (!a && !b) return 1;
  if (!a || !b) return 0;
  const la = a.length;
  const lb = b.length;
  const dp: number[][] = Array.from({ length: la + 1 }, () =>
    new Array<number>(lb + 1).fill(0)
  );
  for (let i = 0; i <= la; i++) dp[i][0] = i;
  for (let j = 0; j <= lb; j++) dp[0][j] = j;
  for (let i = 1; i <= la; i++) {
    for (let j = 1; j <= lb; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  const dist = dp[la][lb];
  const maxLen = Math.max(la, lb);
  return 1 - dist / maxLen;
}

function fuzzyMatchFilename(command: string, files: string[]): string | null {
  if (!command || files.length === 0) return null;

  const cleanCommand = command.toLowerCase().replace(/[^a-z0-9\s.]/g, "").trim();
  const tokens = cleanCommand.split(/\s+/).filter(Boolean);

  let best: { file: string; score: number } | null = null;

  for (const file of files) {
    const fileLower = file.toLowerCase().trim();
    const base = fileLower.replace(/\.[^/.]+$/, ""); 
    const cleanFile = base.replace(/[^a-z0-9]/g, "");

    if (cleanCommand.includes(fileLower)) {
      return file;
    }

    let tokenBestScore = 0;
    for (const tk of tokens) {
      const tokenClean = tk.replace(/[^a-z0-9]/g, "");
      if (!tokenClean) continue;

      if (cleanFile.startsWith(tokenClean)) {
        tokenBestScore = Math.max(tokenBestScore, 0.95);
      } else if (cleanFile.includes(tokenClean)) {
        tokenBestScore = Math.max(tokenBestScore, 0.85);
      } else {
        const r = levenshteinRatio(tokenClean, cleanFile);
        tokenBestScore = Math.max(tokenBestScore, r * 0.9);
      }
    }

    const fullRatio = levenshteinRatio(
      cleanCommand.replace(/\s+/g, ""),
      (cleanFile || "").replace(/\s+/g, "")
    );

    const score = Math.max(tokenBestScore, fullRatio);

    if (!best || score > best.score) {
      best = { file, score };
    }
  }

  if (best && best.score > 0.6) return best.file;
  return null;
}

function inferTabFromFilename(name: string): TabValue | null {
  const ext = (name || "").split(".").pop()?.toLowerCase() || "";
  const audioExts = ["mp3", "wav", "aac", "flac", "m4a", "ogg"];
  const videoExts = ["mp4", "mov", "avi", "mkv"];
  const imageExts = ["jpg", "jpeg", "png", "gif", "webp"];
  const docExts = ["pdf", "docx", "doc", "txt", "csv"];


  if (audioExts.includes(ext)) return "audio";
  if (videoExts.includes(ext)) return "video";
  if (imageExts.includes(ext)) return "image";
  if (docExts.includes(ext)) return "document";
  return null;
}

const wait = (ms: number) => new Promise((res) => setTimeout(res, ms));


// Build fuzzy searcher for available files
const fuseOptions = {
  includeScore: true,
  threshold: 0.4, // lower = stricter, 0.4–0.6 works well
  keys: []        // search entire filename string
};






// ===== Component =====
const AccessibilityTool: React.FC = () => {
  const [activeTab, setActiveTab] = useState<TabValue>("audio");
  const [isVoiceMode, setIsVoiceMode] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [voiceCommand, setVoiceCommand] = useState("");
  const [transcript, setTranscript] = useState("");

  // files state
  const [downloadFiles, setDownloadFiles] = useState<string[]>([]);
  const [audioFiles, setAudioFiles] = useState<string[]>([]);
  const [videoFiles, setVideoFiles] = useState<string[]>([]);
  const [imageFiles, setImageFiles] = useState<string[]>([]);
  const [documentFiles, setDocumentFiles] = useState<string[]>([]);
  const [allFiles, setAllFiles] = useState<string[]>([]);

  // additional state hooks (for explicit uploaded file name references if needed)
  const [uploadedVideoFile, setUploadedVideoFile] = useState<string | null>(null);
  const [uploadedImageFile, setUploadedImageFile] = useState<string | null>(null);
  const [uploadedDocumentFile, setUploadedDocumentFile] = useState<string | null>(null);
  const [uploadedAudioFile, setUploadedAudioFile] = useState<string | null>(null);

  // DEBUG state requested: single uploaded video filename
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);

  const recognitionRef = useRef<any>(null);
  const synthRef = useRef(window.speechSynthesis);
  const isSpeakingRef = useRef(false); // track whether TTS is happening
  const lastSpokenTextRef = useRef<string | null>(null);

  const commandSets: Record<string, string[]> = {
    audio: ["audio", "audio tab", "audio tap"],
    video: ["video", "video tab", "video tap"],
    image: ["image", "image tab", "image tap"],
    document: ["doc", "document", "document tab"],
    complianceChecker:["compliance","compliant", "compliance checker","compliance check","complaint checkers","checker"],
    download: ["open download folder", "open downloads", "open folder", "open download"],
    run: ["play audio", "play video", "play", "run", "transcribe"]
  };

  // Debug: log uploadedVideo state whenever it changes
  useEffect(() => {
    console.log("🎬 Debug: uploadedVideo state changed:", uploadedVideo);
  }, [uploadedVideo]);

  // ----------------------------------
  // Speech recognition setup
  // ----------------------------------
  useEffect(() => {
    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      const SpeechRecognition =
        (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
      const recognizer = new SpeechRecognition();
      recognitionRef.current = recognizer;

      recognizer.continuous = true;
      recognizer.interimResults = true;
      recognizer.lang = "en-US";

      recognizer.onresult = (event: any) => {
        // If we are currently speaking (TTS), ignore to avoid self-trigger
        if (isSpeakingRef.current) {
          return;
        }

        let interimTranscript = "";
        let finalTranscript = "";
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const transcriptChunk = event.results[i][0].transcript;
          if (event.results[i].isFinal) {
            finalTranscript += transcriptChunk + " ";
          } else {
            interimTranscript += transcriptChunk + " ";
          }
        }

        const displayedRaw = (finalTranscript || interimTranscript).trim();
        const displayedLower = displayedRaw.toLowerCase();
        // Always display last command in lowercase
        setVoiceCommand(displayedLower);

        // If the recognized phrase matches our last spoken text, ignore it
        if (displayedLower && lastSpokenTextRef.current === displayedLower) {
          console.log("⏩ Ignored self-spoken command:", displayedLower);
          return;
        }

        // Ignore the assistant's own startup phrase as before
        const ignoredStartup = "voice assistance started say audio tab ,video tab ,image tab, document tab";
        if (displayedLower.includes(ignoredStartup.toLowerCase())) {
          console.log("⚠️ Ignored self-startup phrase.");
          return;
        }

        if (finalTranscript) {
          // handle recognized final command (use trimmed original final transcript to preserve casing for backend if needed)
          void handleVoiceCommand(finalTranscript.trim());
        }
      };

      recognizer.onerror = (event: any) => {
        console.error("Speech recognition error:", event);
      };

      recognizer.onend = () => {
        // If voice mode is on and we are not speaking, restart recognition
        if (isVoiceMode && !isSpeakingRef.current) {
          setIsListening(true);
          try {
            setTimeout(() => recognitionRef.current?.start(), 200);
          } catch (e) {
            // ignore start errors
          }
        } else {
          setIsListening(false);
        }
      };

      // start recognizer if voice mode is enabled initially
      if (isVoiceMode) {
        try {
          recognizer.start();
          setIsListening(true);
        } catch (e) {
          // ignore
        }
      }
    }

    // cleanup on unmount
    return () => {
      try {
        recognitionRef.current?.stop?.();
      } catch {}
    };
  }, [isVoiceMode]); // re-run when voice mode toggles

  // ----------------------------------
  // Speech synthesis helper (pauses recognition while speaking)
  // ----------------------------------
  const speak = (text: string) => {
    if (!text) return;
    const synth = synthRef.current;
    if (!synth) return;

    // Keep a lowercase trimmed copy so recognition can ignore this exact phrase
    lastSpokenTextRef.current = text.toLowerCase().trim();

    // Cancel any currently queued utterances and stop recognition to avoid hearing ourselves
    try {
      synth.cancel();
    } catch (e) {}

    try {
      recognitionRef.current?.abort?.();
    } catch (e) {}

    isSpeakingRef.current = true;
    setIsListening(false);

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = 0.95;
    utterance.pitch = 1;
    utterance.volume = 1;

    utterance.onstart = () => {
      isSpeakingRef.current = true;
      setIsListening(false);
    };

    utterance.onend = () => {
      isSpeakingRef.current = false;
      // resume recognition after a short delay if voice mode is still active
      if (isVoiceMode) {
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
            setIsListening(true);
          } catch (e) {
            // ignore start errors
          }
        }, 250);
      }
    };

    utterance.onerror = () => {
      isSpeakingRef.current = false;
      if (isVoiceMode) {
        try {
          recognitionRef.current?.start();
          setIsListening(true);
        } catch (e) {}
      }
    };

    synth.speak(utterance);
  };

  

  // ----------------------------------
  // Fetch file bytes from backend and dispatch to tab (also update lists)
  // ----------------------------------
  const fetchAndUploadFile = async (fileName: string) => {
    try {
      const url = `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`;
      console.log("🛰️ fetchAndUploadFile: requesting", url);
      const res = await fetch(url);
      if (!res.ok) {
        console.error("Download-file endpoint returned", res.status, await res.text());
        speak("Could not fetch the requested file from the server.");
        return;
      }

      const blob = await res.blob();
      console.log("🛰️ fetchAndUploadFile: fetched blob for", fileName, "size:", blob.size, "type:", blob.type);

      const file = new File([blob], fileName, { type: blob.type || "application/octet-stream" });

      // ✅ dispatch event so Tabs (AudioTab, VideoTab, ImageTab, DocumentTab) can handle an uploaded file
      window.dispatchEvent(new CustomEvent("fileUploaded", { detail: { file } }));
      console.log("🛰️ fetchAndUploadFile: dispatched fileUploaded event for", fileName);

      // ✅ dispatch a filename+url event so tabs that mount late can still react
      const serverUrl = `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`;
      window.dispatchEvent(new CustomEvent("fileSelected", { detail: { fileName, url: serverUrl } }));
      console.log("🛰️ fetchAndUploadFile: dispatched fileSelected event for", fileName, "url:", serverUrl);

      // ✅ 🔥 NEW: for document tab, also send documentReady so its state updates correctly
      const inferred = inferTabFromFilename(fileName);
      if (inferred === "document") {
        window.dispatchEvent(new CustomEvent("documentReady", { detail: { file, fileName } }));
        console.log("🛰️ fetchAndUploadFile: dispatched documentReady event for", fileName);
      }

      // Add file to allFiles and per-tab arrays if missing, so UI shows the uploaded file immediately
      setAllFiles((prev) => {
        if (!prev.includes(fileName)) return [...prev, fileName];
        return prev;
      });

      if (inferred === "audio") {
        setAudioFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
      } else if (inferred === "video") {
        setVideoFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
      } else if (inferred === "image") {
        setImageFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
      } else if (inferred === "document") {
        setDocumentFiles((prev) => (prev.includes(fileName) ? prev : [...prev, fileName]));
      }

      // Clear the filtered downloads view after a short moment
      setTimeout(() => setDownloadFiles([]), 120);

      speak(`${fileName} selected and uploaded locally.`);
    } catch (err) {
      console.error("fetchAndUploadFile error:", err);
      speak("Failed to fetch file from server.");
    }
  };




  // ----------------------------------
  // Send voice command to backend endpoint and handle response
  // ----------------------------------
  const sendVoiceCommand = async (command: string) => {
    try {
      const response = await fetch("http://127.0.0.1:8000/api/voice-command/", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command }),
      });

      const data = await response.json();
      console.log("📡 Backend response:", data);

      // backend asks to switch tab
      if (data.status && data.action === "switch_tab" && data.tab) {
        setActiveTab(data.tab as TabValue);
        speak(data.message || `Switched to ${data.tab} tab`);
        return;
      }

      // backend asked to open downloads and returned files
      if (data.status && data.action === "open_downloads" && data.files) {
        // Prefer backend-provided tab if present, else use local activeTab
        const chosenTab: TabValue | "all" = (data.tab as TabValue) || activeTab || "all";

        // Build per-tab lists and allFiles backup
        const aud: string[] = [];
        const vid: string[] = [];
        const img: string[] = [];
        const doc: string[] = [];
        const all: string[] = [];

        (data.files || []).forEach((f: string) => {
          all.push(f);
          const inferred = inferTabFromFilename(f);
          if (inferred === "audio") aud.push(f);
          else if (inferred === "video") vid.push(f);
          else if (inferred === "image") img.push(f);
          else if (inferred === "document") doc.push(f);
        });

        // Update per-tab arrays and backup
        setAudioFiles(aud);
        setVideoFiles(vid);
        setImageFiles(img);
        setDocumentFiles(doc);
        setAllFiles(all);

        // Show filtered list depending on chosenTab and speak tab-specific message
        if (chosenTab === "audio") {
          setDownloadFiles(aud);
          speak("Download folder open showing only audio files");
        } else if (chosenTab === "video") {
          setDownloadFiles(vid);
          speak("Download folder open showing only video files");
        } else if (chosenTab === "image") {
          setDownloadFiles(img);
          speak("Download folder open showing only image files");
        } else if (chosenTab === "document") {
          setDownloadFiles(doc);
          speak("Download folder open showing only document files");
        } else {
          // fallback: show all
          setDownloadFiles(all);
          speak("Download folder opened. Showing all files.");
        }
        return;
      }

      // backend says a file was uploaded/selected (server-side) — fetch it to client and dispatch locally
      if (data.status && data.action === "upload" && data.tab && data.file) {
        try {
          // set active tab to what backend says
          setActiveTab(data.tab as TabValue);
          // give UI time to mount listeners
          await wait(500);

          // fetch and dispatch file
          await fetchAndUploadFile(data.file);
        } catch (e) {
          console.error("Error handling backend upload action:", e);
          speak("There was an issue processing the uploaded file.");
        }

        // speak backend's message if any
        speak(data.message || `Selected ${data.file}`);

        // --- DEBUG: set uploadedVideo for visibility in debug UI and console (so you can trace) ---
        if (data.tab === "video") {
          console.log("🎬 Debug: backend returned upload for video:", data.file);
          setUploadedVideo(data.file);
        }
        // Also ensure lists have the file (existing logic preserved)
        if (data.tab === "audio") {
          setAudioFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
          setUploadedAudioFile(data.file);
        } else if (data.tab === "video") {
          setVideoFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
          setUploadedVideoFile(data.file);
        } else if (data.tab === "image") {
          setImageFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
          setUploadedImageFile(data.file);
        } else if (data.tab === "document") {
          setDocumentFiles((prev) => (prev.includes(data.file) ? prev : [...prev, data.file]));
          setUploadedDocumentFile(data.file);
        }

        return;
      }

      // backend request to stop assistant
      if (data.status && data.action === "stop") {
        setIsVoiceMode(false);
        setIsListening(false);
        try {
          recognitionRef.current?.stop();
        } catch {}
        synthRef.current?.cancel();
        speak(data.message || "Voice assistant stopped");
        return;
      }

      // Unknown or error message fallback
      speak(data.message || "Sorry, I didn't understand that.");
    } catch (error) {
      console.error("❌ Error sending voice command:", error);
      speak("There was an error processing your command.");
    }
  };





  // ----------------------------------
  // Handle voice commands locally (fuzzy + fuse.js)
  // ----------------------------------
  const handleVoiceCommand = async (commandRaw: string) => {
    if (!commandRaw) return;
    const command = commandRaw.toLowerCase().trim();
    console.log("🎤 Voice command received:", commandRaw);

    // Stop/exit
    if (["stop", "exit", "end"].some((c) => levenshteinRatio(c, command) > 0.8 || command.includes(c))) {
      setIsVoiceMode(false);
      setIsListening(false);
      try { recognitionRef.current?.stop(); } catch {}
      try { synthRef.current.cancel(); } catch {}
      speak("Voice assistant stopped. Microphone is off.");
      return;
    }

    
    // 1) Handle direct "upload <name>" commands with fuzzy matching
    if (downloadFiles.length > 0 && command.includes("upload")) {
      const uploadMatch = command.match(/upload\s+(.+)/i);
      if (uploadMatch) {
        const spokenName = uploadMatch[1].trim().toLowerCase();
        const matchedFile = fuzzyMatchFilename(spokenName, downloadFiles);
        if (matchedFile) {
          const inferredTab = inferTabFromFilename(matchedFile) || activeTab || "audio";
          setActiveTab(inferredTab);
          await wait(120);
          await fetchAndUploadFile(matchedFile);
          speak(`${matchedFile} uploaded successfully`);
          return;
        } else {
          speak(`I could not find ${spokenName} in your downloads`);
          return;
        }
      }
    }



    // --------------------------
    // 2) fuzzy-match command to commandSets
    // --------------------------
    let matchedKey: string | null = null;
    for (const [key, variants] of Object.entries(commandSets)) {
      for (const v of variants) {
        const score = typeof fuzzy === "function" ? fuzzy(v, command) : levenshteinRatio(v, command);
        if (score > 0.7) {
          matchedKey = key;
          break;
        }
      }
      if (matchedKey) break;
    }

    // --------------------------
    // 3) If downloads folder is open, allow picking by filename alone
    // --------------------------
    if (downloadFiles.length > 0) {
      const fuse = new Fuse(downloadFiles, { includeScore: true, threshold: 0.4, keys: [] });
      const results = fuse.search(command);
      if (results.length > 0 && results[0].score !== undefined && results[0].score < 0.6) {
        const matchedFile = results[0].item;
        const inferredTab = inferTabFromFilename(matchedFile) || activeTab || "audio";
        setActiveTab(inferredTab);
        await wait(120);
        await fetchAndUploadFile(matchedFile);
        speak(`${matchedFile} uploaded successfully`);
        return;
      }
    }

    // --------------------------
    // 4) Run / transcribe
    // --------------------------
    if (matchedKey === "run" || command.includes("start transcription")) {
      speak("Starting transcription now.");

      // general broadcast for Audio/Video/Image tabs
      window.dispatchEvent(new Event("autoTranscribe"));

      // also send voiceCommand for DocumentTab
      window.dispatchEvent(new CustomEvent("voiceCommand", { detail: "start transcription" }));
      return;
    }

    // --------------------------
    // 5) Open downloads
    // --------------------------
    if (matchedKey === "download") {
      speak("Opening your downloads folder");
      void sendVoiceCommand("open download folder");
      return;
    }

    // --------------------------
    // 6) Tab switches (local)
    // --------------------------
    if (["audio", "video", "image", "document"].includes(matchedKey || "")) {
      setActiveTab(matchedKey as TabValue);
      speak(`Switched to ${matchedKey} tab`);
      return;
    }

    // --------------------------
    // 7) Fallback: forward to backend
    // --------------------------
    const event = new CustomEvent("voiceCommand", { detail: commandRaw });
    window.dispatchEvent(event);
    void sendVoiceCommand(commandRaw);
  };



  // ----------------------------------
  // Toggle voice mode (start/stop recognition)
  // ----------------------------------
  const toggleVoiceMode = async () => {
    if (!isVoiceMode) {
      try {
        await navigator.mediaDevices.getUserMedia({ audio: true });
        setIsVoiceMode(true);
        setIsListening(true);
        speak("Voice assistant activated.");
        setTimeout(() => {
          try {
            recognitionRef.current?.start();
          } catch (e) {
            // ignore start errors
          }
        }, 500);
      } catch (err) {
        console.error("Microphone permission denied:", err);
        speak("Microphone access is required to use voice mode.");
      }
    } else {
      setIsVoiceMode(false);
      setIsListening(false);
      try {
        recognitionRef.current?.stop();
      } catch {}
      try {
        synthRef.current.cancel();
      } catch {}
      speak("Voice assistant deactivated");
    }
  };

  // ----------------------------------
  // Toggle transcript playback (speech synthesis of transcript)
  // ----------------------------------
  const toggleAudio = () => {
    const synth = synthRef.current;
    if (!synth) return;
    if (synth.speaking) {
      try {
        synth.cancel();
      } catch {}
    } else if (transcript) {
      speak(transcript);
    }
  };

  // ----------------------------------
  // When tab manually changed, clear filtered downloads view (so it will be re-opened if user asks)
  // ----------------------------------
  const handleTabChange = (tab: TabValue) => {
    setActiveTab(tab);
    setDownloadFiles([]); // clear previously filtered listing on manual tab change
  };

  // ----------------------------------
  // Render
  // ----------------------------------
  return (
    <div className="min-h-screen bg-background p-4" role="main">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <header className="mb-6 text-center">
          <h1 className="text-4xl font-bold mb-2" id="tool-title">
            Accessibility Transcription Tool
          </h1>
          <p className="text-muted-foreground mb-4" id="tool-desc">
            Supporting both manual and voice-based interactions for inclusive access
          </p>
        </header>

        {/* Control Buttons */}
        <div className="flex justify-center gap-4 mb-4" role="region" aria-label="Voice controls">
          <Button
            onClick={toggleVoiceMode}
            aria-pressed={isVoiceMode}
            aria-label={isVoiceMode ? "Stop voice assistant" : "Start voice assistant"}
            variant={isVoiceMode ? "destructive" : "outline"}
            size="lg"
            className="text-lg px-6 py-3"
          >
            {isVoiceMode ? (
              <>
                <MicOff className="mr-2 h-5 w-5" aria-hidden="true" />
                Stop Voice Assistant
              </>
            ) : (
              <>
                <Mic className="mr-2 h-5 w-5" aria-hidden="true" />
                Start Voice Assistant
              </>
            )}
          </Button>

          <Button
            onClick={toggleAudio}
            aria-label={synthRef.current?.speaking ? "Stop audio playback" : "Read transcript aloud"}
            variant="outline"
            size="lg"
            className="text-lg px-6 py-3"
          >
            {synthRef.current?.speaking ? (
              <>
                <VolumeX className="mr-2 h-5 w-5" aria-hidden="true" />
                Stop Audio
              </>
            ) : (
              <>
                <Volume2 className="mr-2 h-5 w-5" aria-hidden="true" />
                Read Transcript
              </>
            )}
          </Button>
        </div>

        {/* Voice Status */}
        {isVoiceMode && (
          <div className="text-center" role="status" aria-live="polite">
            <div
              className={`inline-flex items-center gap-2 bg-primary text-primary-foreground px-4 py-2 rounded-lg`}
            >
              <div
                className={`w-3 h-3 rounded-full ${isListening ? "bg-green-400 animate-pulse" : "bg-red-400"}`}
                aria-hidden="true"
              />
              <span>Voice Mode: {isListening ? "Listening..." : "Inactive"}</span>
            </div>
            {voiceCommand && (
              <p className="mt-2 text-sm text-muted-foreground">Last command: "{voiceCommand}"</p>
            )}
          </div>
        )}

        {/* Main Tabs */}
        <Tabs
          value={activeTab}
          onValueChange={handleTabChange}
          // onValueChange={(tab: string) => handleTabChange(tab as TabValue)}
          className="w-full"
          aria-labelledby="tool-title"
        >
          {/* <TabsList className="grid w-full grid-cols-4 h-14 text-lg" role="tablist"> */}
          <TabsList className="flex w-full flex-row h-14 text-lg space-x-2" role="tablist">

            <TabsTrigger value="audio" className="flex-1 py-3">Audio</TabsTrigger>
            <TabsTrigger value="video" className="flex-1 py-3">Video</TabsTrigger>
            <TabsTrigger value="image" className="flex-1 py-3">Image</TabsTrigger>
            <TabsTrigger value="document" className="flex-1 py-3">Document</TabsTrigger>
            <TabsTrigger value="complianceChecker" className="flex-1 py-3">Compliance Checker</TabsTrigger>
          </TabsList>

          <TabsContent value="audio" className="mt-6">
            <AudioTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
          </TabsContent>

          <TabsContent value="video" className="mt-6">
            <VideoTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
          </TabsContent>

          <TabsContent value="image" className="mt-6">
            <ImageTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
          </TabsContent>

          <TabsContent value="document" className="mt-6">
            <DocumentTab onTranscriptChange={setTranscript} isVoiceMode={isVoiceMode} />
          </TabsContent>

          <TabsContent value="complianceChecker" className="mt-6">
            <Website/>
          </TabsContent>
        </Tabs>


        {/* Instructions */}
        <Card className="mt-8" role="region" aria-labelledby="how-to-title">
          <CardHeader>
            <CardTitle id="how-to-title">How to Use</CardTitle>
            <CardDescription>
              This tool supports manual and voice-based interactions for maximum accessibility.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <h3 className="font-semibold mb-2">Manual Mode (Default)</h3>
              <p className="text-sm text-muted-foreground">
                Use buttons and file uploads to interact with the tool. Ideal for users navigating visually or with assistive devices.
              </p>
            </div>
            <div>
              <h3 className="font-semibold mb-2">Voice Mode</h3>
              <p className="text-sm text-muted-foreground">Activate voice assistant for hands-free operation. Use commands like:</p>
              <ul className="text-sm text-muted-foreground mt-2 ml-4 list-disc">
                <li>"Audio Tab" - Switch to audio processing</li>
                <li>"Video Tab" - Switch to video processing</li>
                <li>"Image Tab" - Switch to image processing</li>
                <li>"Document Tab" - Switch to document processing</li>
                <li>"Open Download Folder" - Open downloads folder</li>
                <li>"Upload george.mp3" or "Upload george" - Select file from Downloads by voice</li>
                <li>"Transcribe" / "Play" - Start processing the selected file</li>
                <li>"Exit" or "Stop" - Deactivate voice assistant</li>
              </ul>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default AccessibilityTool;