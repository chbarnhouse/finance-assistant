#!/usr/bin/env python3
"""
Test script to verify migrations work correctly
"""

import os
import django
import sys

# Setup Django environment
os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'finance_assistant.settings')

try:
    django.setup()
    print("Django setup successful!")
except Exception as e:
    print(f"Django setup failed: {e}")
    sys.exit(1)

try:
    from django.core.management import execute_from_command_line
    print("Testing migrations...")

    # Test migration check
    execute_from_command_line(['manage.py', 'migrate', '--check'])
    print("Migration check completed!")

    # Test makemigrations (should show no changes needed)
    execute_from_command_line(['manage.py', 'makemigrations', '--dry-run'])
    print("Makemigrations dry run completed!")

    print("All migration tests passed!")

except Exception as e:
    print(f"Migration test failed: {e}")
    import traceback
    traceback.print_exc()
    sys.exit(1)