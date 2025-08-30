import gspread
from google.oauth2.service_account import Credentials
import datetime
import uuid
from cachetools import TTLCache, cached

# Cache setup: 100 items max, 60-second TTL
cache = TTLCache(maxsize=100, ttl=60)

# Scope for the Google Sheets API
SCOPE = [
    "https://www.googleapis.com/auth/spreadsheets",
    "https://www.googleapis.com/auth/drive.file"
]

# Path to your credentials file
CREDS_FILE = 'credentials.json'

def get_sheet(spreadsheet_id, sheet_name):
    """Get a specific sheet from the spreadsheet."""
    creds = Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPE)
    client = gspread.authorize(creds)
    spreadsheet = client.open_by_key(spreadsheet_id)
    return spreadsheet.worksheet(sheet_name)

@cached(cache)
def get_all_records(spreadsheet_id, sheet_name):
    """Get all records from a sheet as a list of dictionaries."""
    sheet = get_sheet(spreadsheet_id, sheet_name)
    return sheet.get_all_records()

def append_row(spreadsheet_id, sheet_name, row_data):
    """Append a row to a sheet."""
    sheet = get_sheet(spreadsheet_id, sheet_name)
    sheet.append_row(row_data)
    cache.clear()

def update_row(spreadsheet_id, sheet_name, row_index, new_data):
    """Update a row in a sheet."""
    sheet = get_sheet(spreadsheet_id, sheet_name)
    # Get all records to find the row index based on a unique identifier
    records = sheet.get_all_records()
    headers = sheet.row_values(1) # Get headers from the first row

    # Find the row to update based on row_index (which is 1-based in gspread)
    # Assuming row_index is the actual row number in the sheet
    # Convert new_data dict to a list matching header order
    updated_values = []
    for header in headers:
        updated_values.append(new_data.get(header, records[row_index - 2].get(header, ''))) # -2 because records is 0-indexed and row_index is 1-based, and header row

    sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])


def setup_sheets(spreadsheet_id):
    """Ensure all necessary sheets exist."""
    spreadsheet = gspread.authorize(Credentials.from_service_account_file(CREDS_FILE, scopes=SCOPE)).open_by_key(spreadsheet_id)
    
    # Define sheets and their headers
    sheets_to_create = {
        "Users": ["User ID", "Username", "Password", "Role", "Mess ID", "Email"],
        "Messes": ["Mess ID", "Mess Name", "Creator User ID", "Location"],
        "Members": ["Member ID", "Name", "Phone", "Email", "Joining Date", "Status", "Mess ID"],
        "Meals": ["Meal ID", "Date", "Member ID", "Breakfast", "Lunch", "Dinner", "Total Meals", "Mess ID"],
        "Costs": ["Cost ID", "Date", "Description", "Amount", "Paid By Member ID", "Category", "Mess ID"],
        "Deposits": ["Deposit ID", "Date", "Member ID", "Amount", "Mess ID"],
        "Meal Requests": ["Request ID", "Mess ID", "Requesting User ID", "Message", "Request Date", "Status", "Manager User ID", "Approval Date"],
        "Notifications": ["Notification ID", "User ID", "Mess ID", "Type", "Reference ID", "Message", "Timestamp", "Read"],
        "Bazar Dates": ["Bazar ID", "Date", "Member ID", "Mess ID"]
    }

    for sheet_name, headers in sheets_to_create.items():
        try:
            spreadsheet.worksheet(sheet_name)
            print(f"Sheet '{sheet_name}' already exists.")
        except gspread.exceptions.WorksheetNotFound:
            print(f"Creating sheet '{sheet_name}'...")
            worksheet = spreadsheet.add_worksheet(title=sheet_name, rows=1, cols=len(headers))
            worksheet.append_row(headers)
            print(f"Sheet '{sheet_name}' created with headers: {', '.join(headers)}")

# --- User Management ---
def add_user(spreadsheet_id, user_data):
    append_row(spreadsheet_id, "Users", user_data)

def get_user(spreadsheet_id, username):
    users = get_all_records(spreadsheet_id, "Users")
    for user in users:
        if user.get('Username') == username:
            return user
    return None

def get_all_users(spreadsheet_id):
    return get_all_records(spreadsheet_id, "Users")

def get_user_by_id(spreadsheet_id, user_id):
    users = get_all_records(spreadsheet_id, "Users")
    for user in users:
        if user.get('User ID') == user_id:
            return user
    return None

def update_user(spreadsheet_id, user_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Users")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('User ID') == user_id:
            row_index = i + 2 # +2 for 1-based indexing and header row
            updated_values = []
            for header in headers:
                updated_values.append(new_data.get(header, record.get(header, '')))
            sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])
            cache.clear()
            return True
    return False

def update_mess_manager_role(spreadsheet_id, mess_id, old_manager_user_id, new_manager_user_id):
    users_sheet = get_sheet(spreadsheet_id, "Users")
    users_records = users_sheet.get_all_records()
    users_headers = users_sheet.row_values(1)

    # Demote old manager
    for i, user in enumerate(users_records):
        if user.get('User ID') == old_manager_user_id and user.get('Mess ID') == mess_id:
            row_index = i + 2
            updated_values = []
            for header in users_headers:
                updated_values.append(user.get(header))
            # Find 'Role' column index and update
            role_col_index = users_headers.index('Role')
            updated_values[role_col_index] = 'member'
            users_sheet.update(f'A{row_index}:{chr(ord("A") + len(users_headers) - 1)}{row_index}', [updated_values])
            return True
    return False

# --- Mess Management ---
def create_mess(spreadsheet_id, mess_data):
    append_row(spreadsheet_id, "Messes", mess_data)

def get_messes(spreadsheet_id):
    return get_all_records(spreadsheet_id, "Messes")

def get_mess_details(spreadsheet_id, mess_id):
    try:
        mess_data = get_all_records(spreadsheet_id, "Messes")
        for mess in mess_data:
            if mess.get('Mess ID') == mess_id:
                return mess
        return {}
    except Exception as e:
        print(f"Error getting mess details: {e}")
        return {}

def get_notifications_data():
    try:
        notifications_sheet = client.open_by_key(SHEET_ID).worksheet("Notifications")
        return notifications_sheet.get_all_records()
    except Exception as e:
        print(f"Error getting notifications data: {e}")
        return []

def delete_mess(spreadsheet_id, mess_id):
    # Delete from Messes sheet
    mess_sheet = get_sheet(spreadsheet_id, "Messes")
    mess_records = mess_sheet.get_all_records()
    mess_row_index = -1
    for i, mess in enumerate(mess_records):
        if mess.get("Mess ID") == mess_id:
            mess_row_index = i + 2 # +2 for header and 0-indexing
            break
    if mess_row_index != -1:
        mess_sheet.delete_rows(mess_row_index)
        print(f"Mess {mess_id} deleted from Messes sheet.")
    else:
        print(f"Mess {mess_id} not found in Messes sheet.")
        return False # Mess not found

    # 2. Disassociate members (clear their Mess ID in Users sheet)
    users_sheet = get_sheet(spreadsheet_id, "Users")
    all_users = users_sheet.get_all_records()
    headers = users_sheet.row_values(1)
    mess_id_col_index = headers.index("Mess ID") + 1 # +1 for 1-based indexing
    updates = []
    for i, user in enumerate(all_users):
        if user.get("Mess ID") == mess_id:
            user_row_index = i + 2
            updates.append({
                'range': gspread.utils.rowcol_to_a1(user_row_index, mess_id_col_index),
                'values': [['']] # Clear Mess ID
            })
            # Also reset role if it was 'mess creator'
            if user.get("Role") == "mess creator": # Changed from "mess creator"
                role_col_index = headers.index("Role") + 1
                updates.append({
                    'range': gspread.utils.rowcol_to_a1(user_row_index, role_col_index),
                    'values': [['user']] # Reset role to 'user'
                })
    if updates:
        users_sheet.batch_update(updates)
        print(f"Users disassociated from mess {mess_id}.")

    # 3. Delete associated meals, costs, and deposits
    sheets_to_clean = ["Meals", "Costs", "Deposits"]
    for sheet_name in sheets_to_clean:
        worksheet = get_sheet(spreadsheet_id, sheet_name)
        all_records = worksheet.get_all_records()
        rows_to_delete = []
        for i, record in enumerate(all_records):
            if record.get("Mess ID") == mess_id:
                rows_to_delete.append(i + 2)

        # Delete rows in reverse order to avoid index issues
        for row_index in sorted(rows_to_delete, reverse=True):
            worksheet.delete_rows(row_index)
        if rows_to_delete:
            print(f"{len(rows_to_delete)} entries deleted from {sheet_name} for mess {mess_id}.")

    print(f"Mess {mess_id} and all associated data deleted successfully.")
    cache.clear()
    return True

# --- Member Management ---
def add_member(spreadsheet_id, member_data):
    append_row(spreadsheet_id, "Members", member_data)

def get_members(spreadsheet_id, mess_id):
    members = get_all_records(spreadsheet_id, "Members")
    return [member for member in members if member.get('Mess ID') == mess_id]

def update_member(spreadsheet_id, member_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Members")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('Member ID') == member_id:
            row_index = i + 2
            updated_values = []
            for header in headers:
                updated_values.append(new_data.get(header, record.get(header, '')))
            sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])
            cache.clear()
            return True
    return False

def delete_member(spreadsheet_id, member_id):
    sheet = get_sheet(spreadsheet_id, "Members")
    records = sheet.get_all_records()
    for i, record in enumerate(records):
        if record.get('Member ID') == member_id:
            sheet.delete_rows(i + 2)
            cache.clear()
            return True
    return False

# --- Meal Management ---
def add_meal(spreadsheet_id, meal_data):
    append_row(spreadsheet_id, "Meals", meal_data)

def get_meals(spreadsheet_id, mess_id, month=None):
    meals = get_all_records(spreadsheet_id, "Meals")
    meals_for_mess = [meal for meal in meals if meal.get('Mess ID') == mess_id]
    if month:
        return [meal for meal in meals_for_mess if meal.get('Date') and meal.get('Date').startswith(month)]
    return meals_for_mess

def update_meal(spreadsheet_id, meal_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Meals")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('Meal ID') == meal_id:
            row_index = i + 2
            updated_values = []
            for header in headers:
                updated_values.append(new_data.get(header, record.get(header, '')))
            sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])
            cache.clear()
            return True
    return False

def delete_meal(spreadsheet_id, meal_id):
    sheet = get_sheet(spreadsheet_id, "Meals")
    records = sheet.get_all_records()
    for i, record in enumerate(records):
        if record.get('Meal ID') == meal_id:
            sheet.delete_rows(i + 2)
            cache.clear()
            return True
    return False

# --- Cost Management ---
def add_cost(spreadsheet_id, cost_data):
    append_row(spreadsheet_id, "Costs", cost_data)

def get_costs(spreadsheet_id, mess_id, month=None):
    costs = get_all_records(spreadsheet_id, "Costs")
    costs_for_mess = [cost for cost in costs if cost.get('Mess ID') == mess_id]
    if month:
        return [cost for cost in costs_for_mess if cost.get('Date') and cost.get('Date').startswith(month)]
    return costs_for_mess

def update_cost(spreadsheet_id, cost_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Costs")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('Cost ID') == cost_id:
            row_index = i + 2
            updated_values = []
            for header in headers:
                updated_values.append(new_data.get(header, record.get(header, '')))
            sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])
            cache.clear()
            return True
    return False

def delete_cost(spreadsheet_id, cost_id):
    sheet = get_sheet(spreadsheet_id, "Costs")
    records = sheet.get_all_records()
    for i, record in enumerate(records):
        if record.get('Cost ID') == cost_id:
            sheet.delete_rows(i + 2)
            cache.clear()
            return True
    return False

# --- Deposit Management ---
def add_deposit(spreadsheet_id, deposit_data):
    # deposit_data is a list: [Deposit ID, Date, Member ID, Amount, Mess ID]
    new_deposit_date_str = deposit_data[1]
    new_deposit_member_id = deposit_data[2]
    new_deposit_amount = float(deposit_data[3])
    mess_id = deposit_data[4]

    # Parse the new deposit date
    new_deposit_date = datetime.datetime.strptime(new_deposit_date_str, "%Y-%m-%d")
    new_deposit_month = new_deposit_date.month
    new_deposit_year = new_deposit_date.year

    deposits = get_deposits(spreadsheet_id, mess_id) # Get all deposits for the mess

    found_existing_deposit = False
    for i, deposit in enumerate(deposits):
        existing_deposit_date_str = deposit.get('Date')
        existing_deposit_member_id = deposit.get('Member ID')

        if existing_deposit_date_str and existing_deposit_member_id == new_deposit_member_id:
            try:
                existing_deposit_date = datetime.datetime.strptime(existing_deposit_date_str, "%Y-%m-%d")
                if existing_deposit_date.month == new_deposit_month and existing_deposit_date.year == new_deposit_year:
                    # Found an existing deposit for the same member in the same month
                    existing_deposit_id = deposit.get('Deposit ID')
                    existing_amount = float(deposit.get('Amount', 0))
                    updated_amount = existing_amount + new_deposit_amount

                    # Update the existing deposit
                    update_deposit(spreadsheet_id, existing_deposit_id, {"Amount": updated_amount})
                    found_existing_deposit = True
                    break
            except ValueError:
                print(f"Warning: Could not parse date for deposit: {existing_deposit_date_str}")
                continue

    if not found_existing_deposit:
        # No existing deposit for the month, append a new row
        # Ensure Deposit ID is unique if not provided by frontend or if it's a new entry
        if not deposit_data[0]: # If Deposit ID is empty or None
            deposit_data[0] = str(uuid.uuid4()) # Generate a new unique ID
        append_row(spreadsheet_id, "Deposits", deposit_data)

def get_deposits(spreadsheet_id, mess_id, month=None):
    deposits = get_all_records(spreadsheet_id, "Deposits")
    deposits_for_mess = [deposit for deposit in deposits if deposit.get('Mess ID') == mess_id]
    if month:
        return [deposit for deposit in deposits_for_mess if deposit.get('Date') and deposit.get('Date').startswith(month)]
    return deposits_for_mess

def update_deposit(spreadsheet_id, deposit_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Deposits")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('Deposit ID') == deposit_id:
            row_index = i + 2
            updated_values = []
            for header in headers:
                updated_values.append(new_data.get(header, record.get(header, '')))
            sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])
            cache.clear()
            return True
    return False

def delete_deposit(spreadsheet_id, deposit_id):
    sheet = get_sheet(spreadsheet_id, "Deposits")
    records = sheet.get_all_records()
    for i, record in enumerate(records):
        if record.get('Deposit ID') == deposit_id:
            sheet.delete_rows(i + 2)
            cache.clear()
            return True
    return False

# --- Meal Request Management ---
def add_meal_request(spreadsheet_id, request_data):
    append_row(spreadsheet_id, "Meal Requests", request_data)

def get_meal_requests(spreadsheet_id, mess_id):
    requests = get_all_records(spreadsheet_id, "Meal Requests")
    return [req for req in requests if req.get('Mess ID') == mess_id]

def update_meal_request(spreadsheet_id, request_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Meal Requests")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('Request ID') == request_id:
            row_index = i + 2
            updated_values = []
            for header in headers:
                updated_values.append(new_data.get(header, record.get(header, '')))
            sheet.update(f'A{row_index}:{chr(ord("A") + len(headers) - 1)}{row_index}', [updated_values])
            cache.clear()
            return True
    return False

# --- Notification Management ---
def add_notification(spreadsheet_id, notification_data):
    append_row(spreadsheet_id, "Notifications", notification_data)

def get_notifications(spreadsheet_id, user_id):
    notifications = get_all_records(spreadsheet_id, "Notifications")
    return [notif for notif in notifications if notif.get('User ID') == user_id]

def update_notification(spreadsheet_id, notification_id, new_data):
    sheet = get_sheet(spreadsheet_id, "Notifications")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)

    for i, record in enumerate(records):
        if record.get('Notification ID') == notification_id:
            row_index = i + 2
            try:
                read_col_index = headers.index("Read") + 1
                sheet.update_cell(row_index, read_col_index, new_data['Read'])
                cache.clear()
                return True
            except ValueError:
                return False # 'Read' column not found
    return False

# --- Bazar Date Management ---
def add_bazar_date(spreadsheet_id, bazar_date_data):
    # bazar_date_data is a list: [Bazar ID, Start Date, End Date, Member ID, Mess ID]
    append_row(spreadsheet_id, "Bazar Dates", bazar_date_data)

def get_bazar_dates(spreadsheet_id, mess_id):
    bazar_dates = get_all_records(spreadsheet_id, "Bazar Dates")
    return [bazar_date for bazar_date in bazar_dates if bazar_date.get('Mess ID') == mess_id]

def get_available_months(spreadsheet_id, mess_id):
    """Get a list of available months from data sheets."""
    months = set()
    for sheet_name in ["Meals", "Costs", "Deposits"]:
        records = get_all_records(spreadsheet_id, sheet_name)
        for record in records:
            if record.get('Mess ID') == mess_id and record.get('Date'):
                try:
                    date = datetime.datetime.strptime(record['Date'], "%Y-%m-%d")
                    months.add(date.strftime("%Y-%m"))
                except ValueError:
                    continue
    return sorted(list(months), reverse=True)

def mark_notification_as_read(spreadsheet_id, notification_id):
    return update_notification(spreadsheet_id, notification_id, {"Read": True})

def mark_all_notifications_as_read(spreadsheet_id, user_id):
    sheet = get_sheet(spreadsheet_id, "Notifications")
    records = sheet.get_all_records()
    headers = sheet.row_values(1)
    read_col_index = headers.index("Read") + 1
    user_id_col_index = headers.index("User ID") + 1

    updates = []
    for i, record in enumerate(records):
        if record.get('User ID') == user_id and str(record.get('Read')) == 'False':
            row_index = i + 2
            updates.append({
                'range': gspread.utils.rowcol_to_a1(row_index, read_col_index),
                'values': [['TRUE']]
            })
    
    if updates:
        sheet.batch_update(updates)
        cache.clear()
        return True
    return False
