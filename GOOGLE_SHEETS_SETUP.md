# Google Sheets Integration for Guest List

This guide will help you set up your guest list in Google Sheets instead of using a local `guests.txt` file.

## Setup Instructions

### 1. Create a Google Sheet
1. Go to [Google Sheets](https://sheets.google.com)
2. Create a new spreadsheet
3. Name it "Wedding Guest List" or similar
4. In column A, add your guest names (one per row)
5. Example format:
   ```
   A1: John Smith
   A2: Jane Doe
   A3: Michael Johnson
   ```

### 2. Make the Sheet Public (Simplest Method)
1. Click "Share" button in your Google Sheet
2. Click "Change to anyone with the link"
3. Set permission to "Viewer"
4. Copy the sharing link
5. Extract the Sheet ID from the URL (the long string between `/d/` and `/edit`)

Example URL: `https://docs.google.com/spreadsheets/d/1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms/edit`
Sheet ID: `1BxiMVs0XRA5nFMdKvBdBZjgmUUqptlbs74OgvE2upms`

### 3. Alternative: Use Google Docs (Text-based)
If you prefer Google Docs:
1. Create a Google Doc
2. List names one per line
3. Make it public with view access
4. Get the document ID from the URL

### 4. Update Your Environment
Add your Google Sheet/Doc ID to your environment or config.

## Benefits
- ✅ Easy to update from anywhere
- ✅ Real-time changes without server restart
- ✅ Can share editing access with wedding planners
- ✅ Backup and version history
- ✅ Can add additional columns for guest info later

## Security Note
The public method is simple but makes your guest list publicly viewable (though not easily discoverable). For production use, consider setting up proper Google API authentication.
