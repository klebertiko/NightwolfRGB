# Profiles Directory

This directory stores saved RGB profiles.

Profiles are automatically saved here when you use the "Save Profile" feature in the Nightwolf RGB interface.

## File Format

Profiles are stored as JSON files with the schema:
```json
{
  "name": "Profile Name",
  "description": "Optional description",
  "createdAt": "ISO timestamp",
  "devices": [...]
}
```

## Local Profiles

Individual profile files (`.json`) are ignored by git to prevent committing user-specific configurations.
You can share profiles by manually copying the JSON files.
