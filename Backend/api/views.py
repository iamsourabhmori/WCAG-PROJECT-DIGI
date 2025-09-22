
# # backend/api/views.py

# import os
# import requests
# from io import BytesIO
# from rest_framework.views import APIView
# from rest_framework.response import Response
# from rest_framework import status
# from modules.gemini_client import summarize_text  # Your Gemini client wrapper
# from api.crewai_agents.controller import AgentController  # In-memory multimodal controller
# from api.serializers import DocumentUploadSerializer  # Serializer for document upload

# # ------------------------
# # Audio Upload View
# # ------------------------
# class AudioUploadView(APIView):
#     def post(self, request):
#         audio_file = request.FILES.get("file")
#         audio_url = request.data.get("url")

#         if not audio_file and not audio_url:
#             return Response({"error": "Audio file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             controller = AgentController()

#             if audio_file:
#                 result = controller.process_audio(uploaded_file=audio_file)
#             else:  # process via URL
#                 resp = requests.get(audio_url)
#                 resp.raise_for_status()
#                 result = controller.process_audio(uploaded_file=BytesIO(resp.content))

#             return Response({"result": result}, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": f"Error processing audio: {str(e)}"},
#                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# # ------------------------
# # Video Upload View
# # ------------------------
# class VideoUploadView(APIView):
#     def post(self, request):
#         video_file = request.FILES.get("file")
#         video_url = request.data.get("url")

#         if not video_file and not video_url:
#             return Response({"error": "Video file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             controller = AgentController()

#             if video_file:
#                 result = controller.process_video(uploaded_file=video_file)
#             else:
#                 resp = requests.get(video_url)
#                 resp.raise_for_status()
#                 result = controller.process_video(uploaded_file=BytesIO(resp.content))

#             return Response({"result": result}, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": f"Error processing video: {str(e)}"},
#                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# # ------------------------
# # Image Upload View
# # ------------------------
# class ImageUploadView(APIView):
#     def post(self, request):
#         image_file = request.FILES.get("file")
#         image_url = request.data.get("url")

#         if not image_file and not image_url:
#             return Response({"error": "Image file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             controller = AgentController()

#             if image_file:
#                 result = controller.process_image(uploaded_file=image_file)
#             else:
#                 resp = requests.get(image_url)
#                 resp.raise_for_status()
#                 result = controller.process_image(uploaded_file=BytesIO(resp.content))

#             return Response({"result": result}, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": f"Error processing image: {str(e)}"},
#                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# # ------------------------
# # Document Upload & Summarize View
# # ------------------------
# class DocumentUploadView(APIView):
#     """
#     Handles uploading a document, returning its text immediately,
#     and optionally summarizing via Gemini when 'summarize=True'.
#     """

#     def post(self, request):
#         serializer = DocumentUploadSerializer(data=request.data)
#         serializer.is_valid(raise_exception=True)
#         doc_file = serializer.validated_data.get("file")
#         doc_url = serializer.validated_data.get("url")
#         summarize_flag = serializer.validated_data.get("summarize", False)

#         if not doc_file and not doc_url:
#             return Response({"error": "Document file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             controller = AgentController()

#             # Get raw document text (controller already extracts + summarizes)
#             if doc_file:
#                 document_data = controller.process_document(uploaded_file=doc_file, speak=False)
#             else:
#                 resp = requests.get(doc_url)
#                 resp.raise_for_status()
#                 document_data = controller.process_document(uploaded_file=BytesIO(resp.content), speak=False)

#             if not document_data or "error" in document_data:
#                 return Response({"error": document_data.get("error", "Failed to process document")}, status=status.HTTP_400_BAD_REQUEST)

#             # Always send plain text
#             result = {"document_text": document_data.get("text", "")}

#             # If summarization explicitly requested, reuse existing summary
#             if summarize_flag:
#                 result["summary_text"] = document_data.get("summary", "")

#             return Response({"result": result}, status=status.HTTP_200_OK)

#         except Exception as e:
#             return Response(
#                 {"error": f"Error processing document: {str(e)}"},
#                 status=status.HTTP_500_INTERNAL_SERVER_ERROR
#             )



# # ------------------------
# # Workflow Controller (Unified)
# # ------------------------
# class WorkflowControllerView(APIView):
#     def post(self, request):
#         input_type = request.data.get("input_type")
#         file = request.FILES.get("file")
#         url = request.data.get("url")

#         if not input_type:
#             return Response({"error": "input_type is required"}, status=status.HTTP_400_BAD_REQUEST)
#         if not file and not url:
#             return Response({"error": "File or URL must be provided"}, status=status.HTTP_400_BAD_REQUEST)

#         try:
#             controller = AgentController()

#             if file:
#                 result = controller.run_pipeline(input_type=input_type, file=file)
#             else:
#                 resp = requests.get(url)
#                 resp.raise_for_status()
#                 result = controller.run_pipeline(input_type=input_type, file=BytesIO(resp.content))

#             return Response({"result": result}, status=status.HTTP_200_OK)
#         except Exception as e:
#             return Response({"error": f"Error running workflow: {str(e)}"},
#                             status=status.HTTP_500_INTERNAL_SERVER_ERROR)



# # ------------------------
# # Serve Downloaded File by Name
# # ------------------------
# from django.http import FileResponse

# class DownloadFileView(APIView):
#     def get(self, request):
#         file_name = request.query_params.get("name")
#         if not file_name:
#             return Response({"error": "File name is required"}, status=status.HTTP_400_BAD_REQUEST)

#         downloads_dir = os.path.expanduser("~/Downloads")
#         file_path = os.path.join(downloads_dir, file_name)

#         if not os.path.exists(file_path):
#             return Response({"error": f"File '{file_name}' not found in Downloads"}, status=status.HTTP_404_NOT_FOUND)

#         try:
#             # Stream file back to frontend (audio/video/image/document)
#             return FileResponse(open(file_path, "rb"), as_attachment=False, filename=file_name)
#         except Exception as e:
#             return Response({"error": f"Failed to read file: {str(e)}"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


#-----------------------------------------------------------------------------------------------------------------------------------------------

# backend/api/views.py

import os
import mimetypes

import requests
from io import BytesIO
from rest_framework.views import APIView
from rest_framework.response import Response
from rest_framework import status
from modules.gemini_client import summarize_text  # Your Gemini client wrapper
from api.crewai_agents.controller import AgentController  # In-memory multimodal controller
from api.serializers import DocumentUploadSerializer  # Serializer for document upload
from django.http import FileResponse, HttpResponseNotFound, HttpResponseServerError
from django.views.decorators.http import require_GET
from urllib.parse import unquote
from difflib import get_close_matches


DOWNLOAD_DIR = os.path.expanduser("~/Downloads")


# ------------------------
# Audio Upload View
# ------------------------
class AudioUploadView(APIView):
    def post(self, request):
        audio_file = request.FILES.get("file")
        audio_url = request.data.get("url")

        if not audio_file and not audio_url:
            return Response({"error": "Audio file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            controller = AgentController()

            if audio_file:
                result = controller.process_audio(uploaded_file=audio_file)
            else:  # process via URL
                resp = requests.get(audio_url)
                resp.raise_for_status()
                result = controller.process_audio(uploaded_file=BytesIO(resp.content))

            return Response({"result": result}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error processing audio: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------
# Video Upload View
# ------------------------
class VideoUploadView(APIView):
    def post(self, request):
        video_file = request.FILES.get("file")
        video_url = request.data.get("url")

        if not video_file and not video_url:
            return Response({"error": "Video file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            controller = AgentController()

            if video_file:
                result = controller.process_video(uploaded_file=video_file)
            else:
                resp = requests.get(video_url)
                resp.raise_for_status()
                result = controller.process_video(uploaded_file=BytesIO(resp.content))

            return Response({"result": result}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error processing video: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------
# Image Upload View
# ------------------------
class ImageUploadView(APIView):
    def post(self, request):
        image_file = request.FILES.get("file")
        image_url = request.data.get("url")

        if not image_file and not image_url:
            return Response({"error": "Image file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            controller = AgentController()

            if image_file:
                result = controller.process_image(uploaded_file=image_file)
            else:
                resp = requests.get(image_url)
                resp.raise_for_status()
                result = controller.process_image(uploaded_file=BytesIO(resp.content))

            return Response({"result": result}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error processing image: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------
# Document Upload & Summarize View
# ------------------------
class DocumentUploadView(APIView):
    """
    Handles uploading a document, returning its text immediately,
    and optionally summarizing via Gemini when 'summarize=True'.
    """

    def post(self, request):
        serializer = DocumentUploadSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        doc_file = serializer.validated_data.get("file")
        doc_url = serializer.validated_data.get("url")
        summarize_flag = serializer.validated_data.get("summarize", False)

        if not doc_file and not doc_url:
            return Response({"error": "Document file or URL required"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            controller = AgentController()

            if doc_file:
                document_data = controller.process_document(uploaded_file=doc_file, speak=False)
            else:
                resp = requests.get(doc_url)
                resp.raise_for_status()
                document_data = controller.process_document(uploaded_file=BytesIO(resp.content), speak=False)

            if not document_data or "error" in document_data:
                return Response({"error": document_data.get("error", "Failed to process document")},
                                status=status.HTTP_400_BAD_REQUEST)

            result = {"document_text": document_data.get("text", "")}

            if summarize_flag:
                result["summary_text"] = document_data.get("summary", "")

            return Response({"result": result}, status=status.HTTP_200_OK)

        except Exception as e:
            return Response(
                {"error": f"Error processing document: {str(e)}"},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )


# ------------------------
# Workflow Controller (Unified)
# ------------------------
class WorkflowControllerView(APIView):
    def post(self, request):
        input_type = request.data.get("input_type")
        file = request.FILES.get("file")
        url = request.data.get("url")

        if not input_type:
            return Response({"error": "input_type is required"}, status=status.HTTP_400_BAD_REQUEST)
        if not file and not url:
            return Response({"error": "File or URL must be provided"}, status=status.HTTP_400_BAD_REQUEST)

        try:
            controller = AgentController()

            if file:
                result = controller.run_pipeline(input_type=input_type, file=file)
            else:
                resp = requests.get(url)
                resp.raise_for_status()
                result = controller.run_pipeline(input_type=input_type, file=BytesIO(resp.content))

            return Response({"result": result}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response({"error": f"Error running workflow: {str(e)}"},
                            status=status.HTTP_500_INTERNAL_SERVER_ERROR)


# ------------------------
# Serve Downloaded File by Name (with fuzzy matching)
# ------------------------

@require_GET
def download_file_view(request):
    name = request.GET.get("name", "")
    if not name:
        return HttpResponseNotFound("Missing file name")

    # Clean input
    name = os.path.basename(unquote(name.strip()))

    # List available files
    try:
        files = os.listdir(DOWNLOAD_DIR)
    except FileNotFoundError:
        return HttpResponseNotFound(f"Download directory not found: {DOWNLOAD_DIR}")

    # Try exact match first
    if name not in files:
        match = get_close_matches(name, files, n=1, cutoff=0.6)
        if not match:
            return HttpResponseNotFound(f"No file similar to '{name}' found in Downloads")
        name = match[0]

    path = os.path.join(DOWNLOAD_DIR, name)

    try:
        # Guess content type
        content_type, _ = mimetypes.guess_type(path)
        return FileResponse(open(path, "rb"), content_type=content_type or "application/octet-stream")
    except Exception as e:
        return HttpResponseServerError(f"Failed to read file: {e}")

