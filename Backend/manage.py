# #!/usr/bin/env python
# """Django's command-line utility for administrative tasks."""
# import os
# import sys


# def main():
#     """Run administrative tasks."""
#     os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')
#     try:
#         from django.core.management import execute_from_command_line
#     except ImportError as exc:
#         raise ImportError(
#             "Couldn't import Django. Are you sure it's installed and "
#             "available on your PYTHONPATH environment variable? Did you "
#             "forget to activate a virtual environment?"
#         ) from exc
#     execute_from_command_line(sys.argv)


# if __name__ == '__main__':
#     main()


#---------------------------------------------------------------------------------------------------------------------


#!/usr/bin/env python
"""Django's command-line utility for administrative tasks."""
import os
import sys
import subprocess
import signal


def main():
    """Run administrative tasks."""
    os.environ.setdefault("DJANGO_SETTINGS_MODULE", "config.settings")

    listener_process = None

    # 👇 auto-start listener only when running server
    if "runserver" in sys.argv:
        listener_process = subprocess.Popen(
            ["python", "manage.py", "run_listener"],
            stdout=subprocess.DEVNULL,
            stderr=subprocess.DEVNULL
        )

    try:
        from django.core.management import execute_from_command_line
        execute_from_command_line(sys.argv)
    finally:
        # 👇 cleanup: kill the listener when server stops
        if listener_process:
            listener_process.send_signal(signal.SIGTERM)


if __name__ == "__main__":
    main()
