# Localization Structure

This folder stores one JSON file per language.

## File naming

- Use ISO-like short codes and lowercase names.
- Example: `en.json`, `ne.json`, `hi.json`, `es.json`, `ar.json`, `fr.json`.

## JSON structure

Each language file must keep the same top-level namespaces:

- `common`
- `auth`
- `dashboard`
- `booking`
- `payment`
- `notifications`
- `admin`
- `profile`
- `caregiver`
- `landing`

## Add a new language

1. Add language metadata in `src/locales/config.json` under `supportedLanguages`.
2. If needed, add the code to `rtlLanguages` in `src/locales/config.json`.
3. Copy `en.json` to a new file (for example `de.json`) and translate values.
4. Register the file in `src/lib/localization/locale-loader.ts` by adding one loader entry.
5. Keep key names identical across all language files.

## Notes

- The app loads locale JSON files dynamically.
- Missing keys in non-English locales fall back to English.
- Avoid adding user-facing text directly in TypeScript/TSX when a translation key can be used.
