from sheets import add_member, add_deposit, add_meal, add_cost, setup_sheets

SHEET_ID = "17eQtWRrZOrEacFKlMPCEgdbIsArAF3eYVkMZ0UvN0bY"

def seed_data():
    # Setup sheets
    setup_sheets(SHEET_ID)

    # Members
    members = [
        ["1", "Alaul", "", "alaul@mm.app", "01/04/2025", "Active"],
        ["2", "Jewel Mahmud", "", "jewelbostonitaly@gmail.com", "01/04/2025", "Active"],
        ["3", "Monju Elahi", "", "monjuelahi@mm.app", "01/04/2025", "Active"],
        ["4", "Rabiul", "", "rabiul@mm.app", "01/04/2025", "Active"],
        ["5", "Rashed", "", "rashed@mm.app", "01/04/2025", "Active"],
    ]
    for member in members:
        add_member(SHEET_ID, member)

    # Deposits
    deposits = [
        ["1", "05/04/2025", "1", "2020"],
        ["2", "05/04/2025", "2", "3320"],
        ["3", "05/04/2025", "3", "2023"],
        ["4", "05/04/2025", "4", "1788"],
    ]
    for deposit in deposits:
        add_deposit(SHEET_ID, deposit)

    # Meals
    meals = [
        ["1", "01/04/2025", "1", "1", "1", "1", "34"],
        ["2", "01/04/2025", "2", "1", "1", "0.5", "31.5"],
        ["3", "01/04/2025", "3", "1", "1", "1", "32"],
        ["4", "01/04/2025", "4", "1", "0.5", "0.5", "25"],
        ["5", "01/04/2025", "5", "0", "0", "0", "0"],
    ]
    for meal in meals:
        add_meal(SHEET_ID, meal)

    # Costs
    costs = [
        # Meal Costs (assuming total meal cost is distributed based on meal rate)
        ["1", "30/04/2025", "Total Meal Cost", "9151", "1", "Meal"],
        # Individual Costs
        ["2", "10/04/2025", "Individual Cost", "3150", "1", "Individual"],
        ["3", "10/04/2025", "Individual Cost", "3150", "2", "Individual"],
        ["4", "10/04/2025", "Individual Cost", "3200", "3", "Individual"],
        ["5", "10/04/2025", "Individual Cost", "2781", "4", "Individual"],
        ["6", "10/04/2025", "Individual Cost", "2200", "5", "Individual"],
        # Shared Costs
        ["7", "15/04/2025", "Shared Cost", "6760", "", "Shared"],
    ]
    for cost in costs:
        add_cost(SHEET_ID, cost)

if __name__ == '__main__':
    seed_data()
