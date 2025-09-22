

# # backend/api/urls.py

from django.urls import path
# from .views import DownloadFileView

from .views import (
    AudioUploadView,
    VideoUploadView,
    ImageUploadView,
    DocumentUploadView,
    WorkflowControllerView,
    download_file_view
)

from .crewai_agents.voice_controller import voice_command  # ✅ import the new controller
urlpatterns = [
    # Individual upload endpoints
    path("upload/audio/", AudioUploadView.as_view(), name="upload-audio"),
    path("upload/video/", VideoUploadView.as_view(), name="upload-video"),
    path("upload/image/", ImageUploadView.as_view(), name="upload-image"),
    path("upload/doc/", DocumentUploadView.as_view(), name="upload-doc"),

    # Unified workflow endpoint
    path("workflow/", WorkflowControllerView.as_view(), name="workflow-controller"),
    path("voice-command/", voice_command, name="voice-command"),  # ✅ new endpoint
    path("download-file/", download_file_view, name="download-file"),
]


