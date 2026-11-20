from sheets import setup_sheets, add_member, get_members, update_member, delete_member, add_meal, get_meals, update_meal, delete_meal, add_cost, get_costs, update_cost, delete_cost
import datetime

SHEET_ID = "17eQtWRrZOrEacFKlMPCEgdbIsArAF3eYVkMZ0UvN0bY"

def display_menu():
    print("\n--- Mess Management App ---")
    print("1. Setup Sheets")
    print("--- Member Management ---")
    print("2. Add Member")
    print("3. View Members")
    print("4. Update Member")
    print("5. Delete Member")
    print("--- Meal Management ---")
    print("6. Add Meal Entry")
    print("7. View Meal Entries")
    print("8. Update Meal Entry")
    print("9. Delete Meal Entry")
    print("--- Cost Management ---")
    print("10. Add Cost Entry")
    print("11. View Cost Entries")
    print("12. Update Cost Entry")
    print("13. Delete Cost Entry")
    print("14. Exit")

def handle_add_member():
    print("\n--- Add New Member ---")
    member_id = input("Enter Member ID (e.g., M001): ")
    name = input("Enter Name: ")
    phone = input("Enter Phone: ")
    email = input("Enter Email: ")
    join_date = datetime.date.today().strftime("%Y-%m-%d")
    status = input("Enter Status (e.g., Active, Inactive): ")
    
    member_data = [member_id, name, phone, email, join_date, status]
    add_member(SHEET_ID, member_data)

def handle_view_members():
    print("\n--- All Members ---")
    members = get_members(SHEET_ID)
    if members:
        for member in members:
            print(member)
    else:
        print("No members found.")

def handle_update_member():
    print("\n--- Update Member ---")
    member_id = input("Enter Member ID to update: ")
    
    print("Enter new values (leave blank to keep current value):")
    new_name = input("New Name: ")
    new_phone = input("New Phone: ")
    new_email = input("New Email: ")
    new_status = input("New Status: ")

    new_data = {}
    if new_name: new_data["Name"] = new_name
    if new_phone: new_data["Phone"] = new_phone
    if new_email: new_data["Email"] = new_email
    if new_status: new_data["Status"] = new_status

    if new_data:
        update_member(SHEET_ID, member_id, new_data)
    else:
        print("No valid columns to update.")

def handle_delete_member():
    print("\n--- Delete Member ---")
    member_id = input("Enter Member ID to delete: ")
    delete_member(SHEET_ID, member_id)

def handle_add_meal():
    print("\n--- Add New Meal Entry ---")
    meal_id = input("Enter Meal ID (e.g., MEAL001): ")
    date = input("Enter Date (YYYY-MM-DD): ")
    member_id = input("Enter Member ID: ")
    breakfast = input("Breakfast (0 or 1): ")
    lunch = input("Lunch (0 or 1): ")
    dinner = input("Dinner (0 or 1): ")
    total_meals = int(breakfast) + int(lunch) + int(dinner)

    meal_data = [meal_id, date, member_id, breakfast, lunch, dinner, total_meals]
    add_meal(SHEET_ID, meal_data)

def handle_view_meals():
    print("\n--- All Meal Entries ---")
    meals = get_meals(SHEET_ID)
    if meals:
        for meal in meals:
            print(meal)
    else:
        print("No meal entries found.")

def handle_update_meal():
    print("\n--- Update Meal Entry ---")
    meal_id = input("Enter Meal ID to update: ")

    print("Enter new values (leave blank to keep current value):")
    new_date = input("New Date (YYYY-MM-DD): ")
    new_member_id = input("New Member ID: ")
    new_breakfast = input("New Breakfast (0 or 1): ")
    new_lunch = input("New Lunch (0 or 1): ")
    new_dinner = input("New Dinner (0 or 1): ")

    new_data = {}
    if new_date: new_data["Date"] = new_date
    if new_member_id: new_data["Member ID"] = new_member_id
    if new_breakfast: new_data["Breakfast"] = new_breakfast
    if new_lunch: new_data["Lunch"] = new_lunch
    if new_dinner: new_data["Dinner"] = new_dinner
    
    if new_breakfast or new_lunch or new_dinner:
        current_meal_data = next((meal for meal in get_meals(SHEET_ID) if meal.get("Meal ID") == meal_id), None)
        if current_meal_data:
            b = int(new_breakfast) if new_breakfast else int(current_meal_data.get("Breakfast", 0))
            l = int(new_lunch) if new_lunch else int(current_meal_data.get("Lunch", 0))
            d = int(new_dinner) if new_dinner else int(current_meal_data.get("Dinner", 0))
            new_data["Total Meals"] = b + l + d

    if new_data:
        update_meal(SHEET_ID, meal_id, new_data)
    else:
        print("No valid columns to update.")

def handle_delete_meal():
    print("\n--- Delete Meal Entry ---")
    meal_id = input("Enter Meal ID to delete: ")
    delete_meal(SHEET_ID, meal_id)

def handle_add_cost():
    print("\n--- Add New Cost Entry ---")
    cost_id = input("Enter Cost ID (e.g., COST001): ")
    date = input("Enter Date (YYYY-MM-DD): ")
    description = input("Enter Description: ")
    amount = input("Enter Amount: ")
    paid_by_member_id = input("Enter Member ID who paid (leave blank if not by member): ")
    category = input("Enter Category (e.g., Groceries, Rent): ")

    cost_data = [cost_id, date, description, amount, paid_by_member_id, category]
    add_cost(SHEET_ID, cost_data)

def handle_view_costs():
    print("\n--- All Cost Entries ---")
    costs = get_costs(SHEET_ID)
    if costs:
        for cost in costs:
            print(cost)
    else:
        print("No cost entries found.")

def handle_update_cost():
    print("\n--- Update Cost Entry ---")
    cost_id = input("Enter Cost ID to update: ")

    print("Enter new values (leave blank to keep current value):")
    new_date = input("New Date (YYYY-MM-DD): ")
    new_description = input("New Description: ")
    new_amount = input("New Amount: ")
    new_paid_by_member_id = input("New Member ID who paid: ")
    new_category = input("New Category: ")

    new_data = {}
    if new_date: new_data["Date"] = new_date
    if new_description: new_data["Description"] = new_description
    if new_amount: new_data["Amount"] = new_amount
    if new_paid_by_member_id: new_data["Paid By Member ID"] = new_paid_by_member_id
    if new_category: new_data["Category"] = new_category

    if new_data:
        update_cost(SHEET_ID, cost_id, new_data)
    else:
        print("No valid columns to update.")

def handle_delete_cost():
    print("\n--- Delete Cost Entry ---")
    cost_id = input("Enter Cost ID to delete: ")
    delete_cost(SHEET_ID, cost_id)

def main():
    while True:
        display_menu()
        choice = input("Enter your choice: ")

        if choice == '1':
            setup_sheets(SHEET_ID)
        elif choice == '2':
            handle_add_member()
        elif choice == '3':
            handle_view_members()
        elif choice == '4':
            handle_update_member()
        elif choice == '5':
            handle_delete_member()
        elif choice == '6':
            handle_add_meal()
        elif choice == '7':
            handle_view_meals()
        elif choice == '8':
            handle_update_meal()
        elif choice == '9':
            handle_delete_meal()
        elif choice == '10':
            handle_add_cost()
        elif choice == '11':
            handle_view_costs()
        elif choice == '12':
            handle_update_cost()
        elif choice == '13':
            handle_delete_cost()
        elif choice == '14':
            print("Exiting application. Goodbye!")
            break
        else:
            print("Invalid choice. Please try again.")

if __name__ == "__main__":
    main()