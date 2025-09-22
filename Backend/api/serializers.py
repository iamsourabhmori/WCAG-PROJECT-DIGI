
#backend/api/serializers.py



from rest_framework import serializers

class AudioUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=False)
    url = serializers.URLField(required=False)

    def validate(self, data):
        if not data.get("file") and not data.get("url"):
            raise serializers.ValidationError("Either file or URL must be provided.")
        return data


class VideoUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=False)
    url = serializers.URLField(required=False)

    def validate(self, data):
        if not data.get("file") and not data.get("url"):
            raise serializers.ValidationError("Either file or URL must be provided.")
        return data


class ImageUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=False)
    url = serializers.URLField(required=False)

    def validate(self, data):
        if not data.get("file") and not data.get("url"):
            raise serializers.ValidationError("Either file or URL must be provided.")
        return data




class DocumentUploadSerializer(serializers.Serializer):
    file = serializers.FileField(required=False)
    url = serializers.URLField(required=False)

    # Optional: you can allow a flag to trigger summarization explicitly
    summarize = serializers.BooleanField(required=False, default=False)

    def validate(self, data):
        """
        Ensure either a file or a URL is provided.
        """
        if not data.get("file") and not data.get("url"):
            raise serializers.ValidationError("Either file or URL must be provided.")
        return data