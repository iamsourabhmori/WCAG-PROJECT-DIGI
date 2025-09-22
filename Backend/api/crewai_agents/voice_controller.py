
# backend/api/crewai_agents/voice_controller.py(working for audio tab)

# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# import json, os, subprocess, platform, re

# # Import your existing agents
# from .audio_agent import process_audio_file
# from .video_agent import process_video_file
# from .image_agent import process_image_file
# from .doc_agent import process_document_file

# DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

# # Supported extensions per tab
# TAB_EXTENSIONS = {
#     "audio": [".mp3", ".wav", ".aac", ".flac"],
#     "video": [".mp4", ".avi", ".mov", ".mkv"],
#     "image": [".png", ".jpg", ".jpeg", ".gif"],
#     "document": [".pdf", ".docx", ".txt", ".csv"]
# }

# # Voice command keywords
# TAB_KEYWORDS = {
#     "audio": ["audio", "audio tab", "audio something"],
#     "video": ["video", "video tab", "video something"],
#     "image": ["image", "image tab", "image something"],
#     "document": ["doc", "document", "document tab"]
# }

# # Keep track of current tab and last uploaded file
# CURRENT_TAB = None
# LAST_UPLOADED = {
#     "audio": None,
#     "video": None,
#     "image": None,
#     "document": None,
# }

# # -------------------------
# # Open system Downloads folder
# # -------------------------
# def open_downloads_folder():
#     system = platform.system()
#     try:
#         if system == "Windows":
#             os.startfile(DOWNLOAD_DIR)
#         elif system == "Darwin":  # macOS
#             subprocess.call(["open", DOWNLOAD_DIR])
#         else:  # Linux
#             subprocess.call(["xdg-open", DOWNLOAD_DIR])
#         return True
#     except Exception as e:
#         print(f"Error opening Downloads: {e}")
#         return False

# # -------------------------
# # Extract filename from voice command
# # -------------------------
# def extract_filename(command: str):
#     """
#     Try to extract a filename (with or without extension) from the voice command.
#     """
#     # 1. Try to match filenames with explicit extensions
#     match = re.search(
#         r'([\w\-\s]+)\.(mp3|wav|aac|flac|mp4|avi|mov|mkv|png|jpg|jpeg|gif|pdf|docx|txt|csv)',
#         command,
#         re.IGNORECASE,
#     )
#     if match:
#         return match.group(0).strip()

#     # 2. If no extension provided, return raw word after "upload"
#     parts = command.split()
#     if len(parts) >= 2 and parts[0] == "upload":
#         return parts[1].strip()
#     return None

# # -------------------------
# # Helper: resolve a file in Downloads folder, optionally ignoring extension
# # -------------------------
# def resolve_file_in_downloads(name: str, tab: str):
#     """
#     Search Downloads for a file matching `name` (with or without extension),
#     and optionally filter by tab type (audio/video/image/document)
#     """
#     files = os.listdir(DOWNLOAD_DIR)
#     tab_exts = TAB_EXTENSIONS.get(tab, [])

#     # First, try exact match ignoring extension
#     for f in files:
#         if f.lower() == name.lower():
#             return os.path.join(DOWNLOAD_DIR, f)

#     # Then try match by allowed extension for the tab
#     for f in files:
#         base, ext = os.path.splitext(f)
#         if base.lower() == name.lower() and (ext.lower() in tab_exts):
#             return os.path.join(DOWNLOAD_DIR, f)

#     # Not found
#     return None

# # -------------------------
# # Determine tab by file extension
# # -------------------------
# def determine_tab_by_extension(filename: str):
#     ext = os.path.splitext(filename)[1].lower()
#     for tab, exts in TAB_EXTENSIONS.items():
#         if ext in exts:
#             return tab
#     return None

# # -------------------------
# # Main voice command endpoint
# # -------------------------
# @csrf_exempt
# def voice_command(request):
#     global CURRENT_TAB
#     if request.method != "POST":
#         return JsonResponse(
#             {"status": False, "statusCode": 405, "message": "Method Not Allowed. Use POST."},
#             status=405,
#         )

#     try:
#         data = json.loads(request.body or "{}")
#         command = data.get("command", "").lower().strip()

#         if not command:
#             return JsonResponse(
#                 {"status": False, "statusCode": 400, "message": "Missing 'command'."},
#                 status=400,
#             )

#         # -------------------------
#         # Tab switching
#         # -------------------------
#         for tab, keywords in TAB_KEYWORDS.items():
#             if any(kw in command for kw in keywords):
#                 CURRENT_TAB = tab
#                 return JsonResponse(
#                     {
#                         "status": True,
#                         "statusCode": 200,
#                         "action": "switch_tab",
#                         "tab": tab,
#                         "message": f"switched to {tab} tab",
#                     },
#                     status=200,
#                 )

#         # -------------------------
#         # Open download folder (tab-specific)
#         # -------------------------
#         if "open download" in command or "open folder" in command:
#             opened = open_downloads_folder()
#             if CURRENT_TAB:
#                 exts = TAB_EXTENSIONS.get(CURRENT_TAB, [])
#                 filtered_files = [
#                     f for f in os.listdir(DOWNLOAD_DIR) if f.lower().endswith(tuple(exts))
#                 ]
#                 message = f"Download folder opened. Showing only {CURRENT_TAB} files."
#             else:
#                 filtered_files = os.listdir(DOWNLOAD_DIR)
#                 message = "Download folder opened. Showing all files."

#             return JsonResponse(
#                 {
#                     "status": opened,
#                     "statusCode": 200 if opened else 500,
#                     "action": "open_downloads",
#                     "tab": CURRENT_TAB or "all",
#                     "files": filtered_files,
#                     "message": message,
#                 },
#                 status=200 if opened else 500,
#             )

#         # -------------------------
#         # Select / upload file by voice
#         # -------------------------
#         if "upload" in command:
#             raw_name = extract_filename(command)
#             if raw_name:
#                 # If no CURRENT_TAB, try all tabs
#                 tabs_to_check = [CURRENT_TAB] if CURRENT_TAB else ["audio","video","image","document"]
#                 file_path = None
#                 found_tab = None
#                 for tab in tabs_to_check:
#                     file_path = resolve_file_in_downloads(raw_name, tab)
#                     if file_path:
#                         found_tab = tab
#                         break

#                 # If still not found, try determining tab by extension
#                 if not file_path:
#                     for f in os.listdir(DOWNLOAD_DIR):
#                         if f.lower().startswith(raw_name.lower()):
#                             auto_tab = determine_tab_by_extension(f)
#                             if auto_tab:
#                                 file_path = os.path.join(DOWNLOAD_DIR, f)
#                                 found_tab = auto_tab
#                                 break

#                 if file_path and os.path.exists(file_path):
#                     LAST_UPLOADED[found_tab] = file_path
#                     CURRENT_TAB = found_tab
#                     return JsonResponse(
#                         {
#                             "status": True,
#                             "statusCode": 200,
#                             "action": "upload",
#                             "tab": found_tab,
#                             "file": os.path.basename(file_path),
#                             "message": f"{found_tab} file '{os.path.basename(file_path)}' uploaded successfully.",
#                         },
#                         status=200,
#                     )
#                 else:
#                     return JsonResponse(
#                         {
#                             "status": False,
#                             "statusCode": 404,
#                             "message": f"File '{raw_name}' not found in Downloads.",
#                         },
#                         status=404,
#                     )

#         # -------------------------
#         # Run / Transcribe file
#         # -------------------------
#         if ("play" in command or "transcribe" in command or "run" in command) and CURRENT_TAB:
#             last_file = LAST_UPLOADED.get(CURRENT_TAB)
#             if last_file:
#                 try:
#                     if CURRENT_TAB == "audio":
#                         process_audio_file(last_file)
#                     elif CURRENT_TAB == "video":
#                         process_video_file(last_file)
#                     elif CURRENT_TAB == "image":
#                         process_image_file(last_file)
#                     elif CURRENT_TAB == "document":
#                         process_document_file(last_file)

#                     return JsonResponse(
#                         {
#                             "status": True,
#                             "statusCode": 200,
#                             "action": "run",
#                             "tab": CURRENT_TAB,
#                             "message": f"{CURRENT_TAB} file '{os.path.basename(last_file)}' processing started.",
#                         },
#                         status=200,
#                     )
#                 except Exception as e:
#                     return JsonResponse(
#                         {
#                             "status": False,
#                             "statusCode": 500,
#                             "message": f"Processing error: {str(e)}",
#                         },
#                         status=500,
#                     )
#             else:
#                 return JsonResponse(
#                     {
#                         "status": False,
#                         "statusCode": 400,
#                         "message": f"No {CURRENT_TAB} file selected yet.",
#                     },
#                     status=400,
#                 )

#         # -------------------------
#         # Stop / exit voice assistant
#         # -------------------------
#         if "exit" in command or "stop" in command:
#             return JsonResponse(
#                 {
#                     "status": True,
#                     "statusCode": 200,
#                     "action": "stop",
#                     "message": "Voice assistant stopped.",
#                 },
#                 status=200,
#             )

#         # -------------------------
#         # Unknown command
#         # -------------------------
#         return JsonResponse(
#             {
#                 "status": False,
#                 "statusCode": 400,
#                 "action": "unknown",
#                 "message": f"Command not recognized: {command}",
#             },
#             status=400,
#         )

#     except json.JSONDecodeError:
#         return JsonResponse(
#             {"status": False, "statusCode": 400, "message": "Invalid JSON format."},
#             status=400,
#         )

#     except Exception as e:
#         return JsonResponse(
#             {"status": False, "statusCode": 500, "message": f"Internal Server Error: {str(e)}"},
#             status=500,
#         )


#--------------------------------------------------------------------------------------------------------------------------------------------------------------

# backend/api/crewai_agents/voice_controller.py(best file)

# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# import json
# import os
# import subprocess
# import platform
# import re
# import difflib
# from typing import List, Optional

# # Import your existing agents (keep these as you had them)
# from .audio_agent import process_audio_file
# from .video_agent import process_video_file
# from .image_agent import process_image_file
# from .doc_agent import process_document_file

# # -------------------------
# # Globals & Config
# # -------------------------
# DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

# TAB_EXTENSIONS = {
#     "audio": [".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"],
#     "video": [".mp4", ".avi", ".mov", ".mkv"],
#     "image": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
#     "document": [".pdf", ".docx", ".doc", ".txt", ".csv"],
# }

# # Useful phrases for switching/opening
# TAB_KEYWORDS = {
#     "audio": ["audio", "audio tab", "audio something"],
#     "video": ["video", "video tab", "video something"],
#     "image": ["image", "image tab", "image something"],
#     "document": ["doc", "document", "document tab", "document something"],
# }

# OPEN_DOWNLOAD_PHRASES = [
#     "open download folder",
#     "open downloads",
#     "open download",
#     "open down folder",
#     "open down",
#     "open folder",
#     "download",
#     "load folder",
#     "open load folder",
#     "show downloads",
#     "show download folder",
# ]

# CURRENT_TAB: Optional[str] = None  # "audio" | "video" | "image" | "document" or None
# LAST_UPLOADED = {"audio": None, "video": None, "image": None, "document": None}


# # -------------------------
# # Utilities
# # -------------------------
# def open_downloads_folder() -> bool:
#     """Open the system Downloads folder (best-effort)."""
#     try:
#         system = platform.system()
#         if system == "Windows":
#             os.startfile(DOWNLOAD_DIR)
#         elif system == "Darwin":
#             subprocess.call(["open", DOWNLOAD_DIR])
#         else:
#             subprocess.call(["xdg-open", DOWNLOAD_DIR])
#         return True
#     except Exception as e:
#         # swallow but log
#         print(f"[voice_controller] open_downloads_folder error: {e}")
#         return False


# def extract_filename(command: str) -> Optional[str]:
#     """
#     Extract a filename (with or without extension) from the voice command.
#     Handles:
#       - "upload george.mp3"
#       - "upload george mp3"  -> becomes "george.mp3"
#       - "upload george"      -> returns "george" (no extension; resolved later)
#     """
#     if not command:
#         return None
#     cmd = command.strip().lower()

#     # 1) full filename with extension (george.mp3)
#     m = re.search(
#         r'([\w\-\s]+)\.(mp3|wav|aac|flac|m4a|ogg|mp4|avi|mov|mkv|png|jpg|jpeg|gif|webp|pdf|docx|doc|txt|csv)',
#         cmd,
#         re.IGNORECASE,
#     )
#     if m:
#         return m.group(0).strip()

#     # 2) "upload speech mp4" (space before ext)
#     m2 = re.search(
#         r'upload\s+([\w\-\s]+)\s+(mp3|wav|aac|flac|m4a|ogg|mp4|avi|mov|mkv|png|jpg|jpeg|gif|webp|pdf|docx|doc|txt|csv)\b',
#         cmd,
#         re.IGNORECASE,
#     )
#     if m2:
#         base = m2.group(1).strip()
#         ext = m2.group(2).strip()
#         return f"{base}.{ext}"

#     # 3) fallback: word after upload
#     parts = cmd.split()
#     if len(parts) >= 2 and parts[0] == "upload":
#         return parts[1].strip()

#     return None


# def list_download_files() -> List[str]:
#     try:
#         return sorted(os.listdir(DOWNLOAD_DIR))
#     except Exception:
#         return []


# def file_base_name(filename: str) -> str:
#     return os.path.splitext(filename)[0].lower()


# def find_best_match_in_files(name: str, files: List[str], allowed_exts: Optional[List[str]] = None) -> Optional[str]:
#     """
#     Robust matching:
#       - If name includes extension and exactly matches a file => return
#       - Exact filename match (case-insensitive)
#       - Base name match (e.g. 'george' -> 'george.mp3')
#       - Startswith (file starts with spoken name)
#       - Substring
#       - difflib.get_close_matches fallback
#     allowed_exts: list of extensions (like ['.mp3', '.wav']) to prefer/filter.
#     """
#     if not name or not files:
#         return None

#     name_lower = name.lower()
#     # If name already looks like filename with extension, try exact match
#     for f in files:
#         if f.lower() == name_lower:
#             # enforce allowed_exts if provided
#             if allowed_exts:
#                 _, ext = os.path.splitext(f)
#                 if ext.lower() not in allowed_exts:
#                     # not allowed ext for this tab, skip
#                     continue
#             return f

#     # Gather candidates filtered by allowed_exts if provided
#     candidates = []
#     for f in files:
#         if allowed_exts:
#             _, ext = os.path.splitext(f)
#             if ext.lower() not in allowed_exts:
#                 continue
#         candidates.append(f)

#     # Base-name exact match (without extension)
#     for f in candidates:
#         if file_base_name(f) == name_lower:
#             return f

#     # startswith base
#     for f in candidates:
#         if file_base_name(f).startswith(name_lower):
#             return f

#     # substring
#     for f in candidates:
#         if name_lower in file_base_name(f):
#             return f

#     # difflib fuzzy match on base names
#     base_names = [file_base_name(f) for f in candidates]
#     close = difflib.get_close_matches(name_lower, base_names, n=1, cutoff=0.7)
#     if close:
#         matched_base = close[0]
#         # get original file
#         for f in candidates:
#             if file_base_name(f) == matched_base:
#                 return f

#     # last resort: fuzzy on full filenames (including ext)
#     full_close = difflib.get_close_matches(name_lower, [f.lower() for f in candidates], n=1, cutoff=0.6)
#     if full_close:
#         for f in candidates:
#             if f.lower() == full_close[0]:
#                 return f

#     return None


# def determine_tab_by_extension(filename: str) -> Optional[str]:
#     _, ext = os.path.splitext(filename)
#     ext = ext.lower()
#     for tab, exts in TAB_EXTENSIONS.items():
#         if ext in exts:
#             return tab
#     return None


# # -------------------------
# # Main voice command endpoint
# # -------------------------
# @csrf_exempt
# def voice_command(request):
#     """
#     POST JSON: { "command": "<spoken text>" }
#     Returns JSON with actions:
#       - switch_tab
#       - open_downloads  (files list)
#       - upload (tab, file name)
#       - run (tab)
#       - stop
#       - unknown / errors
#     """
#     global CURRENT_TAB

#     if request.method != "POST":
#         return JsonResponse({"status": False, "statusCode": 405, "message": "Method Not Allowed. Use POST."}, status=405)

#     try:
#         payload = json.loads(request.body or "{}")
#         command_raw = str(payload.get("command", "") or "")
#         command = command_raw.lower().strip()

#         if not command:
#             return JsonResponse({"status": False, "statusCode": 400, "message": "Missing 'command'."}, status=400)

#         # -------------------------
#         # Tab switching (explicit keyword)
#         # -------------------------
#         for tab, kws in TAB_KEYWORDS.items():
#             for kw in kws:
#                 if kw in command:
#                     CURRENT_TAB = tab
#                     return JsonResponse({"status": True, "statusCode": 200, "action": "switch_tab", "tab": tab, "message": f"switched to {tab} tab"}, status=200)

#         # -------------------------
#         # Open Downloads folder (many phrases)
#         # -------------------------
#         if any(phrase in command for phrase in OPEN_DOWNLOAD_PHRASES):
#             # Attempt to open the system Downloads folder (best effort)
#             opened = open_downloads_folder()
#             # If a CURRENT_TAB exists, show only files for that tab
#             if CURRENT_TAB:
#                 exts = TAB_EXTENSIONS.get(CURRENT_TAB, [])
#                 files = [f for f in list_download_files() if os.path.splitext(f)[1].lower() in exts]
#                 message = f"Download folder opened. Showing only {CURRENT_TAB} files."
#             else:
#                 files = list_download_files()
#                 message = "Download folder opened. Showing all files."

#             return JsonResponse({
#                 "status": opened,
#                 "statusCode": 200 if opened else 500,
#                 "action": "open_downloads",
#                 "tab": CURRENT_TAB or "all",
#                 "files": files,
#                 "message": message
#             }, status=200 if opened else 500)

#         # -------------------------
#         # Upload by voice
#         # -------------------------
#         if command.startswith("upload") or command.startswith("select") or "upload" in command:
#             # Extract raw filename (may be "george", "george.mp3", or "george mp3")
#             raw_name = extract_filename(command)
#             if not raw_name:
#                 return JsonResponse({"status": False, "statusCode": 400, "message": "No filename detected."}, status=400)

#             # List files once
#             files = list_download_files()

#             # If raw_name contains extension and matches file => use it
#             # Determine candidate tabs to check:
#             candidate_tabs = []
#             if CURRENT_TAB:
#                 candidate_tabs.append(CURRENT_TAB)
#             # Always check all tabs as fallback
#             candidate_tabs.extend([t for t in TAB_EXTENSIONS.keys() if t not in candidate_tabs])

#             matched_file = None
#             matched_tab = None

#             # First: if raw_name includes an extension, try to find exact filename in all files
#             if os.path.splitext(raw_name)[1]:
#                 # raw_name has extension
#                 f = find_best_match_in_files(raw_name, files, allowed_exts=None)
#                 if f:
#                     matched_file = f
#                     matched_tab = determine_tab_by_extension(f) or CURRENT_TAB
#             else:
#                 # No extension — check per-tab with allowed_exts preference
#                 for tab in candidate_tabs:
#                     exts = TAB_EXTENSIONS.get(tab, [])
#                     f = find_best_match_in_files(raw_name, files, allowed_exts=exts)
#                     if f:
#                         matched_file = f
#                         matched_tab = tab
#                         break

#                 # If still not found, do an unfiltered search (maybe name has extension not expected)
#                 if not matched_file:
#                     f = find_best_match_in_files(raw_name, files, allowed_exts=None)
#                     if f:
#                         matched_file = f
#                         matched_tab = determine_tab_by_extension(f) or CURRENT_TAB

#             if matched_file:
#                 # update internal trackers
#                 if matched_tab:
#                     LAST_UPLOADED[matched_tab] = os.path.join(DOWNLOAD_DIR, matched_file)
#                     CURRENT_TAB = matched_tab
#                 else:
#                     # if no tab inferred, try to infer
#                     inferred = determine_tab_by_extension(matched_file)
#                     if inferred:
#                         LAST_UPLOADED[inferred] = os.path.join(DOWNLOAD_DIR, matched_file)
#                         CURRENT_TAB = inferred

#                 return JsonResponse({
#                     "status": True,
#                     "statusCode": 200,
#                     "action": "upload",
#                     "tab": CURRENT_TAB or "all",
#                     "file": matched_file,
#                     "message": f"{(CURRENT_TAB or 'file')} file '{matched_file}' uploaded successfully."
#                 }, status=200)

#             # Not found
#             return JsonResponse({"status": False, "statusCode": 404, "message": f"File '{raw_name}' not found in Downloads."}, status=404)

#         # -------------------------
#         # Run / Transcribe / Play
#         # -------------------------
#         if any(k in command for k in ["play", "transcribe", "run"]) and CURRENT_TAB:
#             last_file = LAST_UPLOADED.get(CURRENT_TAB)
#             if not last_file:
#                 return JsonResponse({"status": False, "statusCode": 400, "message": f"No {CURRENT_TAB} file selected yet."}, status=400)

#             try:
#                 if CURRENT_TAB == "audio":
#                     process_audio_file(last_file)
#                 elif CURRENT_TAB == "video":
#                     process_video_file(last_file)
#                 elif CURRENT_TAB == "image":
#                     process_image_file(last_file)
#                 elif CURRENT_TAB == "document":
#                     process_document_file(last_file)

#                 return JsonResponse({"status": True, "statusCode": 200, "action": "run", "tab": CURRENT_TAB, "message": f"{CURRENT_TAB} file '{os.path.basename(last_file)}' processing started."}, status=200)
#             except Exception as e:
#                 return JsonResponse({"status": False, "statusCode": 500, "message": f"Processing error: {str(e)}"}, status=500)

#         # -------------------------
#         # Stop / Exit
#         # -------------------------
#         if "exit" in command or "stop" in command:
#             return JsonResponse({"status": True, "statusCode": 200, "action": "stop", "message": "Voice assistant stopped."}, status=200)

#         # -------------------------
#         # Unknown command
#         # -------------------------
#         return JsonResponse({"status": False, "statusCode": 400, "action": "unknown", "message": f"Command not recognized: {command}"}, status=400)

#     except json.JSONDecodeError:
#         return JsonResponse({"status": False, "statusCode": 400, "message": "Invalid JSON format."}, status=400)
#     except Exception as e:
#         return JsonResponse({"status": False, "statusCode": 500, "message": f"Internal Server Error: {str(e)}"}, status=500)


#---------------------------------------------------------------------------------------------------------------------------------------------------------

# backend/api/crewai_agents/voice_controller.py

# from django.http import JsonResponse
# from django.views.decorators.csrf import csrf_exempt
# import json
# import os
# import subprocess
# import platform
# import re
# import difflib
# from typing import List, Optional

# # Import your existing agents (keep these as you had them)
# from .audio_agent import process_audio_file
# from .video_agent import process_video_file
# from .image_agent import process_image_file
# from .doc_agent import process_document_file

# # -------------------------
# # Globals & Config
# # -------------------------
# DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

# TAB_EXTENSIONS = {
#     "audio": [".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"],
#     "video": [".mp4", ".avi", ".mov", ".mkv"],
#     "image": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
#     "document": [".pdf", ".docx", ".doc", ".txt", ".csv"],
# }

# # Useful phrases for switching/opening
# TAB_KEYWORDS = {
#     "audio": ["audio", "audio tab", "audio something"],
#     "video": ["video", "video tab", "video something"],
#     "image": ["image", "image tab", "image something"],
#     "document": ["doc", "document", "document tab", "document something"],
# }

# OPEN_DOWNLOAD_PHRASES = [
#     "open download folder",
#     "open downloads",
#     "open download",
#     "open down folder",
#     "open down",
#     "open folder",
#     "download",
#     "load folder",
#     "open load folder",
#     "show downloads",
#     "show download folder",
# ]

# CURRENT_TAB: Optional[str] = None  # "audio" | "video" | "image" | "document" or None
# LAST_UPLOADED = {"audio": None, "video": None, "image": None, "document": None}


# # -------------------------
# # Utilities
# # -------------------------
# def open_downloads_folder() -> bool:
#     """Open the system Downloads folder (best-effort)."""
#     try:
#         system = platform.system()
#         if system == "Windows":
#             os.startfile(DOWNLOAD_DIR)
#         elif system == "Darwin":
#             subprocess.call(["open", DOWNLOAD_DIR])
#         else:
#             subprocess.call(["xdg-open", DOWNLOAD_DIR])
#         return True
#     except Exception as e:
#         # swallow but log
#         print(f"[voice_controller] open_downloads_folder error: {e}")
#         return False


# def extract_filename(command: str) -> Optional[str]:
#     """
#     Extract a filename (with or without extension) from the voice command.
#     Handles:
#       - "upload george.mp3"
#       - "upload george mp3"  -> becomes "george.mp3"
#       - "upload george"      -> returns "george" (no extension; resolved later)
#     """
#     if not command:
#         return None
#     cmd = command.strip().lower()

#     # 1) full filename with extension (george.mp3)
#     m = re.search(
#         r'([\w\-\s]+)\.(mp3|wav|aac|flac|m4a|ogg|mp4|avi|mov|mkv|png|jpg|jpeg|gif|webp|pdf|docx|doc|txt|csv)',
#         cmd,
#         re.IGNORECASE,
#     )
#     if m:
#         return m.group(0).strip()

#     # 2) "upload speech mp4" (space before ext)
#     m2 = re.search(
#         r'upload\s+([\w\-\s]+)\s+(mp3|wav|aac|flac|m4a|ogg|mp4|avi|mov|mkv|png|jpg|jpeg|gif|webp|pdf|docx|doc|txt|csv)\b',
#         cmd,
#         re.IGNORECASE,
#     )
#     if m2:
#         base = m2.group(1).strip()
#         ext = m2.group(2).strip()
#         return f"{base}.{ext}"

#     # 3) fallback: word after upload
#     parts = cmd.split()
#     if len(parts) >= 2 and parts[0] == "upload":
#         return parts[1].strip()

#     return None


# def list_download_files() -> List[str]:
#     try:
#         return sorted(os.listdir(DOWNLOAD_DIR))
#     except Exception:
#         return []


# def file_base_name(filename: str) -> str:
#     return os.path.splitext(filename)[0].lower()


# def find_best_match_in_files(name: str, files: List[str], allowed_exts: Optional[List[str]] = None) -> Optional[str]:
#     """
#     Robust matching:
#       - If name includes extension and exactly matches a file => return
#       - Exact filename match (case-insensitive)
#       - Base name match (e.g. 'george' -> 'george.mp3')
#       - Startswith (file starts with spoken name)
#       - Substring
#       - difflib.get_close_matches fallback
#     allowed_exts: list of extensions (like ['.mp3', '.wav']) to prefer/filter.
#     """
#     if not name or not files:
#         return None

#     name_lower = name.lower()
#     # If name already looks like filename with extension, try exact match
#     for f in files:
#         if f.lower() == name_lower:
#             # enforce allowed_exts if provided
#             if allowed_exts:
#                 _, ext = os.path.splitext(f)
#                 if ext.lower() not in allowed_exts:
#                     # not allowed ext for this tab, skip
#                     continue
#             return f

#     # Gather candidates filtered by allowed_exts if provided
#     candidates = []
#     for f in files:
#         if allowed_exts:
#             _, ext = os.path.splitext(f)
#             if ext.lower() not in allowed_exts:
#                 continue
#         candidates.append(f)

#     # Base-name exact match (without extension)
#     for f in candidates:
#         if file_base_name(f) == name_lower:
#             return f

#     # startswith base
#     for f in candidates:
#         if file_base_name(f).startswith(name_lower):
#             return f

#     # substring
#     for f in candidates:
#         if name_lower in file_base_name(f):
#             return f

#     # difflib fuzzy match on base names
#     base_names = [file_base_name(f) for f in candidates]
#     close = difflib.get_close_matches(name_lower, base_names, n=1, cutoff=0.7)
#     if close:
#         matched_base = close[0]
#         # get original file
#         for f in candidates:
#             if file_base_name(f) == matched_base:
#                 return f

#     # last resort: fuzzy on full filenames (including ext)
#     full_close = difflib.get_close_matches(name_lower, [f.lower() for f in candidates], n=1, cutoff=0.6)
#     if full_close:
#         for f in candidates:
#             if f.lower() == full_close[0]:
#                 return f

#     return None


# def determine_tab_by_extension(filename: str) -> Optional[str]:
#     _, ext = os.path.splitext(filename)
#     ext = ext.lower()
#     for tab, exts in TAB_EXTENSIONS.items():
#         if ext in exts:
#             return tab
#     return None


# # -------------------------
# # Main voice command endpoint
# # -------------------------
# @csrf_exempt
# def voice_command(request):
#     """
#     POST JSON: { "command": "<spoken text>" }
#     Returns JSON with actions:
#       - switch_tab
#       - open_downloads  (files list)
#       - upload (tab, file name)
#       - run (tab)
#       - stop
#       - unknown / errors
#     """
#     global CURRENT_TAB

#     if request.method != "POST":
#         return JsonResponse({"status": False, "statusCode": 405, "message": "Method Not Allowed. Use POST."}, status=405)

#     try:
#         payload = json.loads(request.body or "{}")
#         command_raw = str(payload.get("command", "") or "")
#         command = command_raw.lower().strip()

#         if not command:
#             return JsonResponse({"status": False, "statusCode": 400, "message": "Missing 'command'."}, status=400)

#         # -------------------------
#         # Tab switching (explicit keyword)
#         # -------------------------
#         for tab, kws in TAB_KEYWORDS.items():
#             for kw in kws:
#                 if kw in command:
#                     CURRENT_TAB = tab
#                     return JsonResponse({"status": True, "statusCode": 200, "action": "switch_tab", "tab": tab, "message": f"switched to {tab} tab"}, status=200)

#         # -------------------------
#         # Open Downloads folder (many phrases)
#         # -------------------------
#         if any(phrase in command for phrase in OPEN_DOWNLOAD_PHRASES):
#             # Attempt to open the system Downloads folder (best effort)
#             opened = open_downloads_folder()
#             # If a CURRENT_TAB exists, show only files for that tab
#             if CURRENT_TAB:
#                 exts = TAB_EXTENSIONS.get(CURRENT_TAB, [])
#                 files = [f for f in list_download_files() if os.path.splitext(f)[1].lower() in exts]
#                 message = f"Download folder opened. Showing only {CURRENT_TAB} files."
#             else:
#                 files = list_download_files()
#                 message = "Download folder opened. Showing all files."

#             return JsonResponse({
#                 "status": opened,
#                 "statusCode": 200 if opened else 500,
#                 "action": "open_downloads",
#                 "tab": CURRENT_TAB or "all",
#                 "files": files,
#                 "message": message
#             }, status=200 if opened else 500)

#         # -------------------------
#         # Upload by voice
#         # -------------------------
#         if command.startswith("upload") or command.startswith("select") or "upload" in command:
#             # Extract raw filename (may be "george", "george.mp3", or "george mp3")
#             raw_name = extract_filename(command)
#             if not raw_name:
#                 return JsonResponse({"status": False, "statusCode": 400, "message": "No filename detected."}, status=400)

#             # List files once
#             files = list_download_files()

#             # If raw_name contains extension and matches file => use it
#             # Determine candidate tabs to check:
#             candidate_tabs = []
#             if CURRENT_TAB:
#                 candidate_tabs.append(CURRENT_TAB)
#             # Always check all tabs as fallback
#             candidate_tabs.extend([t for t in TAB_EXTENSIONS.keys() if t not in candidate_tabs])

#             matched_file = None
#             matched_tab = None

#             # First: if raw_name includes an extension, try to find exact filename in all files
#             if os.path.splitext(raw_name)[1]:
#                 # raw_name has extension
#                 f = find_best_match_in_files(raw_name, files, allowed_exts=None)
#                 if f:
#                     matched_file = f
#                     matched_tab = determine_tab_by_extension(f) or CURRENT_TAB
#             else:
#                 # No extension — check per-tab with allowed_exts preference
#                 for tab in candidate_tabs:
#                     exts = TAB_EXTENSIONS.get(tab, [])
#                     f = find_best_match_in_files(raw_name, files, allowed_exts=exts)
#                     if f:
#                         matched_file = f
#                         matched_tab = tab
#                         break

#                 # If still not found, do an unfiltered search (maybe name has extension not expected)
#                 if not matched_file:
#                     f = find_best_match_in_files(raw_name, files, allowed_exts=None)
#                     if f:
#                         matched_file = f
#                         matched_tab = determine_tab_by_extension(f) or CURRENT_TAB

#             if matched_file:
#                 # update internal trackers
#                 if matched_tab:
#                     LAST_UPLOADED[matched_tab] = os.path.join(DOWNLOAD_DIR, matched_file)
#                     CURRENT_TAB = matched_tab
#                 else:
#                     # if no tab inferred, try to infer
#                     inferred = determine_tab_by_extension(matched_file)
#                     if inferred:
#                         LAST_UPLOADED[inferred] = os.path.join(DOWNLOAD_DIR, matched_file)
#                         CURRENT_TAB = inferred

#                 return JsonResponse({
#                     "status": True,
#                     "statusCode": 200,
#                     "action": "upload",
#                     "tab": CURRENT_TAB or "all",
#                     "file": matched_file,
#                     "message": f"{(CURRENT_TAB or 'file')} file '{matched_file}' uploaded successfully."
#                 }, status=200)

#             # Not found
#             return JsonResponse({"status": False, "statusCode": 404, "message": f"File '{raw_name}' not found in Downloads."}, status=404)

#         # -------------------------
#         # Run / Transcribe / Play
#         # -------------------------
#         if any(k in command for k in ["play", "transcribe", "run"]) and CURRENT_TAB:
#             last_file = LAST_UPLOADED.get(CURRENT_TAB)
#             if not last_file:
#                 return JsonResponse({"status": False, "statusCode": 400, "message": f"No {CURRENT_TAB} file selected yet."}, status=400)

#             try:
#                 if CURRENT_TAB == "audio":
#                     process_audio_file(last_file)
#                 elif CURRENT_TAB == "video":
#                     process_video_file(last_file)
#                 elif CURRENT_TAB == "image":
#                     process_image_file(last_file)
#                 elif CURRENT_TAB == "document":
#                     process_document_file(last_file)

#                 return JsonResponse({"status": True, "statusCode": 200, "action": "run", "tab": CURRENT_TAB, "message": f"{CURRENT_TAB} file '{os.path.basename(last_file)}' processing started."}, status=200)
#             except Exception as e:
#                 return JsonResponse({"status": False, "statusCode": 500, "message": f"Processing error: {str(e)}"}, status=500)

#         # -------------------------
#         # Stop / Exit
#         # -------------------------
#         if "exit" in command or "stop" in command:
#             return JsonResponse({"status": True, "statusCode": 200, "action": "stop", "message": "Voice assistant stopped."}, status=200)

#         # -------------------------
#         # Unknown command
#         # -------------------------
#         return JsonResponse({"status": False, "statusCode": 400, "action": "unknown", "message": f"Command not recognized: {command}"}, status=400)

#     except json.JSONDecodeError:
#         return JsonResponse({"status": False, "statusCode": 400, "message": "Invalid JSON format."}, status=400)
#     except Exception as e:
#         return JsonResponse({"status": False, "statusCode": 500, "message": f"Internal Server Error: {str(e)}"}, status=500)

#----------------------------------------------------------------------------------------------------------------------------------------------------------------------

# backend/api/crewai_agents/voice_controller.py

# import requests
# from urllib.parse import urlparse



from django.http import JsonResponse, FileResponse, Http404
from django.views.decorators.csrf import csrf_exempt
import json
import os
import subprocess
import platform
import re
import difflib
from typing import List, Optional

# Import your existing agents (keep these as you had them)
from .audio_agent import process_audio_file
from .video_agent import process_video_file
from .image_agent import process_image_file
from .doc_agent import process_document_file

# -------------------------
# Globals & Config
# -------------------------
DOWNLOAD_DIR = os.path.expanduser("~/Downloads")

TAB_EXTENSIONS = {
    "audio": [".mp3", ".wav", ".aac", ".flac", ".m4a", ".ogg"],
    "video": [".mp4", ".avi", ".mov", ".mkv"],
    "image": [".png", ".jpg", ".jpeg", ".gif", ".webp"],
    "document": [".pdf", ".docx", ".doc", ".txt", ".csv"],
}

# Useful phrases for switching/opening
TAB_KEYWORDS = {
    "audio": ["audio", "audio tab", "audio something"],
    "video": ["video", "video tab", "video something"],
    "image": ["image", "image tab", "image something"],
    "document": ["doc", "document", "document tab", "document something"],
    "complianceChecker": ["compliance", "compliance checker", "checker complaint", "checker complaint checker","check","check something","comp","compliant something"],
}

OPEN_DOWNLOAD_PHRASES = [
    "open download folder",
    "open downloads",
    "open download",
    "open down folder",
    "open down",
    "open folder",
    "download",
    "load folder",
    "open load folder",
    "show downloads",
    "show download folder",
]

CURRENT_TAB: Optional[str] = None  # "audio" | "video" | "image" | "document" or None
LAST_UPLOADED = {"audio": None, "video": None, "image": None, "document": None}


# -------------------------
# Utilities
# -------------------------
def open_downloads_folder() -> bool:
    """Open the system Downloads folder (best-effort)."""
    try:
        system = platform.system()
        if system == "Windows":
            os.startfile(DOWNLOAD_DIR)
        elif system == "Darwin":
            subprocess.call(["open", DOWNLOAD_DIR])
        else:
            subprocess.call(["xdg-open", DOWNLOAD_DIR])
        return True
    except Exception as e:
        # swallow but log
        print(f"[voice_controller] open_downloads_folder error: {e}")
        return False


def extract_filename(command: str) -> Optional[str]:
    """
    Extract a filename (with or without extension) from the voice command.
    Handles:
      - "upload george.mp3"
      - "upload george mp3"  -> becomes "george.mp3"
      - "upload george"      -> returns "george" (no extension; resolved later)
    """
    if not command:
        return None
    cmd = command.strip().lower()

    # 1) full filename with extension (george.mp3)
    m = re.search(
        r'([\w\-\s]+)\.(mp3|wav|aac|flac|m4a|ogg|mp4|avi|mov|mkv|png|jpg|jpeg|gif|webp|pdf|docx|doc|txt|csv)',
        cmd,
        re.IGNORECASE,
    )
    if m:
        return m.group(0).strip()

    # 2) "upload speech mp4" (space before ext)
    m2 = re.search(
        r'upload\s+([\w\-\s]+)\s+(mp3|wav|aac|flac|m4a|ogg|mp4|avi|mov|mkv|png|jpg|jpeg|gif|webp|pdf|docx|doc|txt|csv)\b',
        cmd,
        re.IGNORECASE,
    )
    if m2:
        base = m2.group(1).strip()
        ext = m2.group(2).strip()
        return f"{base}.{ext}"

    # 3) fallback: word after upload
    parts = cmd.split()
    if len(parts) >= 2 and parts[0] == "upload":
        return parts[1].strip()

    return None


def list_download_files() -> List[str]:
    try:
        return sorted(os.listdir(DOWNLOAD_DIR))
    except Exception:
        return []


def file_base_name(filename: str) -> str:
    return os.path.splitext(filename)[0].lower()


def find_best_match_in_files(name: str, files: List[str], allowed_exts: Optional[List[str]] = None) -> Optional[str]:
    """
    Robust matching:
      - If name includes extension and exactly matches a file => return
      - Exact filename match (case-insensitive)
      - Base name match (e.g. 'george' -> 'george.mp3')
      - Startswith (file starts with spoken name)
      - Substring
      - difflib.get_close_matches fallback
    allowed_exts: list of extensions (like ['.mp3', '.wav']) to prefer/filter.
    """
    if not name or not files:
        return None

    name_lower = name.lower()
    # If name already looks like filename with extension, try exact match
    for f in files:
        if f.lower() == name_lower:
            # enforce allowed_exts if provided
            if allowed_exts:
                _, ext = os.path.splitext(f)
                if ext.lower() not in allowed_exts:
                    continue
            return f

    # Gather candidates filtered by allowed_exts if provided
    candidates = []
    for f in files:
        if allowed_exts:
            _, ext = os.path.splitext(f)
            if ext.lower() not in allowed_exts:
                continue
        candidates.append(f)

    # Base-name exact match (without extension)
    for f in candidates:
        if file_base_name(f) == name_lower:
            return f

    # startswith base
    for f in candidates:
        if file_base_name(f).startswith(name_lower):
            return f

    # substring
    for f in candidates:
        if name_lower in file_base_name(f):
            return f

    # difflib fuzzy match on base names
    base_names = [file_base_name(f) for f in candidates]
    close = difflib.get_close_matches(name_lower, base_names, n=1, cutoff=0.7)
    if close:
        matched_base = close[0]
        for f in candidates:
            if file_base_name(f) == matched_base:
                return f

    # last resort: fuzzy on full filenames
    full_close = difflib.get_close_matches(name_lower, [f.lower() for f in candidates], n=1, cutoff=0.6)
    if full_close:
        for f in candidates:
            if f.lower() == full_close[0]:
                return f

    return None


def determine_tab_by_extension(filename: str) -> Optional[str]:
    _, ext = os.path.splitext(filename)
    ext = ext.lower()
    for tab, exts in TAB_EXTENSIONS.items():
        if ext in exts:
            return tab
    return None


# -------------------------
# ✅ Download file endpoint
# -------------------------
@csrf_exempt
def download_file(request):
    file_name = request.GET.get("name")
    file_path = os.path.join("uploads", file_name)   # 👈 make sure uploads/ ka path sahi hai

    if not os.path.exists(file_path):
        raise Http404("File not found")

    # Send file as proper response
    response = FileResponse(open(file_path, "rb"), content_type="video/mp4")
    response["Access-Control-Allow-Origin"] = "*"   # ✅ Fix CORS
    return response


# -------------------------
# Main voice command endpoint
# -------------------------
@csrf_exempt
def voice_command(request):
    """
    POST JSON: { "command": "<spoken text>" }
    Returns JSON with actions:
      - switch_tab
      - open_downloads  (files list)
      - upload (tab, file name)
      - run (tab)
      - stop
      - unknown / errors
    """
    global CURRENT_TAB

    if request.method != "POST":
        return JsonResponse({"status": False, "statusCode": 405, "message": "Method Not Allowed. Use POST."}, status=405)

    try:
        payload = json.loads(request.body or "{}")
        command_raw = str(payload.get("command", "") or "")
        command = command_raw.lower().strip()



        # -------------------------
        # Manual audio URL upload
        # -------------------------
        # audio_url = payload.get("audio_url")
        # if audio_url:
        #     try:
        #         tmp_local = os.path.join(DOWNLOAD_DIR, os.path.basename(urlparse(audio_url).path))
        #         r = requests.get(audio_url, stream=True)
        #         if r.status_code == 200:
        #             with open(tmp_local, "wb") as f:
        #                 for chunk in r.iter_content(1024):
        #                     f.write(chunk)

        #             # Update last uploaded and current tab
        #             LAST_UPLOADED["audio"] = tmp_local
        #             CURRENT_TAB = "audio"

        #             # ✅ Trigger transcription immediately
        #             try:
        #                 process_audio_file(tmp_local)
        #             except Exception as e:
        #                 return JsonResponse({
        #                     "status": False,
        #                     "statusCode": 500,
        #                     "message": f"Audio processing error: {str(e)}"
        #                 }, status=500)

        #             return JsonResponse({
        #                 "status": True,
        #                 "statusCode": 200,
        #                 "action": "upload",
        #                 "tab": "audio",
        #                 "file": os.path.basename(tmp_local),
        #                 "message": f"Audio URL uploaded and processing started successfully."
        #             }, status=200)
        #         else:
        #             return JsonResponse({
        #                 "status": False,
        #                 "statusCode": 400,
        #                 "message": f"Failed to download audio URL: {audio_url}"
        #             }, status=400)
        #     except Exception as e:
        #         return JsonResponse({
        #             "status": False,
        #             "statusCode": 500,
        #             "message": f"Error downloading audio URL: {str(e)}"
        #         }, status=500)









        if not command:
            return JsonResponse({"status": False, "statusCode": 400, "message": "Missing 'command'."}, status=400)

        # -------------------------
        # Tab switching
        # -------------------------
        for tab, kws in TAB_KEYWORDS.items():
            for kw in kws:
                if kw in command:
                    CURRENT_TAB = tab
                    return JsonResponse({"status": True, "statusCode": 200, "action": "switch_tab", "tab": tab, "message": f"switched to {tab} tab"}, status=200)


        # -------------------------
        # Custom command mappings (insert here)
        # -------------------------
        if "compliance" in command:
            CURRENT_TAB = "complianceChecker"   # Must match frontend tab value
            return JsonResponse({
                "status": True,
                "statusCode": 200,
                "action": "switch_tab",
                "tab": CURRENT_TAB,
                "message": "Switched to Compliance Checker tab"
            }, status=200)
        elif "upload" in command and "doc" in command:
            # optional: handle upload-doc mapping if needed
            pass


        # -------------------------
        # Open Downloads folder
        # -------------------------
        if any(phrase in command for phrase in OPEN_DOWNLOAD_PHRASES):
            opened = open_downloads_folder()
            if CURRENT_TAB:
                exts = TAB_EXTENSIONS.get(CURRENT_TAB, [])
                files = [f for f in list_download_files() if os.path.splitext(f)[1].lower() in exts]
                message = f"Download folder opened. Showing only {CURRENT_TAB} files."
            else:
                files = list_download_files()
                message = "Download folder opened. Showing all files."

            return JsonResponse({
                "status": opened,
                "statusCode": 200 if opened else 500,
                "action": "open_downloads",
                "tab": CURRENT_TAB or "all",
                "files": files,
                "message": message
            }, status=200 if opened else 500)

        # -------------------------
        # Upload by voice
        # -------------------------
        if command.startswith("upload") or command.startswith("select") or "upload" in command:
            raw_name = extract_filename(command)
            if not raw_name:
                return JsonResponse({"status": False, "statusCode": 400, "message": "No filename detected."}, status=400)

            files = list_download_files()
            candidate_tabs = []
            if CURRENT_TAB:
                candidate_tabs.append(CURRENT_TAB)
            candidate_tabs.extend([t for t in TAB_EXTENSIONS.keys() if t not in candidate_tabs])

            matched_file = None
            matched_tab = None

            if os.path.splitext(raw_name)[1]:
                f = find_best_match_in_files(raw_name, files, allowed_exts=None)
                if f:
                    matched_file = f
                    matched_tab = determine_tab_by_extension(f) or CURRENT_TAB
            else:
                for tab in candidate_tabs:
                    exts = TAB_EXTENSIONS.get(tab, [])
                    f = find_best_match_in_files(raw_name, files, allowed_exts=exts)
                    if f:
                        matched_file = f
                        matched_tab = tab
                        break

                if not matched_file:
                    f = find_best_match_in_files(raw_name, files, allowed_exts=None)
                    if f:
                        matched_file = f
                        matched_tab = determine_tab_by_extension(f) or CURRENT_TAB

            if matched_file:
                if matched_tab:
                    LAST_UPLOADED[matched_tab] = os.path.join(DOWNLOAD_DIR, matched_file)
                    CURRENT_TAB = matched_tab
                else:
                    inferred = determine_tab_by_extension(matched_file)
                    if inferred:
                        LAST_UPLOADED[inferred] = os.path.join(DOWNLOAD_DIR, matched_file)
                        CURRENT_TAB = inferred

                return JsonResponse({
                    "status": True,
                    "statusCode": 200,
                    "action": "upload",
                    "tab": CURRENT_TAB or "all",
                    "file": matched_file,
                    "message": f"{(CURRENT_TAB or 'file')} file '{matched_file}' uploaded successfully."
                }, status=200)

            return JsonResponse({"status": False, "statusCode": 404, "message": f"File '{raw_name}' not found in Downloads."}, status=404)

        # -------------------------
        # Run / Transcribe / Play
        # -------------------------
        if any(k in command for k in ["play", "transcribe", "run"]) and CURRENT_TAB:
            last_file = LAST_UPLOADED.get(CURRENT_TAB)
            if not last_file:
                return JsonResponse({"status": False, "statusCode": 400, "message": f"No {CURRENT_TAB} file selected yet."}, status=400)

            try:
                if CURRENT_TAB == "audio":
                    process_audio_file(last_file)
                elif CURRENT_TAB == "video":
                    process_video_file(last_file)
                elif CURRENT_TAB == "image":
                    process_image_file(last_file)
                elif CURRENT_TAB == "document":
                    process_document_file(last_file)

                return JsonResponse({"status": True, "statusCode": 200, "action": "run", "tab": CURRENT_TAB, "message": f"{CURRENT_TAB} file '{os.path.basename(last_file)}' processing started."}, status=200)
            except Exception as e:
                return JsonResponse({"status": False, "statusCode": 500, "message": f"Processing error: {str(e)}"}, status=500)

        # -------------------------
        # Stop / Exit
        # -------------------------
        if "exit" in command or "stop" in command:
            return JsonResponse({"status": True, "statusCode": 200, "action": "stop", "message": "Voice assistant stopped."}, status=200)

        # -------------------------
        # Unknown command
        # -------------------------
        return JsonResponse({"status": False, "statusCode": 400, "action": "unknown", "message": f"Command not recognized: {command}"}, status=400)

    except json.JSONDecodeError:
        return JsonResponse({"status": False, "statusCode": 400, "message": "Invalid JSON format."}, status=400)
    except Exception as e:
        return JsonResponse({"status": False, "statusCode": 500, "message": f"Internal Server Error: {str(e)}"}, status=500)

