# backend/api/crewai_agents/management/commands/run_listener.py
import os, json, platform, subprocess, requests
import speech_recognition as sr
from pathlib import Path
from django.core.management.base import BaseCommand
import threading

DOWNLOADS_PATH = str(Path.home() / "Downloads")
BACKEND_API = "http://127.0.0.1:8000/api/voice-command/"

def open_downloads():
    system = platform.system()
    if system == "Windows":
        os.startfile(DOWNLOADS_PATH)
    elif system == "Darwin":
        subprocess.Popen(["open", DOWNLOADS_PATH])
    else:
        subprocess.Popen(["xdg-open", DOWNLOADS_PATH])

def send_to_django(command: str):
    try:
        requests.post(
            BACKEND_API,
            headers={"Content-Type": "application/json"},
            data=json.dumps({"command": command}),
            timeout=10
        )
    except Exception as e:
        print("Failed to send command:", e)

def voice_loop():
    recognizer = sr.Recognizer()
    mic = sr.Microphone()

    print("🎤 Voice listener started (inside Django). Say something...")

    while True:
        with mic as source:
            recognizer.adjust_for_ambient_noise(source)
            audio = recognizer.listen(source, phrase_time_limit=5)

        try:
            command = recognizer.recognize_google(audio).lower()
            print("Heard:", command)

            if "open downloads" in command:
                open_downloads()

            send_to_django(command)

        except sr.UnknownValueError:
            continue
        except sr.RequestError as e:
            print("Speech recognition error:", e)

class Command(BaseCommand):
    help = "Run Django + Voice listener together"

    def handle(self, *args, **options):
        t = threading.Thread(target=voice_loop, daemon=True)
        t.start()
        self.stdout.write(self.style.SUCCESS("✅ Voice listener thread running"))
        # keep Django alive
        import time
        while True:
            time.sleep(1)
