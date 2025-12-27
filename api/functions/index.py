from sheets import setup_sheets, add_member, get_members, update_member, delete_member, add_meal, get_meals, update_meal, delete_meal, add_cost, get_costs, update_cost, delete_cost, add_deposit, get_deposits, add_user, get_user, create_mess, get_messes, update_user, get_mess_details, delete_mess, get_all_users, get_user_by_id, update_mess_manager_role, add_meal_request, add_bazar_date, get_bazar_dates, add_notification, mark_notification_as_read, get_notifications, get_all_records, get_available_months, mark_all_notifications_as_read
import datetime
import uuid
import random
import string
from flask import Flask, render_template, request, jsonify
from flask_cors import CORS
import serverless_wsgi

app = Flask(__name__)
CORS(app)

import os
# ... (rest of the imports)

SHEET_ID = os.environ.get("SHEET_ID", "17eQtWRrZOrEacFKlMPCEgdbIsArAF3eYVkMZ0UvN0bY")


@app.route('/api/check_username', methods=['GET'])
def api_check_username():
    username = request.args.get('username')
    if not username:
        return jsonify({'error': 'Username parameter is required'}), 400
    user_exists = bool(get_user(SHEET_ID, username))
    return jsonify({'exists': user_exists})

@app.route('/api/users', methods=['GET'])
def api_get_users():
    users = get_all_users(SHEET_ID)
    return jsonify(users)

@app.route('/api/register', methods=['POST'])
def api_register():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')
    email = data.get('email', '') # Get email, default to empty string if not provided
    if not username or not password:
        return jsonify({'error': 'Username and password are required'}), 400

    if get_user(SHEET_ID, username):
        return jsonify({'error': 'User already exists'}), 400

    # Generate a unique User ID
    user_id = str(uuid.uuid4())
    # Add email to user_data
    add_user(SHEET_ID, [user_id, username, password, 'user', '', email]) # Empty Mess ID initially, add email
    return jsonify({'success': True})

@app.route('/api/create_mess', methods=['POST'])
def api_create_mess():
    data = request.get_json()
    mess_name = data.get('mess_name')
    location = data.get('location')
    creator_user_id = data.get('creator_user_id')

    if not mess_name or not creator_user_id or not location:
        return jsonify({'error': 'Mess name, location, and creator user ID are required'}), 400

    mess_id = str(uuid.uuid4())
    create_mess(SHEET_ID, [mess_id, mess_name, creator_user_id, location])

    # Update the creator's user entry with the new mess ID and role
    update_user(SHEET_ID, creator_user_id, {"Mess ID": mess_id, "Role": "member"})

    # Add the creator to the Members sheet
    users = get_all_users(SHEET_ID)
    creator_user = next((user for user in users if user['User ID'] == creator_user_id), None)

    if creator_user:
        member_data = [
            str(uuid.uuid4()),  # Member ID
            creator_user['Username'],
            creator_user.get('Phone', ''),
            creator_user.get('Email', ''),
            datetime.date.today().strftime("%Y-%m-%d"),
            "Active",
            mess_id
        ]
        add_member(SHEET_ID, member_data)

    return jsonify({'success': True, 'mess_id': mess_id})

@app.route('/api/login', methods=['POST'])
def api_login():
    data = request.get_json()
    username = data.get('username')
    password = data.get('password')

    user = get_user(SHEET_ID, username)
    if user and user.get('Password') == password:
        # Get members of the mess
        members = get_members(SHEET_ID, user.get('Mess ID'))
        # Find the member corresponding to the user
        member = next((m for m in members if m.get('Name') == user.get('Username')), None)
        if member:
            user['Member ID'] = member.get('Member ID')
        return jsonify({'success': True, 'user': user})
    else:
        return jsonify({'error': 'Invalid credentials'}), 401

@app.route('/api/members', methods=['GET'])
def api_get_members():
    mess_id = request.args.get('mess_id')
    requesting_user_id = request.args.get('requesting_user_id')

    members = get_members(SHEET_ID, mess_id)
    users = get_all_users(SHEET_ID)
    users_by_id = {user['User ID']: user for user in users}
    users_by_name = {user['Username']: user for user in users}

    requesting_user = users_by_id.get(requesting_user_id)
    is_mess_manager = requesting_user and requesting_user.get('Role') == 'mess manager' and requesting_user.get('Mess ID') == mess_id

    for member in members:
        user = users_by_name.get(member['Name'])
        if user:
            member['Role'] = user.get('Role', 'user')
            member['User ID'] = user.get('User ID') # Add User ID
            if is_mess_manager:
                member['Password'] = user.get('Password') # Add Password if mess manager
        else:
            member['Role'] = 'user' # Default role if user not found
            member['User ID'] = None # Default User ID if user not found
            if is_mess_manager:
                member['Password'] = None # Default Password if user not found

    return jsonify(members)

@app.route('/api/my_mess', methods=['GET'])
def api_get_my_mess():
    mess_id = request.args.get('mess_id')
    if not mess_id:
        return jsonify({'error': 'Mess ID is required'}), 400
    mess = get_mess_details(SHEET_ID, mess_id)
    if mess:
        return jsonify({'success': True, 'mess': mess})
    else:
        return jsonify({'error': 'Mess not found'}), 404

@app.route('/api/members', methods=['POST'])
def api_add_member():
    data = request.get_json()
    mess_id = data.get('mess_id')
    username = data.get('username')

    if not mess_id or not username:
        return jsonify({'error': 'Mess ID and username are required'}), 400

    user = get_user(SHEET_ID, username)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    # Generate a 6-digit random password
    generated_password = "123456"

    # Update user's password, assign Mess ID, and set Role to member
    update_user(SHEET_ID, user['User ID'], {"Password": generated_password, "Mess ID": mess_id, "Role": "member"})

    # Add member to Members sheet
    member_data = [
        str(uuid.uuid4()), # Member ID
        user['Username'],
        user['Phone'] if 'Phone' in user else '',
        user['Email'] if 'Email' in user else '',
        datetime.date.today().strftime("%Y-%m-%d"),
        "Active",
        mess_id
    ]
    add_member(SHEET_ID, member_data)

    # Add notification for all members in the mess
    all_mess_members = get_members(SHEET_ID, mess_id)
    for member in all_mess_members:
        user_to_notify = get_user(SHEET_ID, member['Name'])
        if user_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user_to_notify['User ID'],
                mess_id,
                'new_member',
                member_data[0], # Member ID of the new member
                f"A new member '{user['Username']}' has been added to the mess.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({'success': True, 'generated_password': generated_password})

@app.route('/api/members/<member_id>', methods=['PUT'])
def api_update_member(member_id):
    new_data = request.get_json()

    # Get existing member data to find Mess ID and other details for notification
    all_members = get_all_records(SHEET_ID, "Members")
    member_to_update = next((m for m in all_members if m['Member ID'] == member_id), None)

    if not member_to_update:
        return jsonify({"error": "Member not found"}), 404

    mess_id = member_to_update.get('Mess ID')

    update_member(SHEET_ID, member_id, new_data)

    # Add notification for the updated member
    user_to_notify = get_user(SHEET_ID, member_to_update['Name'])
    if user_to_notify:
        notification_data = [
            str(uuid.uuid4()),
            user_to_notify['User ID'],
            mess_id,
            'member_updated',
            member_id,
            f"Your member information has been updated.",
            datetime.datetime.now().isoformat(),
            'False'
        ]
        add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/members/<member_id>', methods=['DELETE'])
def api_delete_member(member_id):
    # Get member details before deleting for notification message
    all_members = get_all_records(SHEET_ID, "Members")
    deleted_member = next((m for m in all_members if m['Member ID'] == member_id), None)
    
    if not deleted_member:
        return jsonify({"error": "Member not found"}), 404

    mess_id = deleted_member.get('Mess ID')

    delete_member(SHEET_ID, member_id)

    # Notify all remaining members
    if mess_id:
        remaining_members = get_members(SHEET_ID, mess_id)
        for member in remaining_members:
            user_to_notify = get_user(SHEET_ID, member['Name'])
            if user_to_notify:
                notification_data = [
                    str(uuid.uuid4()),
                    user_to_notify['User ID'],
                    mess_id,
                    'member_deleted',
                    member_id,
                    f"Member '{deleted_member['Name']}' has been removed from the mess.",
                    datetime.datetime.now().isoformat(),
                    'False'
                ]
                add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/meals', methods=['GET'])
def api_get_meals():
    mess_id = request.args.get('mess_id')
    month = request.args.get('month')
    meals = get_meals(SHEET_ID, mess_id, month)
    return jsonify(meals)

@app.route('/api/meals_by_date', methods=['GET'])
def api_get_meals_by_date():
    mess_id = request.args.get('mess_id')
    date = request.args.get('date')
    if not mess_id or not date:
        return jsonify({'error': 'Mess ID and date are required'}), 400
    
    all_meals = get_meals(SHEET_ID, mess_id)
    meals_on_date = [meal for meal in all_meals if meal.get('Date') == date]
    
    return jsonify(meals_on_date)

@app.route('/api/meals', methods=['POST'])
def api_add_meal():
    data = request.get_json()
    mess_id = data.get('Mess ID')
    member_id = data.get('Member ID')
    date = data.get('Date')
    requesting_user_id = data.get('requesting_user_id')

    if not all([mess_id, member_id, date, requesting_user_id]):
        return jsonify({'error': 'Mess ID, Member ID, Date, and Requesting User ID are required'}), 400

    requesting_user = get_user_by_id(SHEET_ID, requesting_user_id)

    if not requesting_user:
        return jsonify({'error': 'Requesting user not found'}), 404

    # Check if the requesting user is a mess manager
    if requesting_user.get('Role') != 'mess manager':
        # Regular member can only add meals for themselves
        members_in_mess = get_members(SHEET_ID, mess_id)
        users = get_all_users(SHEET_ID)
        users_by_name = {user['Username']: user for user in users}

        for member in members_in_mess:
            user = users_by_name.get(member['Name'])
            if user:
                member['User ID'] = user.get('User ID')

        requesting_member = next((m for m in members_in_mess if m.get('User ID') == requesting_user_id), None)

        if not requesting_member or requesting_member.get('Member ID') != member_id:
            return jsonify({'error': 'You can only add meals for yourself. Only mess managers can add meals for other members.'}), 403

    # Check for existing meal
    all_meals = get_meals(SHEET_ID, mess_id)
    existing_meal = next((meal for meal in all_meals if meal.get('Date') == date and meal.get('Member ID') == member_id), None)

    if existing_meal:
        # Meal already exists, so we update it
        meal_id = existing_meal.get('Meal ID')
        new_data = {
            'Breakfast': data.get('Breakfast'),
            'Lunch': data.get('Lunch'),
            'Dinner': data.get('Dinner'),
            'Total Meals': data.get('Total Meals'),
        }
        update_meal(SHEET_ID, meal_id, new_data)

        # Add notification for the updated meal's member
        members = get_all_records(SHEET_ID, "Members")
        meal_member = next((m for m in members if m['Member ID'] == member_id), None)
        if meal_member:
            users_to_notify = []
            if requesting_user.get('Role') == 'mess manager':
                all_mess_members = get_members(SHEET_ID, mess_id)
                for member in all_mess_members:
                    user = get_user(SHEET_ID, member['Name'])
                    if user:
                        users_to_notify.append(user)
            else:
                user_to_notify = get_user(SHEET_ID, meal_member['Name'])
                if user_to_notify:
                    users_to_notify.append(user_to_notify)

                all_mess_members = get_members(SHEET_ID, mess_id)
                for member in all_mess_members:
                    user = get_user(SHEET_ID, member['Name'])
                    if user and user.get('Role') == 'mess manager' and user['User ID'] not in [u['User ID'] for u in users_to_notify]:
                        users_to_notify.append(user)

            for user in users_to_notify:
                notification_data = [
                    str(uuid.uuid4()),
                    user['User ID'],
                    mess_id,
                    'meal_updated',
                    meal_id,
                    f"Meal for {meal_member['Name']} on {date} has been updated.",
                    datetime.datetime.now().isoformat(),
                    'False'
                ]
                add_notification(SHEET_ID, notification_data)

        return jsonify({"success": True, "message": "Meal updated successfully."})

    meal_data = [
        data.get('Meal ID'),
        date,
        member_id,
        data.get('Breakfast'),
        data.get('Lunch'),
        data.get('Dinner'),
        data.get('Total Meals'),
        mess_id
    ]
    add_meal(SHEET_ID, meal_data)

    # Add notification for the new meal's member
    members = get_all_records(SHEET_ID, "Members")
    meal_member = next((m for m in members if m['Member ID'] == member_id), None)
    if meal_member:
        users_to_notify = []
        if requesting_user.get('Role') == 'mess manager':
            all_mess_members = get_members(SHEET_ID, mess_id)
            for member in all_mess_members:
                user = get_user(SHEET_ID, member['Name'])
                if user:
                    users_to_notify.append(user)
        else:
            user_to_notify = get_user(SHEET_ID, meal_member['Name'])
            if user_to_notify:
                users_to_notify.append(user_to_notify)

            all_mess_members = get_members(SHEET_ID, mess_id)
            for member in all_mess_members:
                user = get_user(SHEET_ID, member['Name'])
                if user and user.get('Role') == 'mess manager' and user['User ID'] not in [u['User ID'] for u in users_to_notify]:
                    users_to_notify.append(user)

        for user in users_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user['User ID'],
                mess_id,
                'new_meal',
                data.get('Meal ID'),
                f"A new meal has been added for {meal_member['Name']} on {date}.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/meal_requests', methods=['POST'])
def api_add_meal_request():
    data = request.get_json()
    mess_id = data.get('mess_id')
    requesting_user_id = data.get('requesting_user_id')
    message = data.get('message')
    request_date = data.get('request_date')

    if not all([mess_id, requesting_user_id, message, request_date]):
        return jsonify({'error': 'Mess ID, Requesting User ID, Message, and Request Date are required'}), 400

    request_id = str(uuid.uuid4())
    # Initial status is 'Pending'
    request_data = [
        request_id,
        mess_id,
        requesting_user_id,
        message,
        request_date,
        'Pending',
        '', # Manager User ID (empty initially)
        ''  # Approval Date (empty initially)
    ]
    try:
        add_meal_request(SHEET_ID, request_data)
        return jsonify({"success": True, "message": "Meal request submitted successfully."})
    except Exception as e:
        print(f"Error adding meal request to sheet: {e}")
        return jsonify({"success": False, "error": f"Failed to add meal request to database: {str(e)}"}, 500)

@app.route('/api/meals/<meal_id>', methods=['PUT'])
def api_update_meal(meal_id):
    new_data = request.get_json()

    # Get existing meal data for notification
    all_meals = get_all_records(SHEET_ID, "Meals")
    meal_to_update = next((m for m in all_meals if m['Meal ID'] == meal_id), None)

    if not meal_to_update:
        return jsonify({"error": "Meal not found"}), 404

    mess_id = meal_to_update.get('Mess ID')
    update_meal(SHEET_ID, meal_id, new_data)

    # Add notification for the updated meal's member
    members = get_all_records(SHEET_ID, "Members")
    meal_member = next((m for m in members if m['Member ID'] == meal_to_update['Member ID']), None)
    if meal_member:
        user_to_notify = get_user(SHEET_ID, meal_member['Name'])
        if user_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user_to_notify['User ID'],
                mess_id,
                'meal_updated',
                meal_id,
                f"Your meal for {meal_to_update['Date']} has been updated.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/meals/<meal_id>', methods=['DELETE'])
def api_delete_meal(meal_id):
    # Get meal details before deleting
    all_meals = get_all_records(SHEET_ID, "Meals")
    deleted_meal = next((m for m in all_meals if m['Meal ID'] == meal_id), None)

    if not deleted_meal:
        return jsonify({"error": "Meal not found"}), 404

    mess_id = deleted_meal.get('Mess ID')

    delete_meal(SHEET_ID, meal_id)

    if deleted_meal:
        members = get_all_records(SHEET_ID, "Members")
        meal_member = next((m for m in members if m['Member ID'] == deleted_meal['Member ID']), None)
        if meal_member:
            user_to_notify = get_user(SHEET_ID, meal_member['Name'])
            if user_to_notify:
                notification_data = [
                    str(uuid.uuid4()),
                    user_to_notify['User ID'],
                    mess_id,
                    'meal_deleted',
                    meal_id,
                    f"Your meal for {deleted_meal['Date']} has been deleted.",
                    datetime.datetime.now().isoformat(),
                    'False'
                ]
                add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/costs', methods=['GET'])
def api_get_costs():
    mess_id = request.args.get('mess_id')
    month = request.args.get('month')
    costs = get_costs(SHEET_ID, mess_id, month)
    return jsonify(costs)

@app.route('/api/costs', methods=['POST'])
def api_add_cost():
    data = request.get_json()
    mess_id = data.get('Mess ID')
    add_as_deposit = data.get('add_as_deposit')
    requesting_user_id = data.get('requesting_user_id') # Get requesting user ID

    cost_data = [
        data.get('Cost ID'),
        data.get('Date'),
        data.get('Description'),
        data.get('Amount'),
        data.get('Paid By Member ID'),
        data.get('Category'),
        mess_id
    ]
    add_cost(SHEET_ID, cost_data)

    if add_as_deposit:
        member_id_for_deposit = data.get('Paid By Member ID')
        deposit_amount = data.get('Amount')
        deposit_date = data.get('Date')

        requesting_user = get_user_by_id(SHEET_ID, requesting_user_id)

        if not requesting_user:
            return jsonify({'error': 'Requesting user not found for deposit creation'}), 404

        # Authorization logic for deposit
        if requesting_user.get('Role') != 'mess manager':
            members_in_mess = get_members(SHEET_ID, mess_id)
            users = get_all_users(SHEET_ID)
            users_by_name = {user['Username']: user for user in users}

            requesting_member = None
            for member in members_in_mess:
                user = users_by_name.get(member['Name'])
                if user and user.get('User ID') == requesting_user_id:
                    requesting_member = member
                    break

            if not requesting_member or requesting_member.get('Member ID') != member_id_for_deposit:
                return jsonify({'error': 'You can only add deposits for yourself when adding cost as deposit. Only mess managers can add deposits for other members.'}), 403

        # If authorized, add the deposit
        deposit_data_to_add = [
            str(uuid.uuid4()), # Deposit ID
            deposit_date,
            member_id_for_deposit,
            deposit_amount,
            mess_id
        ]
        add_deposit(SHEET_ID, deposit_data_to_add)

    # Add notification for all members in the mess
    all_mess_members = get_members(SHEET_ID, mess_id)
    paid_by_member = next((m for m in all_mess_members if m['Member ID'] == data.get('Paid By Member ID')), None)
    paid_by_name = paid_by_member['Name'] if paid_by_member else 'Unknown'

    for member in all_mess_members:
        user_to_notify = get_user(SHEET_ID, member['Name'])
        if user_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user_to_notify['User ID'],
                mess_id,
                'new_cost',
                data.get('Cost ID'),
                f"A new cost of {data.get('Amount')} for '{data.get('Description')}' was added by {paid_by_name}.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/costs/<cost_id>', methods=['PUT'])
def api_update_cost(cost_id):
    new_data = request.get_json()

    # Get existing cost data for notification
    all_costs = get_all_records(SHEET_ID, "Costs")
    cost_to_update = next((c for c in all_costs if c['Cost ID'] == cost_id), None)

    if not cost_to_update:
        return jsonify({"error": "Cost not found"}), 404

    mess_id = cost_to_update.get('Mess ID')
    update_cost(SHEET_ID, cost_id, new_data)

    # Add notification for all members in the mess
    all_mess_members = get_members(SHEET_ID, mess_id)
    for member in all_mess_members:
        user_to_notify = get_user(SHEET_ID, member['Name'])
        if user_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user_to_notify['User ID'],
                mess_id,
                'cost_updated',
                cost_id,
                f"A cost with description '{new_data.get('Description')}' has been updated.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/costs/<cost_id>', methods=['DELETE'])
def api_delete_cost(cost_id):
    # Get cost details before deleting
    all_costs = get_all_records(SHEET_ID, "Costs")
    deleted_cost = next((c for c in all_costs if c['Cost ID'] == cost_id), None)

    if not deleted_cost:
        return jsonify({"error": "Cost not found"}), 404

    mess_id = deleted_cost.get('Mess ID')

    delete_cost(SHEET_ID, cost_id)

    if deleted_cost:
        all_mess_members = get_members(SHEET_ID, mess_id)
        for member in all_mess_members:
            user_to_notify = get_user(SHEET_ID, member['Name'])
            if user_to_notify:
                notification_data = [
                    str(uuid.uuid4()),
                    user_to_notify['User ID'],
                    mess_id,
                    'cost_deleted',
                    cost_id,
                    f"The cost for '{deleted_cost['Description']}' has been deleted.",
                    datetime.datetime.now().isoformat(),
                    'False'
                ]
                add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/deposits', methods=['GET'])
def api_get_deposits():
    mess_id = request.args.get('mess_id')
    month = request.args.get('month')
    deposits = get_deposits(SHEET_ID, mess_id, month)
    return jsonify(deposits)

@app.route('/api/deposits', methods=['POST'])
def api_add_deposit():
    data = request.get_json()
    mess_id = data.get('Mess ID')
    member_id = data.get('Member ID')
    requesting_user_id = data.get('requesting_user_id')

    if not all([mess_id, member_id, requesting_user_id]):
        return jsonify({'error': 'Mess ID, Member ID, and Requesting User ID are required'}), 400

    requesting_user = get_user_by_id(SHEET_ID, requesting_user_id)

    if not requesting_user:
        return jsonify({'error': 'Requesting user not found'}), 404

    # Authorization logic
    if requesting_user.get('Role') != 'mess manager':
        # If not a mess manager, check if the deposit is for their own member ID
        members_in_mess = get_members(SHEET_ID, mess_id)
        users = get_all_users(SHEET_ID)
        users_by_name = {user['Username']: user for user in users}

        requesting_member = None
        for member in members_in_mess:
            user = users_by_name.get(member['Name'])
            if user and user.get('User ID') == requesting_user_id:
                requesting_member = member
                break

        if not requesting_member or requesting_member.get('Member ID') != member_id:
            return jsonify({'error': 'You can only add deposits for yourself. Only mess managers can add deposits for other members.'}), 403

    deposit_data = [
        data.get('Deposit ID'),
        data.get('Date'),
        member_id, # Use the member_id from the request
        data.get('Amount'),
        mess_id
    ]
    add_deposit(SHEET_ID, deposit_data)

    # Add notification for the member and mess managers
    all_mess_members = get_members(SHEET_ID, mess_id)
    depositing_member = next((m for m in all_mess_members if m['Member ID'] == member_id), None)
    
    if depositing_member:
        users_to_notify = []
        # Notify the member who made the deposit
        user_to_notify = get_user(SHEET_ID, depositing_member['Name'])
        if user_to_notify: 
            users_to_notify.append(user_to_notify)

        # Notify all mess managers
        for member in all_mess_members:
            user = get_user(SHEET_ID, member['Name'])
            if user and user.get('Role') == 'mess manager' and user['User ID'] not in [u['User ID'] for u in users_to_notify]:
                users_to_notify.append(user)

        for user in users_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user['User ID'],
                mess_id,
                'new_deposit',
                data.get('Deposit ID'),
                f"A deposit of {data.get('Amount')} was recorded for {depositing_member['Name']}.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/deposits/<deposit_id>', methods=['PUT'])
def api_update_deposit(deposit_id):
    new_data = request.get_json()

    # Get existing deposit data for notification
    all_deposits = get_all_records(SHEET_ID, "Deposits")
    deposit_to_update = next((d for d in all_deposits if d['Deposit ID'] == deposit_id), None)

    if not deposit_to_update:
        return jsonify({"error": "Deposit not found"}), 404

    mess_id = deposit_to_update.get('Mess ID')
    update_deposit(SHEET_ID, deposit_id, new_data)

    # Add notification for the updated deposit's member
    members = get_all_records(SHEET_ID, "Members")
    deposit_member = next((m for m in members if m['Member ID'] == deposit_to_update['Member ID']), None)
    if deposit_member:
        user_to_notify = get_user(SHEET_ID, deposit_member['Name'])
        if user_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user_to_notify['User ID'],
                mess_id,
                'deposit_updated',
                deposit_id,
                f"Your deposit of {new_data.get('Amount')} has been updated.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/deposits/<deposit_id>', methods=['DELETE'])
def api_delete_deposit(deposit_id):
    # Get deposit details before deleting
    all_deposits = get_all_records(SHEET_ID, "Deposits")
    deleted_deposit = next((d for d in all_deposits if d['Deposit ID'] == deposit_id), None)

    if not deleted_deposit:
        return jsonify({"error": "Deposit not found"}), 404

    mess_id = deleted_deposit.get('Mess ID')

    delete_deposit(SHEET_ID, deposit_id)

    if deleted_deposit:
        members = get_all_records(SHEET_ID, "Members")
        deposit_member = next((m for m in members if m['Member ID'] == deleted_deposit['Member ID']), None)
        if deposit_member:
            user_to_notify = get_user(SHEET_ID, deposit_member['Name'])
            if user_to_notify:
                notification_data = [
                    str(uuid.uuid4()),
                    user_to_notify['User ID'],
                    mess_id,
                    'deposit_deleted',
                    deposit_id,
                    f"Your deposit of {deleted_deposit['Amount']} has been deleted.",
                    datetime.datetime.now().isoformat(),
                    'False'
                ]
                add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/delete_mess/<mess_id>', methods=['DELETE'])
def api_delete_mess(mess_id):
    user_id = request.args.get('user_id') # Assuming user_id is passed as a query parameter

    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    user = get_user_by_id(SHEET_ID, user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.get('Role') != 'mess manager':
        return jsonify({'error': 'Only mess managers can delete a mess'}), 403

    if user.get('Mess ID') != mess_id:
        return jsonify({'error': 'You can only delete the mess you manage'}), 403

    success = delete_mess(SHEET_ID, mess_id)
    if success:
        return jsonify({'success': True, 'message': 'Mess deleted successfully'})
    else:
        return jsonify({'error': 'Failed to delete mess or mess not found'}), 500

@app.route('/api/mess/transfer_manager', methods=['POST'])
def api_transfer_mess_manager():
    data = request.get_json()
    mess_id = data.get('mess_id')
    old_manager_user_id = data.get('old_manager_user_id')
    new_manager_user_id = data.get('new_manager_user_id')

    if not all([mess_id, old_manager_user_id, new_manager_user_id]):
        return jsonify({'error': 'Mess ID, old manager User ID, and new manager User ID are required'}), 400

    # In a real application, you would verify the current user making the request
    # is the old_manager_user_id or an admin.
    # For now, we rely on the sheets.py function to do the role validation.

    success = update_mess_manager_role(SHEET_ID, mess_id, old_manager_user_id, new_manager_user_id)

    if success:
        return jsonify({'success': True, 'message': 'Mess manager role transferred successfully.'})
    else:
        return jsonify({'error': 'Failed to transfer mess manager role. Check logs for details.'}), 500

@app.route('/api/user/<user_id>', methods=['GET'])
def api_get_user_by_id(user_id):
    user = get_user_by_id(SHEET_ID, user_id)
    if user:
        return jsonify(user)
    else:
        return jsonify({'error': 'User not found'}), 404

@app.route('/api/admin/grant_mess_manager', methods=['POST'])
def api_admin_grant_mess_manager():
    data = request.get_json()
    user_id = data.get('user_id')
    mess_id = data.get('mess_id')

    if not user_id or not mess_id:
        return jsonify({'error': 'User ID and Mess ID are required'}), 400

    # In a real application, this endpoint would be heavily secured
    # with proper authentication and authorization checks for an admin user.

    user = get_user_by_id(SHEET_ID, user_id)
    if not user:
        return jsonify({'error': 'User not found'}), 404

    update_user(SHEET_ID, user_id, {"Role": "mess manager", "Mess ID": mess_id})
    return jsonify({'success': True, 'message': f'User {user_id} granted mess manager role for mess {mess_id}.'})

@app.route('/api/mess/elect-manager', methods=['POST'])
def api_elect_manager():
    data = request.get_json()
    mess_id = data.get('mess_id')
    new_manager_user_id = data.get('new_manager_user_id')
    requesting_user_id = data.get('requesting_user_id')

    if not all([mess_id, new_manager_user_id, requesting_user_id]):
        return jsonify({'error': 'mess_id, new_manager_user_id, and requesting_user_id are required'}), 400

    requesting_user = get_user_by_id(SHEET_ID, requesting_user_id)

    if not requesting_user or requesting_user.get('Role') != 'mess manager' or requesting_user.get('Mess ID') != mess_id:
        return jsonify({'error': 'Only the current mess manager can elect a new one'}), 403

    # Find current manager and demote them
    members = get_members(SHEET_ID, mess_id)
    users = get_all_users(SHEET_ID)
    
    # Create a mapping from name to user object for easier lookup
    users_by_name = {user['Username']: user for user in users}

    # Demote the old manager (the one making the request) to 'member'
    update_user(SHEET_ID, requesting_user_id, {'Role': 'member'})

    # Promote the new manager
    update_user(SHEET_ID, new_manager_user_id, {'Role': 'mess manager'})

    # Notify old manager
    old_manager_notification = [
        str(uuid.uuid4()),
        requesting_user_id,
        mess_id,
        'role_change',
        requesting_user_id,
        f"You are no longer the mess manager.",
        datetime.datetime.now().isoformat(),
        'False'
    ]
    add_notification(SHEET_ID, old_manager_notification)

    # Notify new manager
    new_manager_user = get_user_by_id(SHEET_ID, new_manager_user_id)
    new_manager_notification = [
        str(uuid.uuid4()),
        new_manager_user_id,
        mess_id,
        'role_change',
        new_manager_user_id,
        f"You have been elected as the new mess manager.",
        datetime.datetime.now().isoformat(),
        'False'
    ]
    add_notification(SHEET_ID, new_manager_notification)

    updated_requesting_user = get_user_by_id(SHEET_ID, requesting_user_id)

    return jsonify({'success': True, 'message': 'Mess manager elected successfully.', 'updated_user': updated_requesting_user})

@app.route('/api/change_password', methods=['POST'])
def api_change_password():
    data = request.get_json()
    user_id = data.get('user_id')
    current_password = data.get('current_password')
    new_password = data.get('new_password')

    if not all([user_id, current_password, new_password]):
        return jsonify({'error': 'User ID, current password, and new password are required'}), 400

    user = get_user_by_id(SHEET_ID, user_id)

    if not user:
        return jsonify({'error': 'User not found'}), 404

    if user.get('Password') != current_password:
        return jsonify({'error': 'Invalid current password'}), 401

    update_user(SHEET_ID, user_id, {"Password": new_password})

    # Add notification for the user
    notification_data = [
        str(uuid.uuid4()),
        user_id,
        user.get('Mess ID'),
        'password_changed',
        user_id,
        f"Your password has been changed successfully.",
        datetime.datetime.now().isoformat(),
        'False'
    ]
    add_notification(SHEET_ID, notification_data)

    return jsonify({'success': True, 'message': 'Password updated successfully'})


@app.route('/api/notifications', methods=['GET'])
def api_get_notifications():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    notifications_data = get_notifications(SHEET_ID, user_id)
    
    formatted_notifications = []
    for notification in notifications_data:
        formatted_notifications.append({
            "Notification ID": notification.get('Notification ID'),
            "Message": notification.get('Message'),
            "Timestamp": notification.get('Timestamp'),
            "Read": notification.get('Read')
        })

    return jsonify(formatted_notifications)

@app.route('/api/notifications/unread_count', methods=['GET'])
def api_get_unread_notifications_count():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({"error": "User ID is required"}), 400

    notifications_data = get_notifications(SHEET_ID, user_id)
    print(f"Notifications for user {user_id}: {notifications_data}")
    unread_count = 0
    for notification in notifications_data:
        print(f"Notification: {notification}, Read status: {notification.get('Read')}, Type: {type(notification.get('Read'))}")
        if str(notification.get('Read')) == 'False':
            unread_count += 1

    print(f"Unread count for user {user_id}: {unread_count}")
    return jsonify({'unread_count': unread_count})

@app.route('/api/notifications/<notification_id>/read', methods=['PUT'])
def api_mark_notification_as_read(notification_id):
    user_id = request.args.get('user_id') # Ensure the user is authorized to read this
    print(f"Marking notification {notification_id} as read for user {user_id}")
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    notifications = get_all_records(SHEET_ID, "Notifications")
    notification_to_update = next((n for n in notifications if n['Notification ID'] == notification_id), None)

    if not notification_to_update:
        print(f"Notification {notification_id} not found")
        return jsonify({'error': 'Notification not found'}), 404

    if notification_to_update.get('User ID') != user_id:
        print(f"Unauthorized attempt to mark notification {notification_id} as read for user {user_id}")
        return jsonify({'error': 'Unauthorized'}), 403

    success = mark_notification_as_read(SHEET_ID, notification_id)
    if success:
        print(f"Successfully marked notification {notification_id} as read")
        return jsonify({'success': True})
    else:
        print(f"Failed to mark notification {notification_id} as read")
        return jsonify({'error': 'Notification not found or could not be updated'}), 404

@app.route('/api/notifications/read_all', methods=['PUT'])
def api_mark_all_notifications_as_read():
    user_id = request.args.get('user_id')
    if not user_id:
        return jsonify({'error': 'User ID is required'}), 400

    success = mark_all_notifications_as_read(SHEET_ID, user_id)
    if success:
        return jsonify({'success': True})
    else:
        return jsonify({'error': 'Could not update notifications'}), 500

@app.route('/api/bazar_dates', methods=['POST'])
def api_add_bazar_date():
    data = request.get_json()
    mess_id = data.get('mess_id')
    member_id = data.get('member_id')
    start_date_str = data.get('start_date')
    end_date_str = data.get('end_date')
    requesting_user_id = data.get('requesting_user_id')

    if not all([mess_id, member_id, start_date_str, end_date_str, requesting_user_id]):
        return jsonify({'error': 'Mess ID, Member ID, Start Date, End Date, and Requesting User ID are required'}), 400

    requesting_user = get_user_by_id(SHEET_ID, requesting_user_id)

    if not requesting_user or requesting_user.get('Role') != 'mess manager' or requesting_user.get('Mess ID') != mess_id:
        return jsonify({'error': 'Only mess managers can add bazar dates.'}), 403

    start_date = datetime.datetime.strptime(start_date_str, "%Y-%m-%d").date()
    end_date = datetime.datetime.strptime(end_date_str, "%Y-%m-%d").date()

    delta = datetime.timedelta(days=1)
    current_date = start_date

    while current_date <= end_date:
        bazar_id = str(uuid.uuid4())
        bazar_date_data = [
            bazar_id,
            current_date.strftime("%Y-%m-%d"),
            member_id,
            mess_id
        ]
        add_bazar_date(SHEET_ID, bazar_date_data)
        current_date += delta

    # Add notification for the assigned member and mess managers
    all_mess_members = get_members(SHEET_ID, mess_id)
    assigned_member = next((m for m in all_mess_members if m['Member ID'] == member_id), None)

    if assigned_member:
        users_to_notify = []
        # Notify the assigned member
        user_to_notify = get_user(SHEET_ID, assigned_member['Name'])
        if user_to_notify:
            users_to_notify.append(user_to_notify)

        # Notify all mess managers
        for member in all_mess_members:
            user = get_user(SHEET_ID, member['Name'])
            if user and user.get('Role') == 'mess manager' and user['User ID'] not in [u['User ID'] for u in users_to_notify]:
                users_to_notify.append(user)

        for user in users_to_notify:
            notification_data = [
                str(uuid.uuid4()),
                user['User ID'],
                mess_id,
                'bazar_assigned',
                bazar_id, # Using the last generated bazar_id for reference
                f"Bazar duty has been assigned to {assigned_member['Name']} from {start_date_str} to {end_date_str}.",
                datetime.datetime.now().isoformat(),
                'False'
            ]
            add_notification(SHEET_ID, notification_data)

    return jsonify({"success": True})

@app.route('/api/bazar_dates', methods=['GET'])
def api_get_bazar_dates():
    mess_id = request.args.get('mess_id')
    if not mess_id:
        return jsonify({'error': 'Mess ID is required'}), 400
    bazar_dates = get_bazar_dates(SHEET_ID, mess_id)
    return jsonify(bazar_dates)

@app.route('/api/months', methods=['GET'])
def api_get_months():
    mess_id = request.args.get('mess_id')
    if not mess_id:
        return jsonify({'error': 'Mess ID is required'}), 400
    months = get_available_months(SHEET_ID, mess_id)
    return jsonify(months)



def handler(event, context):
    return serverless_wsgi.handle(app, event, context)