from django.db import models

class AccessibleAsset(models.Model):
    file = models.FileField(upload_to='assets/')
    file_type = models.CharField(max_length=10)
    metadata = models.JSONField(default=dict)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

class ValidationReport(models.Model):
    """Model to store validation reports"""
    url = models.URLField()
    compliant = models.BooleanField(default=False)
    summary = models.JSONField(default=dict)
    errors = models.JSONField(default=list)
    contrast_errors = models.JSONField(default=list)
    alerts = models.JSONField(default=list)
    features = models.JSONField(default=list)
    suggestions = models.JSONField(default=list)
    agent_data = models.JSONField(default=dict)  # Agent-specific data
    created_at = models.DateTimeField(auto_now_add=True) 

    class Meta:
        ordering = ['-created_at'] 

    def __str__(self):
        return f"Validation Report for {self.url}"

class ValidationLog(models.Model):
    """Model to log agent activities and operations"""
    LOG_TYPES = [
        ('manual_validation', 'Manual Validation'),
        ('agent_validation', 'Agent Validation'),
        ('ai_analysis', 'AI Analysis'),
        ('autonomous_action', 'Autonomous Action'),
    ]

    log_type = models.CharField(max_length=50, choices=LOG_TYPES)
    url = models.URLField(blank=True, null=True)
    operation_details = models.JSONField(default=dict)
    success = models.BooleanField(default=True)
    processing_time = models.FloatField(default=0.0)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-created_at']

    def __str__(self): 
        return f"{self.log_type} - {self.url or 'System'}"