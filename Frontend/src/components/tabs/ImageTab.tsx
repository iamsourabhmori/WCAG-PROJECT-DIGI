

//componets>tabs> ImageTab.tsx

// import React, { useState, useRef, useEffect } from 'react';
// import axiosClient from "@/api/axiousClient"; // Axios client
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Upload, Image, Eye, Download } from "lucide-react";

// interface ImageTabProps {
//   onTranscriptChange: (text: string) => void;
//   isVoiceMode: boolean;
// }

// const ImageTab: React.FC<ImageTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imageUrl, setImageUrl] = useState('');
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [caption, setCaption] = useState('');
  
//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   // ✅ Connect to backend image analysis API
//   const analyzeImage = async () => {
//     if (!imageFile && !imageUrl) {
//       alert('Please upload an image file or enter a URL');
//       return;
//     }

//     setIsAnalyzing(true);
//     speak('Starting image analysis and caption generation...');

//     try {
//       let response;

//       if (imageFile) {
//         const formData = new FormData();
//         formData.append("file", imageFile);
//         formData.append("type", "image");

//         response = await axiosClient.post("api/upload/image/", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//       } else {
//         response = await axiosClient.post("api/upload/image/", {
//           input_type: "image",
//           url: imageUrl,
//         });
//       }

//       const result = response.data.caption || response.data.result || "No caption returned";
//       setCaption(result);
//       onTranscriptChange(result);
//       speak('Image analysis completed. Caption generated successfully.');
//     } catch (error) {
//       console.error("Image analysis failed:", error);
//       alert("Image analysis failed. Check backend logs.");
//     } finally {
//       setIsAnalyzing(false);
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

//   // 🎙️ Handle voice commands
//   useEffect(() => {
//     const handleVoiceCommand = (event: any) => {
//       const command = event.detail;

//       if (command.includes('open download folder') || command.includes('browse files')) {
//         fileInputRef.current?.click();
//         speak('Opening file browser for image selection');
//       }

//       if (command.includes('upload') && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(command)) {
//         const match = command.match(/upload\s+([^\s]+\.(jpg|jpeg|png|gif|bmp|webp))/i);
//         if (match) {
//           speak(`Looking for image file: ${match[1]}. Please select the file from the browser dialog.`);
//           fileInputRef.current?.click();
//         }
//       }

//       if (command.includes('run image') || command.includes('analyze image') || command.includes('describe image')) {
//         if (imageFile || imageUrl) analyzeImage();
//         else speak('No image file selected. Please upload an image file first.');
//       }

//       if (command.includes('read caption')) {
//         if (caption) speak(caption);
//         else speak('No caption available. Please analyze an image first.');
//       }
//     };

//     if (isVoiceMode) {
//       window.addEventListener('voiceCommand', handleVoiceCommand);
//       return () => window.removeEventListener('voiceCommand', handleVoiceCommand);
//     }
//   }, [isVoiceMode, imageFile, imageUrl, caption]);

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith('image/')) {
//       setImageFile(file);
//       setImageUrl('');
//       speak(`Image file ${file.name} uploaded successfully.`);
//     } else {
//       speak('Please select a valid image file.');
//     }
//   };

//   const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const url = event.target.value;
//     setImageUrl(url);
//     setImageFile(null);
//   };

//   const currentImageSrc = imageFile ? URL.createObjectURL(imageFile) : imageUrl;

//   return (
//     <div className="space-y-6">
//       <Card role="region" aria-labelledby="image-transcription-title">
//         <CardHeader>
//           <CardTitle id="image-transcription-title" className="flex items-center gap-2">
//             <Image className="h-5 w-5" aria-hidden="true" />
//             Image Caption Generation
//           </CardTitle>
//           <CardDescription>
//             Upload an image file or provide a URL to generate descriptive captions
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {/* File Upload */}
//           <div className="space-y-2">
//             <Label htmlFor="image-file">Upload Image File</Label>
//             <div className="flex gap-2">
//               <Input
//                 id="image-file"
//                 type="file"
//                 accept="image/*"
//                 onChange={handleFileUpload}
//                 ref={fileInputRef}
//                 className="flex-1"
//                 aria-describedby="image-file-desc"
//               />
//               <Button
//                 onClick={() => fileInputRef.current?.click()}
//                 variant="outline"
//                 aria-label="Browse for image file"
//               >
//                 <Upload className="h-4 w-4 mr-2" aria-hidden="true" /> Browse
//               </Button>
//             </div>
//             <p id="image-file-desc" className="sr-only">
//               Choose an image file from your device to upload for caption generation
//             </p>
//           </div>

//           {/* URL Input */}
//           <div className="space-y-2">
//             <Label htmlFor="image-url">Or Enter Image URL</Label>
//             <Input
//               id="image-url"
//               type="url"
//               placeholder="https://example.com/image.jpg"
//               value={imageUrl}
//               onChange={handleUrlChange}
//               aria-describedby="image-url-desc"
//             />
//             <p id="image-url-desc" className="sr-only">
//               Enter the web address of an image to generate captions
//             </p>
//           </div>

//           {/* Preview + Analyze Button */}
//           {currentImageSrc && (
//             <div className="space-y-4">
//               <div className="w-full max-w-2xl mx-auto">
//                 <img
//                   src={currentImageSrc}
//                   alt="Preview of uploaded or linked image"
//                   className="w-full h-auto max-h-96 object-contain rounded-lg border"
//                   onLoad={() => speak('Image loaded and displayed successfully.')}
//                   onError={() => speak('Error loading image. Please check the file or URL.')}
//                 />
//               </div>

//               <div className="flex gap-2 justify-center">
//                 <Button
//                   onClick={analyzeImage}
//                   disabled={isAnalyzing}
//                   className="px-8"
//                   size="lg"
//                   aria-busy={isAnalyzing}
//                   aria-label="Start image caption generation"
//                 >
//                   <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
//                   {isAnalyzing ? 'Analyzing Image...' : 'Generate Caption'}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Caption Result */}
//       {caption && (
//         <Card role="region" aria-labelledby="image-caption-title">
//           <CardHeader>
//             <CardTitle id="image-caption-title">Image Caption</CardTitle>
//             <CardDescription>AI-generated description of the uploaded image</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Textarea
//               value={caption}
//               readOnly
//               className="min-h-[200px] text-sm"
//               placeholder="Image caption will appear here..."
//               aria-label="Generated image caption"
//             />
//             <div className="mt-4 flex gap-2 flex-wrap">
//               <Button
//                 onClick={() => navigator.clipboard.writeText(caption)}
//                 variant="outline"
//                 size="sm"
//                 aria-label="Copy caption to clipboard"
//               >
//                 Copy Caption
//               </Button>
//               <Button
//                 onClick={() => speak(caption)}
//                 variant="outline"
//                 size="sm"
//                 aria-label="Read caption aloud"
//               >
//                 Read Caption Aloud
//               </Button>
//               <Button
//                 onClick={() => {
//                   const element = document.createElement('a');
//                   const file = new Blob([caption], { type: 'text/plain' });
//                   element.href = URL.createObjectURL(file);
//                   element.download = 'image-caption.txt';
//                   document.body.appendChild(element);
//                   element.click();
//                   document.body.removeChild(element);
//                 }}
//                 variant="outline"
//                 size="sm"
//                 aria-label="Download caption as text file"
//               >
//                 <Download className="h-4 w-4 mr-2" aria-hidden="true" />
//                 Download Caption
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default ImageTab;

//-----------------------------------------------------------------------------------------------------------------------------------------------



// ImageTab.tsx(image uploaded successfully) not generated successfully

// import React, { useState, useRef, useEffect } from 'react';
// import axiosClient from "@/api/axiousClient"; // Axios client
// import { Button } from "@/components/ui/button";
// import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
// import { Input } from "@/components/ui/input";
// import { Label } from "@/components/ui/label";
// import { Textarea } from "@/components/ui/textarea";
// import { Upload, Image, Eye, Download } from "lucide-react";

// interface ImageTabProps {
//   onTranscriptChange: (text: string) => void;
//   isVoiceMode: boolean;
// }

// const ImageTab: React.FC<ImageTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
//   const [imageFile, setImageFile] = useState<File | null>(null);
//   const [imageUrl, setImageUrl] = useState('');
//   const [isAnalyzing, setIsAnalyzing] = useState(false);
//   const [caption, setCaption] = useState('');
//   const [selectedFile, setSelectedFile] = useState(''); // ✅ new state for fileSelected event

//   const fileInputRef = useRef<HTMLInputElement | null>(null);

//   // ✅ Listen for fileSelected event from AccessibilityTool
//   useEffect(() => {
//     const handleFileSelected = (e: any) => {
//       if (e.detail.fileName) {
//         setSelectedFile(e.detail.fileName);
//         setImageUrl(e.detail.fileName); // automatically set image URL to selected file
//         setImageFile(null);
//       }
//     };
//     window.addEventListener("fileSelected", handleFileSelected);
//     return () => window.removeEventListener("fileSelected", handleFileSelected);
//   }, []);

//   // ✅ Connect to backend image analysis API
//   const analyzeImage = async () => {
//     if (!imageFile && !imageUrl && !selectedFile) {
//       alert('Please upload an image file or enter a URL');
//       return;
//     }

//     setIsAnalyzing(true);
//     speak('Starting image analysis and caption generation...');

//     try {
//       let response;

//       if (imageFile) {
//         const formData = new FormData();
//         formData.append("file", imageFile);
//         formData.append("type", "image");

//         response = await axiosClient.post("api/upload/image/", formData, {
//           headers: { "Content-Type": "multipart/form-data" },
//         });
//       } else if (imageUrl || selectedFile) {
//         response = await axiosClient.post("api/upload/image/", {
//           input_type: "image",
//           url: selectedFile || imageUrl,
//         });
//       }

//       const result = response.data.caption || response.data.result || "No caption returned";
//       setCaption(result);
//       onTranscriptChange(result);
//       speak('Image analysis completed. Caption generated successfully.');
//     } catch (error) {
//       console.error("Image analysis failed:", error);
//       alert("Image analysis failed. Check backend logs.");
//     } finally {
//       setIsAnalyzing(false);
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

//   // 🎙️ Handle voice commands
//   useEffect(() => {
//     const handleVoiceCommand = (event: any) => {
//       const command = event.detail;

//       if (command.includes('open download folder') || command.includes('browse files')) {
//         fileInputRef.current?.click();
//         speak('Opening file browser for image selection');
//       }

//       if (command.includes('upload') && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(command)) {
//         const match = command.match(/upload\s+([^\s]+\.(jpg|jpeg|png|gif|bmp|webp))/i);
//         if (match) {
//           speak(`Looking for image file: ${match[1]}. Please select the file from the browser dialog.`);
//           fileInputRef.current?.click();
//         }
//       }

//       if (command.includes('run image') || command.includes('analyze image') || command.includes('describe image')) {
//         if (imageFile || imageUrl || selectedFile) analyzeImage();
//         else speak('No image file selected. Please upload an image file first.');
//       }

//       if (command.includes('read caption')) {
//         if (caption) speak(caption);
//         else speak('No caption available. Please analyze an image first.');
//       }
//     };

//     if (isVoiceMode) {
//       window.addEventListener('voiceCommand', handleVoiceCommand);
//       return () => window.removeEventListener('voiceCommand', handleVoiceCommand);
//     }
//   }, [isVoiceMode, imageFile, imageUrl, selectedFile, caption]);

//   const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const file = event.target.files?.[0];
//     if (file && file.type.startsWith('image/')) {
//       setImageFile(file);
//       setImageUrl('');
//       setSelectedFile('');
//       speak(`Image file ${file.name} uploaded successfully.`);
//     } else {
//       speak('Please select a valid image file.');
//     }
//   };

//   const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
//     const url = event.target.value;
//     setImageUrl(url);
//     setImageFile(null);
//     setSelectedFile('');
//   };

//   const currentImageSrc = imageFile ? URL.createObjectURL(imageFile) : selectedFile || imageUrl;

//   return (
//     <div className="space-y-6">
//       <Card role="region" aria-labelledby="image-transcription-title">
//         <CardHeader>
//           <CardTitle id="image-transcription-title" className="flex items-center gap-2">
//             <Image className="h-5 w-5" aria-hidden="true" />
//             Image Caption Generation
//           </CardTitle>
//           <CardDescription>
//             Upload an image file or provide a URL to generate descriptive captions
//           </CardDescription>
//         </CardHeader>
//         <CardContent className="space-y-4">
//           {/* File Upload */}
//           <div className="space-y-2">
//             <Label htmlFor="image-file">Upload Image File</Label>
//             <div className="flex gap-2">
//               <Input
//                 id="image-file"
//                 type="file"
//                 accept="image/*"
//                 onChange={handleFileUpload}
//                 ref={fileInputRef}
//                 className="flex-1"
//                 aria-describedby="image-file-desc"
//               />
//               <Button
//                 onClick={() => fileInputRef.current?.click()}
//                 variant="outline"
//                 aria-label="Browse for image file"
//               >
//                 <Upload className="h-4 w-4 mr-2" aria-hidden="true" /> Browse
//               </Button>
//             </div>
//             <p id="image-file-desc" className="sr-only">
//               Choose an image file from your device to upload for caption generation
//             </p>
//           </div>

//           {/* URL Input */}
//           <div className="space-y-2">
//             <Label htmlFor="image-url">Or Enter Image URL</Label>
//             <Input
//               id="image-url"
//               type="url"
//               placeholder="https://example.com/image.jpg"
//               value={imageUrl}
//               onChange={handleUrlChange}
//               aria-describedby="image-url-desc"
//             />
//             <p id="image-url-desc" className="sr-only">
//               Enter the web address of an image to generate captions
//             </p>
//           </div>

//           {/* Preview + Analyze Button */}
//           {currentImageSrc && (
//             <div className="space-y-4">
//               <div className="w-full max-w-2xl mx-auto">
//                 <img
//                   src={currentImageSrc}
//                   alt="Preview of uploaded or linked image"
//                   className="w-full h-auto max-h-96 object-contain rounded-lg border"
//                   onLoad={() => speak('Image displayed successfully.')}
//                   onError={() => speak('Error loading image. Please check the file or URL.')}
//                 />
//               </div>

//               <div className="flex gap-2 justify-center">
//                 <Button
//                   onClick={analyzeImage}
//                   disabled={isAnalyzing}
//                   className="px-8"
//                   size="lg"
//                   aria-busy={isAnalyzing}
//                   aria-label="Start image caption generation"
//                 >
//                   <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
//                   {isAnalyzing ? 'Analyzing Image...' : 'Generate Caption'}
//                 </Button>
//               </div>
//             </div>
//           )}
//         </CardContent>
//       </Card>

//       {/* Caption Result */}
//       {caption && (
//         <Card role="region" aria-labelledby="image-caption-title">
//           <CardHeader>
//             <CardTitle id="image-caption-title">Image Caption</CardTitle>
//             <CardDescription>AI-generated description of the uploaded image</CardDescription>
//           </CardHeader>
//           <CardContent>
//             <Textarea
//               value={caption}
//               readOnly
//               className="min-h-[200px] text-sm"
//               placeholder="Image caption will appear here..."
//               aria-label="Generated image caption"
//             />
//             <div className="mt-4 flex gap-2 flex-wrap">
//               <Button
//                 onClick={() => navigator.clipboard.writeText(caption)}
//                 variant="outline"
//                 size="sm"
//                 aria-label="Copy caption to clipboard"
//               >
//                 Copy Caption
//               </Button>
//               <Button
//                 onClick={() => speak(caption)}
//                 variant="outline"
//                 size="sm"
//                 aria-label="Read caption aloud"
//               >
//                 Read Caption Aloud
//               </Button>
//               <Button
//                 onClick={() => {
//                   const element = document.createElement('a');
//                   const file = new Blob([caption], { type: 'text/plain' });
//                   element.href = URL.createObjectURL(file);
//                   element.download = 'image-caption.txt';
//                   document.body.appendChild(element);
//                   element.click();
//                   document.body.removeChild(element);
//                 }}
//                 variant="outline"
//                 size="sm"
//                 aria-label="Download caption as text file"
//               >
//                 <Download className="h-4 w-4 mr-2" aria-hidden="true" />
//                 Download Caption
//               </Button>
//             </div>
//           </CardContent>
//         </Card>
//       )}
//     </div>
//   );
// };

// export default ImageTab;


//-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------

// ImageTab.tsx

import React, { useState, useRef, useEffect } from 'react';
import axiosClient from "@/api/axiousClient"; // Axios client
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Upload, Image, Eye, Download } from "lucide-react";

interface ImageTabProps {
  onTranscriptChange: (text: string) => void;
  isVoiceMode: boolean;
}

const ImageTab: React.FC<ImageTabProps> = ({ onTranscriptChange, isVoiceMode }) => {
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imageUrl, setImageUrl] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [caption, setCaption] = useState('');
  const [selectedFile, setSelectedFile] = useState(''); 

  const fileInputRef = useRef<HTMLInputElement | null>(null);

  // ✅ Voice-based upload event (fileSelected)
  useEffect(() => {
    const handleFileSelected = (e: any) => {
      const { fileName, url } = e.detail;
      if (fileName && url) {
        setSelectedFile(fileName);
        setImageUrl(url);  // ✅ show preview using backend URL
        setImageFile(null);
        console.log("🖼️ Voice fileSelected:", fileName, url);
      }
    };
    window.addEventListener("fileSelected", handleFileSelected);
    return () => window.removeEventListener("fileSelected", handleFileSelected);
  }, []);

  // ✅ Auto-transcription when AccessibilityTool dispatches "autoTranscribe"
  useEffect(() => {
    const handler = () => {
      if (imageFile || selectedFile || imageUrl) {
        analyzeImage();
      } else {
        console.warn("⚠️ No image file found for auto transcription.");
      }
    };
    window.addEventListener("autoTranscribe", handler);
    return () => window.removeEventListener("autoTranscribe", handler);
  }, [imageFile, selectedFile, imageUrl]);

  // ✅ Image analysis & caption generation
  const analyzeImage = async () => {
    if (!imageFile && !imageUrl && !selectedFile) {
      alert('Please upload an image file or enter a URL');
      return;
    }

    setIsAnalyzing(true);
    speak('Starting image analysis...');

    try {
      let response;

      if (imageFile) {
        const formData = new FormData();
        formData.append("file", imageFile);
        formData.append("type", "image");

        response = await axiosClient.post("api/upload/image/", formData, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      } else if (selectedFile || imageUrl) {
        // ✅ Voice-uploaded image uses backend URL, manual upload may use direct URL
        response = await axiosClient.post("api/upload/image/", {
          input_type: "image",
          url: imageUrl || `http://127.0.0.1:8000/api/download-file/?name=${selectedFile}`,
        });
      }

      const result = response.data.caption || response.data.result || "No caption returned";
      setCaption(result);
      onTranscriptChange(result);
      speak('Caption generated successfully.');
    } catch (error) {
      console.error("Image analysis failed:", error);
      alert("Image analysis failed. Check backend logs.");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const speak = (text: string) => {
    if (window.speechSynthesis && text) {
      window.speechSynthesis.cancel();
      const utterance = new SpeechSynthesisUtterance(text);
      utterance.rate = 0.9;
      window.speechSynthesis.speak(utterance);
    }
  };

  // 🎙️ Voice commands for image tab
  useEffect(() => {
    const handleVoiceCommand = (event: any) => {
      const command = event.detail;

      if (command.includes('open download folder') || command.includes('browse files')) {
        fileInputRef.current?.click();
        speak('Opening file browser for image selection');
      }

      if (command.includes('upload') && /\.(jpg|jpeg|png|gif|bmp|webp)$/i.test(command)) {
        const match = command.match(/upload\s+([^\s]+\.(jpg|jpeg|png|gif|bmp|webp))/i);
        if (match) {
          speak(`Looking for image file: ${match[1]}. Please select the file from the browser dialog.`);
          fileInputRef.current?.click();
        }
      }

      if (command.includes('run image') || command.includes('analyze image') || command.includes('describe image')) {
        if (imageFile || imageUrl || selectedFile) analyzeImage();
        else speak('No image file selected. Please upload an image file first.');
      }

      if (command.includes('read caption')) {
        if (caption) speak(caption);
        else speak('No caption available. Please analyze an image first.');
      }
    };

    if (isVoiceMode) {
      window.addEventListener('voiceCommand', handleVoiceCommand);
      return () => window.removeEventListener('voiceCommand', handleVoiceCommand);
    }
  }, [isVoiceMode, imageFile, imageUrl, selectedFile, caption]);

  // ✅ Manual file upload
  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      setImageFile(file);
      setImageUrl('');
      setSelectedFile('');
      speak(`Image file ${file.name} uploaded successfully.`);
    } else {
      speak('Please select a valid image file.');
    }
  };

  // ✅ Manual URL entry (manual only, not voice)
  const handleUrlChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const url = event.target.value;
    setImageUrl(url);
    setImageFile(null);
    setSelectedFile('');
  };

  const currentImageSrc = imageFile
    ? URL.createObjectURL(imageFile)
    : imageUrl || (selectedFile ? `http://127.0.0.1:8000/api/download-file/?name=${selectedFile}` : '');

  return (
    <div className="space-y-6">
      <Card role="region" aria-labelledby="image-transcription-title">
        <CardHeader>
          <CardTitle id="image-transcription-title" className="flex items-center gap-2">
            <Image className="h-5 w-5" aria-hidden="true" />
            Image Caption Generation
          </CardTitle>
          <CardDescription>
            Upload an image file or provide a URL to generate descriptive captions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* File Upload */}
          <div className="space-y-2">
            <Label htmlFor="image-file">Upload Image File</Label>
            <div className="flex gap-2">
              <Input
                id="image-file"
                type="file"
                accept="image/*"
                onChange={handleFileUpload}
                ref={fileInputRef}
                className="flex-1"
                aria-describedby="image-file-desc"
              />
              <Button
                onClick={() => fileInputRef.current?.click()}
                variant="outline"
                aria-label="Browse for image file"
              >
                <Upload className="h-4 w-4 mr-2" aria-hidden="true" /> Browse
              </Button>
            </div>
            <p id="image-file-desc" className="sr-only">
              Choose an image file from your device to upload for caption generation
            </p>
          </div>

          {/* URL Input (manual only) */}
          <div className="space-y-2">
            <Label htmlFor="image-url">Or Enter Image URL</Label>
            <Input
              id="image-url"
              type="url"
              placeholder="https://example.com/image.jpg"
              value={imageUrl}
              onChange={handleUrlChange}
              aria-describedby="image-url-desc"
            />
            <p id="image-url-desc" className="sr-only">
              Enter the web address of an image to generate captions
            </p>
          </div>

          {/* Preview + Analyze Button */}
          {currentImageSrc && (
            <div className="space-y-4">
              <div className="w-full max-w-2xl mx-auto">
                <img
                  src={currentImageSrc}
                  alt="Preview of uploaded or linked image"
                  className="w-full h-auto max-h-96 object-contain rounded-lg border"
                  onLoad={() => speak('Image displayed successfully.')}
                  onError={() => speak('Error loading image. Please check the file or URL.')}
                />
              </div>

              <div className="flex gap-2 justify-center">
                <Button
                  onClick={analyzeImage}
                  disabled={isAnalyzing}
                  className="px-8"
                  size="lg"
                  aria-busy={isAnalyzing}
                  aria-label="Start image caption generation"
                >
                  <Eye className="h-4 w-4 mr-2" aria-hidden="true" />
                  {isAnalyzing ? 'Analyzing Image...' : 'Generate Caption'}
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Caption Result */}
      {caption && (
        <Card role="region" aria-labelledby="image-caption-title">
          <CardHeader>
            <CardTitle id="image-caption-title">Image Caption</CardTitle>
            <CardDescription>AI-generated description of the uploaded image</CardDescription>
          </CardHeader>
          <CardContent>
            <Textarea
              value={caption}
              readOnly
              className="min-h-[200px] text-sm"
              placeholder="Image caption will appear here..."
              aria-label="Generated image caption"
            />
            <div className="mt-4 flex gap-2 flex-wrap">
              <Button
                onClick={() => navigator.clipboard.writeText(caption)}
                variant="outline"
                size="sm"
                aria-label="Copy caption to clipboard"
              >
                Copy Caption
              </Button>
              <Button
                onClick={() => speak(caption)}
                variant="outline"
                size="sm"
                aria-label="Read caption aloud"
              >
                Read Caption Aloud
              </Button>
              <Button
                onClick={() => {
                  const element = document.createElement('a');
                  const file = new Blob([caption], { type: 'text/plain' });
                  element.href = URL.createObjectURL(file);
                  element.download = 'image-caption.txt';
                  document.body.appendChild(element);
                  element.click();
                  document.body.removeChild(element);
                }}
                variant="outline"
                size="sm"
                aria-label="Download caption as text file"
              >
                <Download className="h-4 w-4 mr-2" aria-hidden="true" />
                Download Caption
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ImageTab;
