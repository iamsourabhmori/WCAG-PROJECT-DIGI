
// // AudioTab.tsx
// import React, { useState, useRef, useEffect } from "react";
// import axiosClient from "@/api/axiousClient";

// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Upload, Play, Pause, Square, Mic, StopCircle } from "lucide-react";

// const AudioTab = ({ onTranscriptChange, isVoiceMode }) => {
//   const [audioFile, setAudioFile] = useState<File | null>(null);
//   const [audioUrl, setAudioUrl] = useState("");
//   const [currentAudioSrc, setCurrentAudioSrc] = useState("");
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isTranscribing, setIsTranscribing] = useState(false);
//   const [transcript, setTranscript] = useState("");
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);

//   const audioRef = useRef<HTMLAudioElement | null>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   // Update audio src when file or URL changes
//   useEffect(() => {
//     if (audioFile) {
//       const url = URL.createObjectURL(audioFile);
//       setCurrentAudioSrc(url);
//       return () => URL.revokeObjectURL(url);
//     } else if (audioUrl) {
//       setCurrentAudioSrc(audioUrl);
//     } else {
//       setCurrentAudioSrc("");
//     }
//   }, [audioFile, audioUrl]);

//   // ✅ Connect to backend transcription API
//   const transcribeAudio = async () => {
//     if (!audioFile && !audioUrl) {
//       alert("Please upload an audio file or enter a URL");
//       return;
//     }

//     setIsTranscribing(true);
//     try {
//       let response;

//       if (audioFile) {
//         const formData = new FormData();
//         formData.append("file", audioFile);
//         formData.append("type", "audio");

//         response = await axiosClient.post("api/upload/audio/", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//       } else if (audioUrl) {
//         response = await axiosClient.post("/workflow/", {
//           input_type: "audio",
//           url: audioUrl,
//         });
//       }

//       const result = response.data.transcript || response.data.result || "No transcript returned";
//       setTranscript(result);
//       onTranscriptChange(result);
//     } catch (error: any) {
//       console.error("Audio transcription failed:", error);
//       alert("Audio transcription failed. Check backend logs.");
//     } finally {
//       setIsTranscribing(false);
//     }
//   };

//   // ✅ Speech synthesis helper
//   const speak = (text: string) => {
//     if (window.speechSynthesis && text) {
//       window.speechSynthesis.cancel();
//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.rate = 0.9;
//       window.speechSynthesis.speak(utterance);
//     }
//   };

//   const stopSpeak = () => {
//     if (window.speechSynthesis.speaking) {
//       window.speechSynthesis.cancel();
//     }
//   };

//   // ✅ Modified to announce file upload
//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith("audio/")) {
//       setAudioFile(file);
//       setAudioUrl("");

//       // Announce via speech
//       speak(`Audio file ${file.name} uploaded successfully`);
//     } else {
//       alert("Please select a valid audio file.");
//     }
//   };

//   // ✅ Modified to announce URL upload
//   const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const url = event.target.value;
//     setAudioUrl(url);
//     setAudioFile(null);

//     if (url.trim()) {
//       speak("Audio URL uploaded successfully");
//     }
//   };

//   const handlePlayPause = async () => {
//     if (!audioRef.current) return;

//     try {
//       if (isPlaying) {
//         audioRef.current.pause();
//         setIsPlaying(false);
//       } else {
//         await audioRef.current.play();
//         setIsPlaying(true);
//       }
//     } catch (err) {
//       console.error("Audio play failed:", err);
//     }
//   };

//   const handleStop = () => {
//     if (!audioRef.current) return;
//     audioRef.current.pause();
//     audioRef.current.currentTime = 0;
//     setIsPlaying(false);
//     setCurrentTime(0);
//   };

//   const handleTimeUpdate = () => {
//     if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
//   };

//   const handleLoadedMetadata = () => {
//     if (audioRef.current) setDuration(audioRef.current.duration);
//   };

//   const formatTime = (time: number) => {
//     const minutes = Math.floor(time / 60);
//     const seconds = Math.floor(time % 60);
//     return `${minutes}:${seconds.toString().padStart(2, "0")}`;
//   };

//   return (
//     <div className="space-y-6">
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Mic className="h-5 w-5" />
//             Audio Transcription
//           </CardTitle>
//           <CardDescription>
//             Upload an audio file or provide a URL to generate a transcript
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="space-y-2">
//             <Label htmlFor="audio-file">Upload Audio File</Label>
//             <div className="flex gap-2">
//               <Input
//                 id="audio-file"
//                 type="file"
//                 accept="audio/*"
//                 onChange={handleFileUpload}
//                 ref={fileInputRef}
//                 className="flex-1"
//               />
//               <Button onClick={() => fileInputRef.current?.click()} variant="outline">
//                 <Upload className="h-4 w-4 mr-2" />
//                 Browse
//               </Button>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="audio-url">Or Enter Audio URL</Label>
//             <Input
//               id="audio-url"
//               type="url"
//               placeholder="https://example.com/audio.mp3"
//               value={audioUrl}
//               onChange={handleUrlChange}
//             />
//           </div>

//           {currentAudioSrc && (
//             <div className="space-y-4">
//               <audio
//                 ref={audioRef}
//                 src={currentAudioSrc}
//                 onTimeUpdate={handleTimeUpdate}
//                 onLoadedMetadata={handleLoadedMetadata}
//                 onEnded={() => setIsPlaying(false)}
//                 className="w-full"
//               />

//               <div className="flex items-center gap-2">
//                 <Button onClick={handlePlayPause} variant="outline" size="sm">
//                   {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
//                 </Button>
//                 <Button onClick={handleStop} variant="outline" size="sm">
//                   <Square className="h-4 w-4" />
//                 </Button>
//                 <span className="text-sm text-muted-foreground">
//                   {formatTime(currentTime)} / {formatTime(duration)}
//                 </span>
//               </div>

//               <Button
//                 onClick={transcribeAudio}
//                 disabled={isTranscribing}
//                 className="w-full"
//                 size="lg"
//               >
//                 {isTranscribing ? "Transcribing..." : "Start Transcription"}
//               </Button>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {transcript && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Audio Transcript</CardTitle>
//             <CardDescription>Generated transcript from uploaded audio</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Textarea
//               value={transcript}
//               readOnly
//               className="min-h-[200px] text-sm"
//               placeholder="Transcript will appear here..."
//             />
//             <div className="mt-4 flex gap-2">
//               <Button
//                 onClick={() => navigator.clipboard.writeText(transcript)}
//                 variant="outline"
//                 size="sm"
//               >
//                 Copy Transcript
//               </Button>
//               <Button onClick={() => speak(transcript)} variant="outline" size="sm">
//                 Read Aloud
//               </Button>
//               <Button onClick={stopSpeak} variant="destructive" size="sm">
//                 <StopCircle className="h-4 w-4 mr-1" />
//                 Stop
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default AudioTab;

// //----------------------------------------------------------------------------------------------------------------------



// AudioTab.tsx(Bestest file  working for Audio transcriber)
import React, { useState, useRef, useEffect } from "react";
import axiosClient from "@/api/axiousClient";

import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Play, Pause, Square, Mic, StopCircle } from "lucide-react";

interface AudioTabProps {
  onTranscriptChange: (text: string) => void;
  isVoiceMode: boolean;
}

const AudioTab: React.FC<AudioTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const [audioUrl, setAudioUrl] = useState("");
  const [currentAudioSrc, setCurrentAudioSrc] = useState("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState("");
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const audioRef = useRef<HTMLAudioElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // Keep file URL / object URL up to date
  useEffect(() => {
    if (audioFile) {
      const url = URL.createObjectURL(audioFile);
      setCurrentAudioSrc(url);
      setSelectedFileName(audioFile.name);
      return () => {
        URL.revokeObjectURL(url);
      };
    } else if (audioUrl) {
      setCurrentAudioSrc(audioUrl);
      setSelectedFileName(null);
    } else {
      setCurrentAudioSrc("");
      setSelectedFileName(null);
    }
  }, [audioFile, audioUrl]);

  // Connect to backend transcription API
  const transcribeAudio = async () => {
    if (!audioFile && !audioUrl) {
      alert("Please upload an audio file or enter a URL");
      return;
    }

    setIsTranscribing(true);
    try {
      let response;

      if (audioFile) {
        const formData = new FormData();
        formData.append("file", audioFile);
        formData.append("type", "audio");

        response = await axiosClient.post("api/upload/audio/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (audioUrl) {
        response = await axiosClient.post("/workflow/", {
          input_type: "audio",
          url: audioUrl,
        });
      }

      const result =
        response.data.result?.transcript ||
        response.data.result ||
        response.data.transcript ||
        "No transcript returned";

      setTranscript(result);
      onTranscriptChange(result);
    } catch (error: any) {
      console.error("Audio transcription failed:", error);
      alert("Audio transcription failed. Check backend logs.");
    } finally {
      setIsTranscribing(false);
    }
  };

  // Speech synthesis helper
  const speak = (text: string) => {
    if (window.speechSynthesis && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeak = () => {
    if (window.speechSynthesis.speaking) {
      window.speechSynthesis.cancel();
    }
  };

  // Announce and set uploaded file (from manual input)
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0] || null;
    if (file) {
      if (!file.type.startsWith("audio/") && !/\.(mp3|wav|aac|flac)$/i.test(file.name)) {
        alert("Please select a valid audio file.");
        return;
      }
      setAudioFile(file);
      setAudioUrl("");
      setSelectedFileName(file.name);
      speak(`Audio file ${file.name} uploaded successfully`);
    }
  };

  // Handle a File object dispatched from AccessibilityTool (fileUploaded)
  useEffect(() => {
    const onFileUploaded = (e: any) => {
      const file: File | undefined = e?.detail?.file;
      if (file) {
        // Accept only audio files for this tab (by MIME or extension)
        if (file.type.startsWith("audio/") || /\.(mp3|wav|aac|flac)$/i.test(file.name)) {
          setAudioFile(file);
          setAudioUrl("");
          setSelectedFileName(file.name);
          speak(`Selected ${file.name}`);
        } else {
          speak(`The selected file ${file.name} is not an audio file for this tab.`);
        }
      }
    };

    const onAutoTranscribe = (e: any) => {
      // If event carries a command, handle play vs transcribe
      const cmd = e?.detail?.command?.toLowerCase() || "";
      if (cmd.includes("play")) {
        if (audioRef.current) {
          if (audioRef.current.paused) {
            audioRef.current.play();
            setIsPlaying(true);
          } else {
            audioRef.current.pause();
            setIsPlaying(false);
          }
        }
        return;
      }

      // Otherwise simply start transcription if file exists
      if (audioFile || audioUrl) {
        transcribeAudio();
      } else {
        speak("No audio file selected to transcribe.");
      }
    };

    window.addEventListener("fileUploaded", onFileUploaded);
    window.addEventListener("autoTranscribe", onAutoTranscribe as EventListener);

    return () => {
      window.removeEventListener("fileUploaded", onFileUploaded);
      window.removeEventListener("autoTranscribe", onAutoTranscribe as EventListener);
    };
  }, [audioFile, audioUrl]);

  // URL text input handler
  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setAudioUrl(url);
    setAudioFile(null);
    setSelectedFileName(null);

    if (url.trim()) {
      speak("Audio URL provided.");
    }
  };

  const handlePlayPause = async () => {
    if (!audioRef.current) return;

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        await audioRef.current.play();
        setIsPlaying(true);
      }
    } catch (err) {
      console.error("Audio play failed:", err);
    }
  };

  const handleStop = () => {
    if (!audioRef.current) return;
    audioRef.current.pause();
    audioRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
  };

  const handleTimeUpdate = () => {
    if (audioRef.current) setCurrentTime(audioRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (audioRef.current) setDuration(audioRef.current.duration || 0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Mic className="h-5 w-5" />
            Audio Transcription
          </CardTitle>
          <CardDescription>
            Upload an audio file or provide a URL to generate a transcript
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="audio-file">Upload Audio File</Label>
            <div className="flex gap-2">
              <input
                id="audio-file"
                type="file"
                accept="audio/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="flex-1 hidden"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" />
                Browse
              </Button>
              {/* show selected file name because programmatic file selection cannot fill native file input */}
              {selectedFileName && (
                <div className="ml-3 text-sm text-muted-foreground">
                  Selected file: <strong>{selectedFileName}</strong>
                </div>
              )}
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="audio-url">Or Enter Audio URL</Label>
            <Input
              id="audio-url"
              type="url"
              placeholder="https://example.com/audio.mp3"
              value={audioUrl}
              onChange={handleUrlChange}
            />
          </div>

          {currentAudioSrc && (
            <div className="space-y-4">
              <audio
                ref={audioRef}
                src={currentAudioSrc}
                onTimeUpdate={handleTimeUpdate}
                onLoadedMetadata={handleLoadedMetadata}
                onEnded={() => setIsPlaying(false)}
                className="w-full"
                controls
              />

              <div className="flex items-center gap-2">
                <Button onClick={handlePlayPause} variant="outline" size="sm">
                  {isPlaying ? <Pause className="h-4 w-4" /> : <Play className="h-4 w-4" />}
                </Button>
                <Button onClick={handleStop} variant="outline" size="sm">
                  <Square className="h-4 w-4" />
                </Button>
                <span className="text-sm text-muted-foreground">
                  {formatTime(currentTime)} / {formatTime(duration)}
                </span>
              </div>

              <Button
                onClick={transcribeAudio}
                disabled={isTranscribing}
                className="w-full"
                size="lg"
              >
                {isTranscribing ? "Transcribing..." : "Start Transcription"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Audio Transcript</CardTitle>
            <CardDescription>Generated transcript from uploaded audio</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={transcript}
              readOnly
              className="min-h-[200px] text-sm"
              placeholder="Transcript will appear here..."
            />
            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => navigator.clipboard.writeText(transcript)}
                variant="outline"
                size="sm"
              >
                Copy Transcript
              </Button>
              <Button onClick={() => speak(transcript)} variant="outline" size="sm">
                Read Aloud
              </Button>
              <Button onClick={stopSpeak} variant="destructive" size="sm">
                <StopCircle className="h-4 w-4 mr-1" />
                Stop
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AudioTab;
