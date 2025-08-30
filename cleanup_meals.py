import gspread
from google.oauth2.service_account import Credentials

# Scope for the Google Sheets API
SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file"
]

# Path to your credentials file
CREDS_FILE = 'credentials.json'

# The ID of your spreadsheet
SHEET_ID = "17eQtWRrZOrEacFKlMPCEgdbIsArAF3eYVkMZ0UvN0bY"

def get_sheet(sheet_name):
    """Get a specific sheet from the spreadsheet."""
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPE)
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(SHEET_ID)
    return spreadsheet.worksheet(sheet_name)

def cleanup_duplicate_meals():
    """
    Identifies and removes duplicate meal entries from the 'Meals' sheet.
    A duplicate is defined by having the same 'Date' and 'Member ID'.
    The last entry among duplicates is kept.
    """
    meals_sheet = get_sheet('Meals')
    meals_data = meals_sheet.get_all_records()

    # Group meals by (Date, Member ID)
    grouped_meals = {}
    for i, meal in enumerate(meals_data):
        key = (meal.get('Date'), meal.get('Member ID'))
        if key not in grouped_meals:
            grouped_meals[key] = []
        grouped_meals[key].append({'row_index': i + 2, 'data': meal}) # +2 for header and 0-based index

    # Identify rows to delete
    rows_to_delete = []
    for key, entries in grouped_meals.items():
        if len(entries) > 1:
            # Keep the last entry, mark others for deletion
            entries.sort(key=lambda x: x['row_index'], reverse=True)
            for entry in entries[1:]:
                rows_to_delete.append(entry['row_index'])

    # Delete rows in reverse order to avoid shifting issues
    if rows_to_delete:
        rows_to_delete.sort(reverse=True)
        print(f"Found {len(rows_to_delete)} duplicate meal entries to delete.")
        for row_index in rows_to_delete:
            try:
                meals_sheet.delete_rows(row_index)
                print(f"Deleted row {row_index}")
            except Exception as e:
                print(f"Could not delete row {row_index}. Reason: {e}")
    else:
        print("No duplicate meal entries found.")

if __name__ == '__main__':
    cleanup_duplicate_meals()
