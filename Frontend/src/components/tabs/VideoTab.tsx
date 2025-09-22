
//componets>tabs> VideoTab.tsx

// import React, { useState, useRef, useEffect } from 'react';
// import axiosClient from "@/api/axiousClient"; // 👈 Add axios client
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Upload, Play, Pause, Square, Video } from "lucide-react";

// const VideoTab = ({ onTranscriptChange, isVoiceMode }) => {
//   const [videoFile, setVideoFile] = useState<File | null>(null);
//   const [videoUrl, setVideoUrl] = useState('');
//   const [currentVideoSrc, setCurrentVideoSrc] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isTranscribing, setIsTranscribing] = useState(false);
//   const [transcript, setTranscript] = useState('');
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);
  
//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   // Update video source when file or URL changes
//   useEffect(() => {
//     if (videoFile) {
//       const url = URL.createObjectURL(videoFile);
//       setCurrentVideoSrc(url);
//       return () => URL.revokeObjectURL(url);
//     } else if (videoUrl) {
//       setCurrentVideoSrc(videoUrl);
//     } else {
//       setCurrentVideoSrc('');
//     }
//   }, [videoFile, videoUrl]);

//   // ✅ Connect to backend transcription API
//   const transcribeVideo = async () => {
//     if (!videoFile && !videoUrl) {
//       alert('Please upload a video file or enter a URL');
//       return;
//     }

//     setIsTranscribing(true);
//     speak('Starting video transcription...');

//     try {
//       let response;

//       if (videoFile) {
//         const formData = new FormData();
//         formData.append("file", videoFile);
//         formData.append("type", "video"); // important for backend

//         response = await axiosClient.post("api/upload/video/", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//       } else if (videoUrl) {
//         response = await axiosClient.post("api/upload/video/", {
//           input_type: "video",
//           url: videoUrl,
//         });
//       }

//       const result = response.data.transcript || response.data.result || "No transcript returned";
//       setTranscript(result);
//       onTranscriptChange(result);
//       speak('Video transcription completed successfully.');
//     } catch (error) {
//       console.error("Video transcription failed:", error);
//       alert("Video transcription failed. Check backend logs.");
//     } finally {
//       setIsTranscribing(false);
//     }
//   };

//   const speak = (text: string) => {
//     if (window.speechSynthesis && text) {
//       window.speechSynthesis.cancel();
//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.rate = 0.9;
//       window.speechSynthesis.speak(utterance);
//     }
//   };

//   const stopSpeech = () => {
//     if (window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//     }
//   };

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith('video/')) {
//       setVideoFile(file);
//       setVideoUrl('');
//       speak(`Video file ${file.name} uploaded successfully.`);
//     } else {
//       speak('Please select a valid video file.');
//     }
//   };

//   const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     setVideoUrl(event.target.value);
//     setVideoFile(null);
//   };

//   const handlePlayPause = () => {
//     if (!videoRef.current) return;

//     if (isPlaying) {
//       videoRef.current.pause();
//       setIsPlaying(false);
//       speak('Video paused');
//     } else {
//       videoRef.current.play();
//       setIsPlaying(true);
//       speak('Video playing');
//     }
//   };

//   const handleStop = () => {
//     if (!videoRef.current) return;
//     videoRef.current.pause();
//     videoRef.current.currentTime = 0;
//     setIsPlaying(false);
//     setCurrentTime(0);
//     speak('Video stopped');
//   };

//   const handleTimeUpdate = () => {
//     if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
//   };

//   const handleLoadedMetadata = () => {
//     if (videoRef.current) setDuration(videoRef.current.duration);
//   };

//   const formatTime = (time: number) => {
//     const minutes = Math.floor(time / 60);
//     const seconds = Math.floor(time % 60);
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div className="space-y-6">
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Video className="h-5 w-5" />
//             Video Transcription
//           </CardTitle>
//           <CardDescription>
//             Upload a video file or provide a URL to extract and transcribe audio content
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="space-y-2">
//             <Label htmlFor="video-file">Upload Video File</Label>
//             <div className="flex gap-2">
//               <Input
//                 id="video-file"
//                 type="file"
//                 accept="video/*"
//                 onChange={handleFileUpload}
//                 ref={fileInputRef}
//                 className="flex-1"
//               />
//               <Button onClick={() => fileInputRef.current?.click()} variant="outline">
//                 <Upload className="h-4 w-4 mr-2" /> Browse
//               </Button>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="video-url">Or Enter Video URL</Label>
//             <Input
//               id="video-url"
//               type="url"
//               placeholder="https://example.com/video.mp4"
//               value={videoUrl}
//               onChange={handleUrlChange}
//             />
//           </div>

//           {currentVideoSrc && (
//             <div className="space-y-4">
//               <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
//                 <video
//                   ref={videoRef}
//                   src={currentVideoSrc}
//                   onTimeUpdate={handleTimeUpdate}
//                   onLoadedMetadata={handleLoadedMetadata}
//                   onEnded={() => setIsPlaying(false)}
//                   className="w-full h-full object-contain"
//                   controls
//                 />
//               </div>

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
//                 onClick={transcribeVideo}
//                 disabled={isTranscribing}
//                 className="w-full"
//                 size="lg"
//               >
//                 {isTranscribing ? 'Transcribing Video...' : 'Start Video Transcription'}
//               </Button>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {transcript && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Video Transcript</CardTitle>
//             <CardDescription>Generated transcript from the video's audio content</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Textarea
//               value={transcript}
//               readOnly
//               className="min-h-[200px] text-sm"
//               placeholder="Video transcript will appear here..."
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
//               <Button onClick={stopSpeech} variant="outline" size="sm">
//                 Stop
//               </Button>
//               <Button
//                 onClick={() => {
//                   const element = document.createElement('a');
//                   const file = new Blob([transcript], { type: 'text/plain' });
//                   element.href = URL.createObjectURL(file);
//                   element.download = 'video-transcript.txt';
//                   document.body.appendChild(element);
//                   element.click();
//                   document.body.removeChild(element);
//                 }}
//                 variant="outline"
//                 size="sm"
//               >
//                 Download Transcript
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default VideoTab;


//---------------------------------------------------------------------------------------------------------------------



//src>components>tabs>VideoTab.tsx

// import React, { useState, useRef, useEffect } from 'react';
// import axiosClient from "@/api/axiousClient"; 
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Upload, Play, Pause, Square, Video } from "lucide-react";

// const VideoTab = ({ onTranscriptChange, isVoiceMode }) => {
//   const [videoFile, setVideoFile] = useState<File | null>(null);
//   const [videoUrl, setVideoUrl] = useState('');
//   const [currentVideoSrc, setCurrentVideoSrc] = useState('');
//   const [isPlaying, setIsPlaying] = useState(false);
//   const [isTranscribing, setIsTranscribing] = useState(false);
//   const [transcript, setTranscript] = useState('');
//   const [currentTime, setCurrentTime] = useState(0);
//   const [duration, setDuration] = useState(0);
//   const [selectedFile, setSelectedFile] = useState('');

//   // ✅ List of uploaded/selected video files
//   const [videoFiles, setVideoFiles] = useState<string[]>([]);

//   // ✅ Debug uploaded file from backend
//   const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);

//   const videoRef = useRef<HTMLVideoElement | null>(null);
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   // ✅ Handle voice-uploaded files (from AccessibilityTool)
//   useEffect(() => {
//     const handleFileSelected = (e: any) => {
//       if (e.detail.fileName) {
//         const filePath = `/api/files/${e.detail.fileName}`;
//         setSelectedFile(e.detail.fileName);
//         setVideoUrl(filePath);
//         setVideoFile(null);
//         setVideoFiles((prev) => [...prev, e.detail.fileName]);

//         // 🔥 Ensure the video is actually shown on screen
//         setCurrentVideoSrc(filePath);

//         // ✅ Debug update
//         console.log("🎬 FileSelected event received:", e.detail.fileName);
//         setUploadedVideo(e.detail.fileName);
//       }
//     };

//     window.addEventListener("fileSelected", handleFileSelected);
//     return () => window.removeEventListener("fileSelected", handleFileSelected);
//   }, []);

//   // ✅ Update player when file/url changes
//   useEffect(() => {
//     if (videoFile) {
//       const url = URL.createObjectURL(videoFile);
//       setCurrentVideoSrc(url);
//       return () => URL.revokeObjectURL(url);
//     } else if (videoUrl) {
//       setCurrentVideoSrc(videoUrl);
//     } else {
//       setCurrentVideoSrc('');
//     }
//   }, [videoFile, videoUrl]);

//   // ✅ Debug uploadedVideo changes
//   useEffect(() => {
//     console.log("🎬 Current uploadedVideo state:", uploadedVideo);
//   }, [uploadedVideo]);

//   // ✅ Transcription API
//   const transcribeVideo = async () => {
//     if (!videoFile && !videoUrl && !selectedFile) {
//       alert('Please upload a video file or enter a URL');
//       return;
//     }

//     setIsTranscribing(true);
//     speak('Starting video transcription...');

//     try {
//       let response;

//       if (videoFile) {
//         const formData = new FormData();
//         formData.append("file", videoFile);
//         formData.append("type", "video");

//         response = await axiosClient.post("api/upload/video/", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//       } else if (videoUrl || selectedFile) {
//         response = await axiosClient.post("api/upload/video/", {
//           input_type: "video",
//           url: selectedFile || videoUrl,
//         });
//       }

//       const result = response.data.transcript || response.data.result || "No transcript returned";
//       setTranscript(result);
//       onTranscriptChange(result);
//       speak('Video transcription completed successfully.');
//     } catch (error) {
//       console.error("Video transcription failed:", error);
//       alert("Video transcription failed. Check backend logs.");
//     } finally {
//       setIsTranscribing(false);
//     }
//   };

//   // ✅ Speak helper
//   const speak = (text: string) => {
//     if (window.speechSynthesis && text) {
//       window.speechSynthesis.cancel();
//       const utterance = new SpeechSynthesisUtterance(text);
//       utterance.rate = 0.9;
//       window.speechSynthesis.speak(utterance);
//     }
//   };

//   const stopSpeech = () => {
//     if (window.speechSynthesis) {
//       window.speechSynthesis.cancel();
//     }
//   };

//   // ✅ Manual file upload
//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith('video/')) {
//       setVideoFile(file);
//       setVideoUrl('');
//       setSelectedFile('');
//       setVideoFiles((prev) => [...prev, file.name]);

//       const url = URL.createObjectURL(file);
//       setCurrentVideoSrc(url);

//       speak(`Video file ${file.name} uploaded successfully.`);

//       // ✅ Debug update
//       setUploadedVideo(file.name);
//     } else {
//       speak('Please select a valid video file.');
//     }
//   };

//   const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     setVideoUrl(event.target.value);
//     setVideoFile(null);
//     setSelectedFile('');
//   };

//   // ✅ Controls
//   const handlePlayPause = () => {
//     if (!videoRef.current) return;
//     if (isPlaying) {
//       videoRef.current.pause();
//       setIsPlaying(false);
//       speak('Video paused');
//     } else {
//       videoRef.current.play();
//       setIsPlaying(true);
//       speak('Video playing');
//     }
//   };

//   const handleStop = () => {
//     if (!videoRef.current) return;
//     videoRef.current.pause();
//     videoRef.current.currentTime = 0;
//     setIsPlaying(false);
//     setCurrentTime(0);
//     speak('Video stopped');
//   };

//   const handleTimeUpdate = () => {
//     if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
//   };

//   const handleLoadedMetadata = () => {
//     if (videoRef.current) setDuration(videoRef.current.duration);
//   };

//   const formatTime = (time: number) => {
//     const minutes = Math.floor(time / 60);
//     const seconds = Math.floor(time % 60);
//     return `${minutes}:${seconds.toString().padStart(2, '0')}`;
//   };

//   return (
//     <div className="space-y-6">
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <Video className="h-5 w-5" />
//             Video Transcription
//           </CardTitle>
//           <CardDescription>
//             Upload a video file or provide a URL to extract and transcribe audio content
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="space-y-2">
//             <Label htmlFor="video-file">Upload Video File</Label>
//             <div className="flex gap-2">
//               <Input
//                 id="video-file"
//                 type="file"
//                 accept="video/*"
//                 onChange={handleFileUpload}
//                 ref={fileInputRef}
//                 className="flex-1"
//               />
//               <Button onClick={() => fileInputRef.current?.click()} variant="outline">
//                 <Upload className="h-4 w-4 mr-2" /> Browse
//               </Button>
//             </div>
//           </div>

//           <div className="space-y-2">
//             <Label htmlFor="video-url">Or Enter Video URL</Label>
//             <Input
//               id="video-url"
//               type="url"
//               placeholder="https://example.com/video.mp4"
//               value={videoUrl}
//               onChange={handleUrlChange}
//             />
//           </div>

//           {/* ✅ Show uploaded/voice-selected files */}
//           {videoFiles.length > 0 && (
//             <div className="mt-4">
//               <h3 className="font-semibold mb-2">Uploaded Video Files</h3>
//               {videoFiles.map((file, index) => (
//                 <div key={index} className="file-item">
//                   🎬 {file}
//                 </div>
//               ))}
//             </div>
//           )}

//           {/* ✅ Debug video block */}
//           <div className="mt-4">
//             {uploadedVideo ? (
//               <video
//                 controls
//                 className="w-full max-h-96 rounded-lg shadow"
//                 src={`http://127.0.0.1:8000/uploads/${uploadedVideo}`}
//               >
//                 Your browser does not support the video tag.
//               </video>
//             ) : (
//               <p className="text-gray-400">No video uploaded yet.</p>
//             )}
//           </div>

//           {currentVideoSrc && (
//             <div className="space-y-4">
//               <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
//                 <video
//                   ref={videoRef}
//                   src={currentVideoSrc}
//                   onTimeUpdate={handleTimeUpdate}
//                   onLoadedMetadata={handleLoadedMetadata}
//                   onEnded={() => setIsPlaying(false)}
//                   className="w-full h-full object-contain"
//                   controls
//                 />
//               </div>

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
//                 onClick={transcribeVideo}
//                 disabled={isTranscribing}
//                 className="w-full"
//                 size="lg"
//               >
//                 {isTranscribing ? 'Transcribing Video...' : 'Start Video Transcription'}
//               </Button>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {transcript && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Video Transcript</CardTitle>
//             <CardDescription>Generated transcript from the video's audio content</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Textarea
//               value={transcript}
//               readOnly
//               className="min-h-[200px] text-sm"
//               placeholder="Video transcript will appear here..."
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
//               <Button onClick={stopSpeech} variant="outline" size="sm">
//                 Stop
//               </Button>
//               <Button
//                 onClick={() => {
//                   const element = document.createElement('a');
//                   const file = new Blob([transcript], { type: 'text/plain' });
//                   element.href = URL.createObjectURL(file);
//                   element.download = 'video-transcript.txt';
//                   document.body.appendChild(element);
//                   element.click();
//                   document.body.removeChild(element);
//                 }}
//                 variant="outline"
//                 size="sm"
//               >
//                 Download Transcript
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default VideoTab;


//---------------------------------------------------------------------------------------------------------------------------------------------------------------------



// src>components>tabs>VideoTab.tsx

import React, { useState, useRef, useEffect } from 'react';
import axiosClient from "@/api/axiousClient"; 
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Play, Pause, Square, Video } from "lucide-react";

const VideoTab = ({ onTranscriptChange, isVoiceMode }) => {
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [videoUrl, setVideoUrl] = useState('');
  const [currentVideoSrc, setCurrentVideoSrc] = useState('');
  const [isPlaying, setIsPlaying] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [selectedFile, setSelectedFile] = useState('');

  // ✅ List of uploaded/selected video files
  const [videoFiles, setVideoFiles] = useState<string[]>([]);

  // ✅ Debug uploaded file from backend
  const [uploadedVideo, setUploadedVideo] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Handle voice-uploaded files (from AccessibilityTool)
  useEffect(() => {
    const handleFileSelected = (e: any) => {
      const { fileName, url } = e.detail;
      if (fileName && url) {
        setSelectedFile(fileName);
        setVideoUrl(url);
        setVideoFile(null);
        setVideoFiles((prev) => [...prev, fileName]);

        // 🔥 Ensure the video is actually shown on screen
        setCurrentVideoSrc(url);

        // ✅ Debug update
        console.log("🎬 FileSelected event received:", fileName, url);
        setUploadedVideo(fileName);
      }
    };

    window.addEventListener("fileSelected", handleFileSelected as EventListener);
    return () => window.removeEventListener("fileSelected", handleFileSelected as EventListener);
  }, []);

  // ✅ Update player when file/url changes
  useEffect(() => {
    if (videoFile) {
      const url = URL.createObjectURL(videoFile);
      setCurrentVideoSrc(url);
      return () => URL.revokeObjectURL(url);
    } else if (videoUrl) {
      setCurrentVideoSrc(videoUrl);
    } else {
      setCurrentVideoSrc('');
    }
  }, [videoFile, videoUrl]);

  // ✅ Debug uploadedVideo changes
  useEffect(() => {
    console.log("🎬 Current uploadedVideo state:", uploadedVideo);
  }, [uploadedVideo]);


  // ✅ Auto-transcribe when voice command triggers
  useEffect(() => {
    const handler = () => {
      if (selectedFile) {
        transcribeVideo();
      } else {
        console.warn("No video file found for auto transcription.");
      }
    };

    window.addEventListener("autoTranscribe", handler);
    return () => window.removeEventListener("autoTranscribe", handler);
  }, [selectedFile]);



  // ✅ Transcription API
  // const transcribeVideo = async () => {
  //   if (!videoFile && !videoUrl && !selectedFile) {
  //     alert('Please upload a video file or enter a URL');
  //     return;
  //   }

  //   setIsTranscribing(true);
  //   speak('Starting video transcription...');

  //   try {
  //     let response;

  //     if (videoFile) {
  //       const formData = new FormData();
  //       formData.append("file", videoFile);
  //       formData.append("type", "video");

  //       response = await axiosClient.post("api/upload/video/", formData, {
  //         headers: { "Content-Type": "multipart/form-data" },
  //       });
  //     } else if (videoUrl || selectedFile) {
  //       response = await axiosClient.post("api/upload/video/", {
  //         input_type: "video",
  //         url: selectedFile || videoUrl,
  //       });
  //     }

  //     const result = response.data.transcript || response.data.result || "No transcript returned";
  //     setTranscript(result);
  //     onTranscriptChange(result);
  //     speak('Video transcription completed successfully.');
  //   } catch (error) {
  //     console.error("Video transcription failed:", error);
  //     alert("Video transcription failed. Check backend logs.");
  //   } finally {
  //     setIsTranscribing(false);
  //   }
  // };


  const transcribeVideo = async () => {
    if (!videoFile && !selectedFile) {
      alert('Please upload a video file');
      return;
    }

    setIsTranscribing(true);
    speak('Starting video transcription...');

    try {
      const formData = new FormData();

      if (videoFile) {
        formData.append("file", videoFile);
      } else if (selectedFile) {
        const response = await fetch(`http://127.0.0.1:8000/api/download-file/?name=${selectedFile}`);
        const blob = await response.blob();
        const file = new File([blob], selectedFile, { type: "video/mp4" });
        formData.append("file", file);
      }

      formData.append("type", "video");

      const response = await axiosClient.post("api/upload/video/", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });

      const result = response.data.transcript || response.data.result || "No transcript returned";
      setTranscript(result);
      onTranscriptChange(result);
      speak('Video transcription completed successfully.');
    } catch (error) {
      console.error("Video transcription failed:", error);
      alert("Video transcription failed. Check backend logs.");
    } finally {
      setIsTranscribing(false);
    }
  };



  // ✅ Speak helper
  const speak = (text: string) => {
    if (window.speechSynthesis && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  const stopSpeech = () => {
    if (window.speechSynthesis) {
      window.speechSynthesis.cancel();
    }
  };

  // ✅ Manual file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('video/')) {
      setVideoFile(file);
      setVideoUrl('');
      setSelectedFile('');
      setVideoFiles((prev) => [...prev, file.name]);

      const url = URL.createObjectURL(file);
      setCurrentVideoSrc(url);

      speak(`Video file ${file.name} uploaded successfully.`);

      // ✅ Debug update
      setUploadedVideo(file.name);
    } else {
      speak('Please select a valid video file.');
    }
  };

  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setVideoUrl(event.target.value);
    setVideoFile(null);
    setSelectedFile('');
  };

  // ✅ Controls
  const handlePlayPause = () => {
    if (!videoRef.current) return;
    if (isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
      speak('Video paused');
    } else {
      videoRef.current.play();
      setIsPlaying(true);
      speak('Video playing');
    }
  };

  const handleStop = () => {
    if (!videoRef.current) return;
    videoRef.current.pause();
    videoRef.current.currentTime = 0;
    setIsPlaying(false);
    setCurrentTime(0);
    speak('Video stopped');
  };

  const handleTimeUpdate = () => {
    if (videoRef.current) setCurrentTime(videoRef.current.currentTime);
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) setDuration(videoRef.current.duration);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Video className="h-5 w-5" />
            Video Transcription
          </CardTitle>
          <CardDescription>
            Upload a video file or provide a URL to extract and transcribe audio content
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="video-file">Upload Video File</Label>
            <div className="flex gap-2">
              <Input
                id="video-file"
                type="file"
                accept="video/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="flex-1"
              />
              <Button onClick={() => fileInputRef.current?.click()} variant="outline">
                <Upload className="h-4 w-4 mr-2" /> Browse
              </Button>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="video-url">Or Enter Video URL</Label>
            <Input
              id="video-url"
              type="url"
              placeholder="https://example.com/video.mp4"
              value={videoUrl}
              onChange={handleUrlChange}
            />
          </div>

          {/* ✅ Show uploaded/voice-selected files */}
          {videoFiles.length > 0 && (
            <div className="mt-4">
              <h3 className="font-semibold mb-2">Uploaded Video Files</h3>
              {videoFiles.map((file, index) => (
                <div key={index} className="file-item">
                  🎬 {file}
                </div>
              ))}
            </div>
          )}

          {/* ✅ Debug video block */}
          {/* <div className="mt-4">
            {uploadedVideo ? (
              <video
                controls
                className="w-full max-h-96 rounded-lg shadow"
                src={currentVideoSrc}
              >
                Your browser does not support the video tag.
              </video>
            ) : (
              <p className="text-gray-400">No video uploaded yet.</p>
            )}
          </div> */}

          {currentVideoSrc && (
            <div className="space-y-4">
              <div className="w-full aspect-video bg-muted rounded-lg overflow-hidden">
                <video
                  ref={videoRef}
                  src={currentVideoSrc}
                  onTimeUpdate={handleTimeUpdate}
                  onLoadedMetadata={handleLoadedMetadata}
                  onEnded={() => setIsPlaying(false)}
                  className="w-full h-full object-contain"
                  controls
                />
              </div>

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
                onClick={transcribeVideo}
                disabled={isTranscribing}
                className="w-full"
                size="lg"
              >
                {isTranscribing ? 'Transcribing Video...' : 'Start Video Transcription'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {transcript && (
        <Card>
          <CardHeader>
            <CardTitle>Video Transcript</CardTitle>
            <CardDescription>Generated transcript from the video's audio content</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={transcript}
              readOnly
              className="min-h-[200px] text-sm"
              placeholder="Video transcript will appear here..."
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
              <Button onClick={stopSpeech} variant="outline" size="sm">
                Stop
              </Button>
              <Button
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([transcript], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'video-transcript.txt';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                variant="outline"
                size="sm"
              >
                Download Transcript
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default VideoTab;
