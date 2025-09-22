
//----------------------------------------------------------------------------------------------------------------------------------------------------------------------


// DocumentTab.tsx
// import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Upload, FileText, Play, Pause, Square, Download } from "lucide-react";

// interface DocumentTabProps {
//   onTranscriptChange: Dispatch<SetStateAction<string>>;
//   isVoiceMode: boolean;
// }

// const DocumentTab: React.FC<DocumentTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
//   const [documentFile, setDocumentFile] = useState<File | null>(null);
//   const [documentText, setDocumentText] = useState("");
//   const [summaryText, setSummaryText] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [showTranscribeButton, setShowTranscribeButton] = useState(false);

//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [readingSpeed, setReadingSpeed] = useState(1);
//   const [selectedFile, setSelectedFile] = useState<string>(""); // ✅ for voice-uploaded file

//   const fileInputRef = useRef<HTMLInputElement | null>(null);
//   const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

//   // ✅ Listen for fileSelected event (voice-based upload)
//   useEffect(() => {
//     const handleFileSelected = (e: any) => {
//       if (e.detail.fileName) {
//         setSelectedFile(e.detail.fileName);
//         setDocumentFile(null);
//         setDocumentText("");
//         setSummaryText("");
//         setShowTranscribeButton(true);
//       }
//     };
//     window.addEventListener("fileSelected", handleFileSelected);
//     return () => window.removeEventListener("fileSelected", handleFileSelected);
//   }, []);

//   // ✅ Auto-transcribe when voice command triggers "start transcription"
//   useEffect(() => {
//     const handler = () => {
//       if (documentFile || selectedFile) {
//         handleTranscribeDocument();
//       }
//     };
//     window.addEventListener("autoTranscribeDocument", handler);
//     return () => {
//       window.removeEventListener("autoTranscribeDocument", handler);
//     };
//   }, [documentFile, selectedFile]);

//   // 🔊 Speak helper
//   const speak = (text: string) => {
//     if (!text) return;
//     window.speechSynthesis.cancel();
//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.rate = readingSpeed;
//     utteranceRef.current = utterance;

//     utterance.onend = () => {
//       setIsSpeaking(false);
//       setIsPaused(false);
//     };

//     setIsSpeaking(true);
//     setIsPaused(false);
//     window.speechSynthesis.speak(utterance);
//   };

//   const pauseSpeech = () => {
//     setIsPaused(true);
//     window.speechSynthesis.pause();
//   };

//   const resumeSpeech = () => {
//     setIsPaused(false);
//     if (window.speechSynthesis.paused) {
//       window.speechSynthesis.resume();
//     }
//   };

//   const stopSpeech = () => {
//     setIsSpeaking(false);
//     setIsPaused(false);
//     window.speechSynthesis.cancel();
//   };

//   // ✅ File upload (manual approach)
//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;

//     setDocumentFile(file);
//     setDocumentText("");
//     setSummaryText("");
//     setShowTranscribeButton(true);
//     setSelectedFile("");

//     speak(`Document file ${file.name} uploaded successfully`);
//   };

//   // ✅ Transcribe function
//   const handleTranscribeDocument = async () => {
//     if (!documentFile && !selectedFile) return;

//     setIsProcessing(true);

//     try {
//       const formData = new FormData();
//       if (documentFile) {
//         formData.append("file", documentFile);
//       }
//       formData.append("summarize", "true"); // request summary

//       const response = await fetch("http://127.0.0.1:8000/api/upload/doc/", {
//         method: "POST",
//         body: documentFile
//           ? formData
//           : JSON.stringify({ file_path: selectedFile }),
//         headers: documentFile ? {} : { "Content-Type": "application/json" },
//       });

//       if (!response.ok) throw new Error("Failed to process document");

//       const data = await response.json();
//       const docText = data.result?.document_text || "";
//       const summary = data.result?.summary_text || "";

//       setDocumentText(docText);
//       setSummaryText(summary);
//       onTranscriptChange(summary || docText);

//       setShowTranscribeButton(false);

//       speak("Document processing completed successfully");
//     } catch (err) {
//       console.error(err);
//       alert("Error processing document");
//       speak("Error processing document");
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   // ✅ Extra voice command integration
//   useEffect(() => {
//     const handleVoiceCommand = (e: any) => {
//       const command = e.detail.toLowerCase();
//       if (command.includes("transcribe")) {
//         handleTranscribeDocument();
//       } else if (command.includes("read document")) {
//         speak(documentText || summaryText);
//       }
//     };

//     window.addEventListener("voiceCommand", handleVoiceCommand);
//     return () => window.removeEventListener("voiceCommand", handleVoiceCommand);
//   }, [documentText, summaryText, readingSpeed, selectedFile]);

//   return (
//     <div className="space-y-6">
//       {/* Upload Section */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <FileText className="h-5 w-5" /> Document Processor
//           </CardTitle>
//           <CardDescription>
//             Upload a document, then click Transcribe to generate a Gemini summary.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="flex gap-2">
//             <Input
//               type="file"
//               accept=".pdf,.txt,.doc,.docx"
//               ref={fileInputRef}
//               onChange={handleFileUpload}
//               className="flex-1"
//             />
//             <Button
//               onClick={() => fileInputRef.current?.click()}
//               variant="outline"
//             >
//               <Upload className="h-4 w-4 mr-2" /> Browse
//             </Button>
//           </div>

//           {showTranscribeButton && (
//             <Button onClick={handleTranscribeDocument} disabled={isProcessing}>
//               {isProcessing ? "Processing..." : "Transcribe Document"}
//             </Button>
//           )}
//         </CardContent>
//       </Card>

//       {/* Document Text */}
//       {documentText && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Uploaded Document</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap p-4 border rounded-lg bg-muted/30">
//               {documentText}
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Summary Section */}
//       {summaryText && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Gemini Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="whitespace-pre-wrap p-4 border rounded-lg bg-muted/30">
//               {summaryText}
//             </div>

//             {/* Controls */}
//             <div className="flex items-center gap-4">
//               <Label>Speech Speed:</Label>
//               <input
//                 type="range"
//                 min={0.5}
//                 max={2}
//                 step={0.1}
//                 value={readingSpeed}
//                 onChange={(e) => setReadingSpeed(parseFloat(e.target.value))}
//               />
//               <span>{readingSpeed}x</span>
//             </div>

//             <div className="flex gap-2">
//               {!isSpeaking ? (
//                 <Button onClick={() => speak(summaryText)}>
//                   <Play className="h-4 w-4 mr-2" /> Speak Summary
//                 </Button>
//               ) : (
//                 <>
//                   {!isPaused ? (
//                     <Button onClick={pauseSpeech} variant="outline">
//                       <Pause className="h-4 w-4 mr-2" /> Pause
//                     </Button>
//                   ) : (
//                     <Button onClick={resumeSpeech}>
//                       <Play className="h-4 w-4 mr-2" /> Resume
//                     </Button>
//                   )}
//                   <Button onClick={stopSpeech} variant="destructive">
//                     <Square className="h-4 w-4 mr-2" /> Stop
//                   </Button>
//                 </>
//               )}
//             </div>

//             <div className="mt-4 flex gap-2">
//               <Button
//                 onClick={() => navigator.clipboard.writeText(summaryText)}
//                 variant="outline"
//                 size="sm"
//               >
//                 Copy Summary
//               </Button>
//               <Button
//                 onClick={() => {
//                   const element = document.createElement("a");
//                   const file = new Blob([summaryText], { type: "text/plain" });
//                   element.href = URL.createObjectURL(file);
//                   element.download = "document-summary.txt";
//                   document.body.appendChild(element);
//                   element.click();
//                   document.body.removeChild(element);
//                 }}
//                 variant="outline"
//                 size="sm"
//               >
//                 <Download className="h-4 w-4 mr-2" /> Download Summary
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default DocumentTab;


//----------------------------------------------------------------------------------------------------------------------------------------------------------------------

// DocumentTab.tsx (replace your existing file with this)

// // DocumentTab.tsx 
// import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
// import { Button } from "@/components/ui/button";
// import {
//   Card,
//   CardContent,
//   CardDescription,
//   CardHeader,
//   CardTitle,
// } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Upload, FileText, Play, Pause, Square, Download } from "lucide-react";

// interface DocumentTabProps {
//   onTranscriptChange: Dispatch<SetStateAction<string>>;
//   isVoiceMode: boolean;
// }

// const DocumentTab: React.FC<DocumentTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
//   const [documentFile, setDocumentFile] = useState<File | null>(null);
//   const [selectedFileName, setSelectedFileName] = useState<string>("");
//   const [selectedFileUrl, setSelectedFileUrl] = useState<string>("");
//   const [documentText, setDocumentText] = useState("");
//   const [summaryText, setSummaryText] = useState("");
//   const [isProcessing, setIsProcessing] = useState(false);
//   const [showTranscribeButton, setShowTranscribeButton] = useState(false);

//   const [isSpeaking, setIsSpeaking] = useState(false);
//   const [isPaused, setIsPaused] = useState(false);
//   const [readingSpeed, setReadingSpeed] = useState(1);

//   const fileInputRef = useRef<HTMLInputElement | null>(null);
//   const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

//   // Listen for fileSelected event from AccessibilityTool
//   useEffect(() => {
//     const handleFileSelected = (e: any) => {
//       const fileName = e?.detail?.fileName;
//       const url = e?.detail?.url || "";
//       if (fileName) {
//         setSelectedFileName(fileName);
//         setSelectedFileUrl(url || `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`);
//         setDocumentFile(null);
//         setDocumentText("");
//         setSummaryText("");
//         setShowTranscribeButton(true);
//       }
//     };
//     window.addEventListener("fileSelected", handleFileSelected);
//     return () => window.removeEventListener("fileSelected", handleFileSelected);
//   }, []);

//   // Speak helper
//   const speak = (text: string) => {
//     if (!text) return;
//     try {
//       window.speechSynthesis.cancel();
//     } catch {}
//     const utterance = new SpeechSynthesisUtterance(text);
//     utterance.rate = readingSpeed;
//     utteranceRef.current = utterance;

//     utterance.onend = () => {
//       setIsSpeaking(false);
//       setIsPaused(false);
//     };

//     setIsSpeaking(true);
//     setIsPaused(false);
//     window.speechSynthesis.speak(utterance);
//   };

//   const pauseSpeech = () => {
//     setIsPaused(true);
//     window.speechSynthesis.pause();
//   };

//   const resumeSpeech = () => {
//     setIsPaused(false);
//     if (window.speechSynthesis.paused) {
//       window.speechSynthesis.resume();
//     }
//   };

//   const stopSpeech = () => {
//     setIsSpeaking(false);
//     setIsPaused(false);
//     try {
//       window.speechSynthesis.cancel();
//     } catch {}
//   };

//   // File upload with voice feedback (manual upload)
//   const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
//     const file = e.target.files?.[0];
//     if (!file) return;
//     setDocumentFile(file);
//     setSelectedFileName(file.name);
//     setSelectedFileUrl("");
//     setDocumentText("");
//     setSummaryText("");
//     setShowTranscribeButton(true);
//     speak(`Document file ${file.name} uploaded successfully`);
//   };

//   // Transcribe: either send multipart (local file) or send {url: selectedFileUrl}
//   const handleTranscribeDocument = async () => {
//     if (!documentFile && !selectedFileUrl) {
//       speak("No document selected to transcribe.");
//       return;
//     }

//     setIsProcessing(true);

//     try {
//       let response: Response | null = null;

//       if (documentFile) {
//         const formData = new FormData();
//         formData.append("file", documentFile);
//         formData.append("summarize", "true");

//         response = await fetch("http://127.0.0.1:8000/api/upload/doc/", {
//           method: "POST",
//           body: formData,
//         });
//       } else {
//         // Send JSON with URL so backend fetches the file itself
//         response = await fetch("http://127.0.0.1:8000/api/upload/doc/", {
//           method: "POST",
//           headers: { "Content-Type": "application/json" },
//           body: JSON.stringify({ url: selectedFileUrl, summarize: true }),
//         });
//       }

//       if (!response.ok) {
//         const txt = await response.text();
//         throw new Error(`Server returned ${response.status}: ${txt}`);
//       }

//       const data = await response.json();
//       const docText = data.result?.document_text || "";
//       const summary = data.result?.summary_text || "";

//       setDocumentText(docText);
//       setSummaryText(summary);
//       onTranscriptChange(summary || docText);
//       setShowTranscribeButton(false);

//       speak("Document processing completed successfully");
//     } catch (err: any) {
//       console.error("Document processing error:", err);
//       speak("Error processing document");
//       alert("Error processing document: " + (err?.message || err));
//     } finally {
//       setIsProcessing(false);
//     }
//   };

//   // Voice command integration (listen to generic 'voiceCommand' event)
//   useEffect(() => {
//     const handleVoiceCommand = (e: any) => {
//       const raw = e?.detail || "";
//       const command = String(raw).toLowerCase();

//       // synonyms for starting transcription
//       const startKeywords = ["start transcription", "start transcribe", "transcribe", "transcribe document", "start transcription now", "start"];
//       if (startKeywords.some((k) => command.includes(k))) {
//         handleTranscribeDocument();
//         return;
//       }

//       if (command.includes("read document") || command.includes("read summary") || command.includes("read")) {
//         const toRead = summaryText || documentText;
//         if (toRead) speak(toRead);
//         else speak("No document content available to read.");
//         return;
//       }

//       if (command.includes("pause") && isSpeaking) {
//         pauseSpeech();
//         return;
//       }

//       if (command.includes("resume") && isSpeaking) {
//         resumeSpeech();
//         return;
//       }

//       if (command.includes("stop") && isSpeaking) {
//         stopSpeech();
//         return;
//       }
//     };

//     window.addEventListener("voiceCommand", handleVoiceCommand);
//     return () => window.removeEventListener("voiceCommand", handleVoiceCommand);
//   }, [documentText, summaryText, readingSpeed, selectedFileUrl, isSpeaking]);

//   return (
//     <div className="space-y-6">
//       {/* Upload Section */}
//       <Card>
//         <CardHeader>
//           <CardTitle className="flex items-center gap-2">
//             <FileText className="h-5 w-5" /> Document Processor
//           </CardTitle>
//           <CardDescription>
//             Upload a document, then click Transcribe to generate a Gemini summary.
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           <div className="flex gap-2">
//             <input
//               type="file"
//               accept=".pdf,.txt,.doc,.docx"
//               ref={fileInputRef}
//               onChange={handleFileUpload}
//               className="hidden"
//               id="doc-file-input"
//             />
//             <label htmlFor="doc-file-input">
//               <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
//                 <Upload className="h-4 w-4 mr-2" /> Browse
//               </Button>
//             </label>

//             <div className="flex-1">
//               {selectedFileName ? (
//                 <div>
//                   Selected file: <strong>{selectedFileName}</strong>
//                 </div>
//               ) : (
//                 <div className="text-muted-foreground">No file selected</div>
//               )}
//             </div>
//           </div>

//           {showTranscribeButton && (
//             <Button onClick={handleTranscribeDocument} disabled={isProcessing}>
//               {isProcessing ? "Processing..." : "Transcribe Document"}
//             </Button>
//           )}
//         </CardContent>
//       </Card>

//       {/* Document Preview (PDF embed if URL present) */}
//       {selectedFileUrl && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Preview</CardTitle>
//             <CardDescription>Preview of the selected document (PDF viewers may vary)</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <div className="w-full">
//               {/* Use object/iframe for PDF preview. Browser will handle content type. */}
//               <object
//                 data={selectedFileUrl}
//                 type="application/pdf"
//                 width="100%"
//                 height="600px"
//               >
//                 <p>
//                   Your browser does not support inline PDF preview.{" "}
//                   <a href={selectedFileUrl} target="_blank" rel="noreferrer">
//                     Open in new tab
//                   </a>
//                 </p>
//               </object>
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Document Text */}
//       {documentText && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Uploaded Document</CardTitle>
//           </CardHeader>
//           <CardContent>
//             <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap p-4 border rounded-lg bg-muted/30">
//               {documentText}
//             </div>
//           </CardContent>
//         </Card>
//       )}

//       {/* Summary Section */}
//       {summaryText && (
//         <Card>
//           <CardHeader>
//             <CardTitle>Gemini Summary</CardTitle>
//           </CardHeader>
//           <CardContent className="space-y-4">
//             <div className="whitespace-pre-wrap p-4 border rounded-lg bg-muted/30">
//               {summaryText}
//             </div>

//             {/* Controls */}
//             <div className="flex items-center gap-4">
//               <Label>Speech Speed:</Label>
//               <input
//                 type="range"
//                 min={0.5}
//                 max={2}
//                 step={0.1}
//                 value={readingSpeed}
//                 onChange={(e) => setReadingSpeed(parseFloat(e.target.value))}
//               />
//               <span>{readingSpeed}x</span>
//             </div>

//             <div className="flex gap-2">
//               {!isSpeaking ? (
//                 <Button onClick={() => speak(summaryText)}>
//                   <Play className="h-4 w-4 mr-2" /> Speak Summary
//                 </Button>
//               ) : (
//                 <>
//                   {!isPaused ? (
//                     <Button onClick={pauseSpeech} variant="outline">
//                       <Pause className="h-4 w-4 mr-2" /> Pause
//                     </Button>
//                   ) : (
//                     <Button onClick={resumeSpeech}>
//                       <Play className="h-4 w-4 mr-2" /> Resume
//                     </Button>
//                   )}
//                   <Button onClick={stopSpeech} variant="destructive">
//                     <Square className="h-4 w-4 mr-2" /> Stop
//                   </Button>
//                 </>
//               )}
//             </div>

//             <div className="mt-4 flex gap-2">
//               <Button
//                 onClick={() => navigator.clipboard.writeText(summaryText)}
//                 variant="outline"
//                 size="sm"
//               >
//                 Copy Summary
//               </Button>
//               <Button
//                 onClick={() => {
//                   const element = document.createElement("a");
//                   const file = new Blob([summaryText], { type: "text/plain" });
//                   element.href = URL.createObjectURL(file);
//                   element.download = "document-summary.txt";
//                   document.body.appendChild(element);
//                   element.click();
//                   document.body.removeChild(element);
//                 }}
//                 variant="outline"
//                 size="sm"
//               >
//                 <Download className="h-4 w-4 mr-2" /> Download Summary
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default DocumentTab;


//----------------------------------------------------------------------------------------------------------------------------------------------------------------------

// DocumentTab.tsx 
import React, { useState, useRef, useEffect, Dispatch, SetStateAction } from "react";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Upload, FileText, Play, Pause, Square, Download } from "lucide-react";

interface DocumentTabProps {
  onTranscriptChange: Dispatch<SetStateAction<string>>;
  isVoiceMode: boolean;
}

const DocumentTab: React.FC<DocumentTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
  const [documentFile, setDocumentFile] = useState<File | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string>("");
  const [selectedFileUrl, setSelectedFileUrl] = useState<string>("");
  const [documentText, setDocumentText] = useState("");
  const [summaryText, setSummaryText] = useState("");
  const [isProcessing, setIsProcessing] = useState(false);
  const [showTranscribeButton, setShowTranscribeButton] = useState(false);

  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [readingSpeed, setReadingSpeed] = useState(1);

  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const utteranceRef = useRef<SpeechSynthesisUtterance | null>(null);

  // Listen for fileSelected event from AccessibilityTool
  useEffect(() => {
    const handleFileSelected = (e: any) => {
      const fileName = e?.detail?.fileName;
      const url = e?.detail?.url || "";
      if (fileName) {
        setSelectedFileName(fileName);
        setSelectedFileUrl(url || `http://127.0.0.1:8000/api/download-file/?name=${encodeURIComponent(fileName)}`);
        setDocumentFile(null);
        setDocumentText("");
        setSummaryText("");
        setShowTranscribeButton(true);
      }
    };
    window.addEventListener("fileSelected", handleFileSelected);
    return () => window.removeEventListener("fileSelected", handleFileSelected);
  }, []);



  // ✅ <--- Add the new documentReady listener immediately AFTER this block
  useEffect(() => {
    const onDocumentReady = (e: any) => {
      const { file, fileName } = e.detail;
      setDocumentFile(file);
      setSelectedFileName(fileName);
      setSelectedFileUrl(""); // clear URL so we always use file
      setDocumentText("");
      setSummaryText("");
      setShowTranscribeButton(true);
      speak(`Document file ${fileName} loaded successfully via voice command`);
    };

    window.addEventListener("documentReady", onDocumentReady);
    return () => window.removeEventListener("documentReady", onDocumentReady);
  }, []);




  // Speak helper
  const speak = (text: string) => {
    if (!text) return;
    try {
      window.speechSynthesis.cancel();
    } catch {}
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = readingSpeed;
    utteranceRef.current = utterance;

    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };

    setIsSpeaking(true);
    setIsPaused(false);
    window.speechSynthesis.speak(utterance);
  };

  const pauseSpeech = () => {
    setIsPaused(true);
    window.speechSynthesis.pause();
  };

  const resumeSpeech = () => {
    setIsPaused(false);
    if (window.speechSynthesis.paused) {
      window.speechSynthesis.resume();
    }
  };

  const stopSpeech = () => {
    setIsSpeaking(false);
    setIsPaused(false);
    try {
      window.speechSynthesis.cancel();
    } catch {}
  };

  // File upload with voice feedback (manual upload)
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setDocumentFile(file);
    setSelectedFileName(file.name);
    setSelectedFileUrl("");
    setDocumentText("");
    setSummaryText("");
    setShowTranscribeButton(true);
    speak(`Document file ${file.name} uploaded successfully`);
  };

  // Transcribe: either send multipart (local file) or send {url: selectedFileUrl}
  // const handleTranscribeDocument = async () => {
  //   if (!documentFile && !selectedFileUrl) {
  //     speak("No document selected to transcribe.");
  //     return;
  //   }

  //   setIsProcessing(true);

  //   try {
  //     let response: Response | null = null;

  //     if (documentFile) {
  //       const formData = new FormData();
  //       formData.append("file", documentFile);
  //       formData.append("summarize", "true");

  //       response = await fetch("http://127.0.0.1:8000/api/upload/doc/", {
  //         method: "POST",
  //         body: formData,
  //       });
  //     } else {
  //       // Send JSON with URL so backend fetches the file itself
  //       response = await fetch("http://127.0.0.1:8000/api/upload/doc/", {
  //         method: "POST",
  //         headers: { "Content-Type": "application/json" },
  //         body: JSON.stringify({ url: selectedFileUrl, summarize: true }),
  //       });
  //     }

  //     if (!response.ok) {
  //       const txt = await response.text();
  //       throw new Error(`Server returned ${response.status}: ${txt}`);
  //     }

  //     const data = await response.json();
  //     const docText = data.result?.document_text || "";
  //     const summary = data.result?.summary_text || "";

  //     setDocumentText(docText);
  //     setSummaryText(summary);
  //     onTranscriptChange(summary || docText);
  //     setShowTranscribeButton(false);

  //     speak("Document processing completed successfully");
  //   } catch (err: any) {
  //     console.error("Document processing error:", err);
  //     speak("Error processing document");
  //     alert("Error processing document: " + (err?.message || err));
  //   } finally {
  //     setIsProcessing(false);
  //   }
  // };


  // Transcribe: always send multipart with a File
  const handleTranscribeDocument = async () => {
    if (!documentFile) {
      speak("No document selected to transcribe.");
      return;
    }

    setIsProcessing(true);

    try {
      const formData = new FormData();
      formData.append("file", documentFile);
      formData.append("summarize", "true");

      const response = await fetch("http://127.0.0.1:8000/api/upload/doc/", {
        method: "POST",
        body: formData,
      });

      if (!response.ok) {
        const txt = await response.text();
        throw new Error(`Server returned ${response.status}: ${txt}`);
      }

      const data = await response.json();
      const docText = data.result?.document_text || "";
      const summary = data.result?.summary_text || "";

      setDocumentText(docText);
      setSummaryText(summary);
      onTranscriptChange(summary || docText);
      setShowTranscribeButton(false);

      speak("Document processing completed successfully");
    } catch (err: any) {
      console.error("Document processing error:", err);
      speak("Error processing document");
      alert("Error processing document: " + (err?.message || err));
    } finally {
      setIsProcessing(false);
    }
  };




  // Voice command integration (listen to generic 'voiceCommand' event)
  useEffect(() => {
    const handleVoiceCommand = (e: any) => {
      const raw = e?.detail || "";
      const command = String(raw).toLowerCase();

      // synonyms for starting transcription
      const startKeywords = ["start transcription", "start transcribe", "transcribe", "transcribe document", "start transcription now", "start"];
      if (startKeywords.some((k) => command.includes(k))) {
        handleTranscribeDocument();
        return;
      }

      if (command.includes("read document") || command.includes("read summary") || command.includes("read")) {
        const toRead = summaryText || documentText;
        if (toRead) speak(toRead);
        else speak("No document content available to read.");
        return;
      }

      if (command.includes("pause") && isSpeaking) {
        pauseSpeech();
        return;
      }

      if (command.includes("resume") && isSpeaking) {
        resumeSpeech();
        return;
      }

      if (command.includes("stop") && isSpeaking) {
        stopSpeech();
        return;
      }
    };

    window.addEventListener("voiceCommand", handleVoiceCommand);
    return () => window.removeEventListener("voiceCommand", handleVoiceCommand);
  }, [documentText, summaryText, readingSpeed, selectedFileUrl, isSpeaking]);


  // ⬇️ Add the new one here
  useEffect(() => {
    const onAutoTranscribe = (e: any) => {
      if (documentFile || selectedFileName || selectedFileUrl) {
        handleTranscribeDocument();
      } else {
        try { window.speechSynthesis.cancel(); } catch {}
        const u = new SpeechSynthesisUtterance("No document selected to transcribe.");
        window.speechSynthesis.speak(u);
      }
    };

    window.addEventListener("autoTranscribe", onAutoTranscribe);
    return () => window.removeEventListener("autoTranscribe", onAutoTranscribe);
  }, [documentFile, selectedFileName, selectedFileUrl]);



  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Document Processor
          </CardTitle>
          <CardDescription>
            Upload a document, then click Transcribe to generate a Gemini summary.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex gap-2">
            <input
              type="file"
              accept=".pdf,.txt,.doc,.docx"
              ref={fileInputRef}
              onChange={handleFileUpload}
              className="hidden"
              id="doc-file-input"
            />
            <label htmlFor="doc-file-input">
              <Button variant="outline" onClick={() => fileInputRef.current?.click()}>
                <Upload className="h-4 w-4 mr-2" /> Browse
              </Button>
            </label>

            <div className="flex-1">
              {selectedFileName ? (
                <div>
                  Selected file: <strong>{selectedFileName}</strong>
                </div>
              ) : (
                <div className="text-muted-foreground">No file selected</div>
              )}
            </div>
          </div>

          {showTranscribeButton && (
            <Button onClick={handleTranscribeDocument} disabled={isProcessing}>
              {isProcessing ? "Processing..." : "Transcribe Document"}
            </Button>
          )}
        </CardContent>
      </Card>

      {/* Document Preview (PDF embed if URL present) */}
      {selectedFileUrl && (
        <Card>
          <CardHeader>
            <CardTitle>Preview</CardTitle>
            <CardDescription>Preview of the selected document (PDF viewers may vary)</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="w-full">
              {/* Use object/iframe for PDF preview. Browser will handle content type. */}
              <object
                data={selectedFileUrl}
                type="application/pdf"
                width="100%"
                height="600px"
              >
                <p>
                  Your browser does not support inline PDF preview.{" "}
                  <a href={selectedFileUrl} target="_blank" rel="noreferrer">
                    Open in new tab
                  </a>
                </p>
              </object>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Document Text */}
      {documentText && (
        <Card>
          <CardHeader>
            <CardTitle>Uploaded Document</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="max-h-[50vh] overflow-y-auto whitespace-pre-wrap p-4 border rounded-lg bg-muted/30">
              {documentText}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Summary Section */}
      {summaryText && (
        <Card>
          <CardHeader>
            <CardTitle>Gemini Summary</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="whitespace-pre-wrap p-4 border rounded-lg bg-muted/30">
              {summaryText}
            </div>

            {/* Controls */}
            <div className="flex items-center gap-4">
              <Label>Speech Speed:</Label>
              <input
                type="range"
                min={0.5}
                max={2}
                step={0.1}
                value={readingSpeed}
                onChange={(e) => setReadingSpeed(parseFloat(e.target.value))}
              />
              <span>{readingSpeed}x</span>
            </div>

            <div className="flex gap-2">
              {!isSpeaking ? (
                <Button onClick={() => speak(summaryText)}>
                  <Play className="h-4 w-4 mr-2" /> Speak Summary
                </Button>
              ) : (
                <>
                  {!isPaused ? (
                    <Button onClick={pauseSpeech} variant="outline">
                      <Pause className="h-4 w-4 mr-2" /> Pause
                    </Button>
                  ) : (
                    <Button onClick={resumeSpeech}>
                      <Play className="h-4 w-4 mr-2" /> Resume
                    </Button>
                  )}
                  <Button onClick={stopSpeech} variant="destructive">
                    <Square className="h-4 w-4 mr-2" /> Stop
                  </Button>
                </>
              )}
            </div>

            <div className="mt-4 flex gap-2">
              <Button
                onClick={() => navigator.clipboard.writeText(summaryText)}
                variant="outline"
                size="sm"
              >
                Copy Summary
              </Button>
              <Button
                onClick={() => {
                  const element = document.createElement("a");
                  const file = new Blob([summaryText], { type: "text/plain" });
                  element.href = URL.createObjectURL(file);
                  element.download = "document-summary.txt";
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                variant="outline"
                size="sm"
              >
                <Download className="h-4 w-4 mr-2" /> Download Summary
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DocumentTab;
