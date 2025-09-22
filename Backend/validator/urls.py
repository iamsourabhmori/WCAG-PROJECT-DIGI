from django.urls import path
from validator.views import validate_website, save_validation_report

urlpatterns = [
    path('validate/', validate_website, name='validate'),
    path('save-report/', save_validation_report, name='save_report'),
]