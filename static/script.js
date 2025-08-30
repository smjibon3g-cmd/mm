document.addEventListener('DOMContentLoaded', function() {
    const sidebarLinks = document.querySelectorAll('.sidebar-menu a');
    const pages = document.querySelectorAll('.page');

    // Get current user from localStorage
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));

    // Redirect to login if no current user
    if (!currentUser) {
        window.location.href = '/';
        return;
    }

    // Check if user has a mess_id
    if (!currentUser['Mess ID']) {
        // If no mess_id, hide all pages except create-mess
        pages.forEach(page => {
            if (page.id !== 'create-mess') {
                page.style.display = 'none';
            }
        });
        document.getElementById('create-mess').style.display = 'block';
        alert('You need to create a mess first!');
    }

    sidebarLinks.forEach(link => {
        link.addEventListener('click', function(event) {
            event.preventDefault();
            const targetId = this.getAttribute('href').substring(1);

            sidebarLinks.forEach(l => l.classList.remove('active'));
            this.classList.add('active');

            pages.forEach(page => {
                if (page.id === targetId) {
                    page.style.display = 'block';
                } else {
                    page.style.display = 'none';
                }
            });
        });
    });

    // Show the dashboard by default
    const dashboard = document.getElementById('dashboard');
    if (dashboard) {
        dashboard.style.display = 'block';
    }

    // Create Mess Form Submission
    const createMessForm = document.getElementById('create-mess-form');
    const createMessMessageDiv = document.getElementById('create-mess-message');

    createMessForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const messName = document.getElementById('mess-name').value;
        const messLocation = document.getElementById('mess-location').value;

        try {
            const response = await fetch('/api/create_mess', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mess_name: messName, location: messLocation, creator_user_id: currentUser['User ID'] })
            });
            const data = await response.json();

            if (response.ok) {
                createMessMessageDiv.textContent = `Mess '${messName}' created successfully!`;
                createMessMessageDiv.className = 'message success';
                createMessMessageDiv.style.display = 'block';
                // Update currentUser's mess_id in localStorage
                currentUser['Mess ID'] = data.mess_id;
                localStorage.setItem('currentUser', JSON.stringify(currentUser));
                // Redirect to dashboard or refresh page
                window.location.reload();
            } else {
                createMessMessageDiv.textContent = `Failed to create mess: ${data.error || 'Unknown error'}`;
                createMessMessageDiv.className = 'message error';
                createMessMessageDiv.style.display = 'block';
            }
        } catch (error) {
            console.error('Error creating mess:', error);
            createMessMessageDiv.textContent = 'An error occurred while creating the mess.';
            createMessMessageDiv.className = 'message error';
            createMessMessageDiv.style.display = 'block';
        }
    });

    // Add Member to Mess Form Submission
    const addMemberToMessForm = document.getElementById('add-member-to-mess-form');
    const addMemberMessageDiv = document.getElementById('add-member-message');
    const generatedPasswordDisplay = document.getElementById('generated-password-display');
    const generatedPasswordP = document.getElementById('generated-password');

    addMemberToMessForm.addEventListener('submit', async (event) => {
        event.preventDefault();
        const memberUsername = document.getElementById('member-username').value;

        if (!currentUser || !currentUser['Mess ID']) {
            addMemberMessageDiv.textContent = 'Please create or join a mess first.';
            addMemberMessageDiv.className = 'message error';
            addMemberMessageDiv.style.display = 'block';
            return;
        }

        try {
            const response = await fetch('/api/members', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ mess_id: currentUser['Mess ID'], username: memberUsername })
            });
            const data = await response.json();

            if (response.ok) {
                addMemberMessageDiv.textContent = `Member '${memberUsername}' added successfully!`;
                addMemberMessageDiv.className = 'message success';
                addMemberMessageDiv.style.display = 'block';
                generatedPasswordP.textContent = data.generated_password;
                generatedPasswordDisplay.style.display = 'block';
                addMemberToMessForm.reset();
                fetchMembers(); // Refresh member list
            } else {
                addMemberMessageDiv.textContent = `Failed to add member: ${data.error || 'Unknown error'}`;
                addMemberMessageDiv.className = 'message error';
                addMemberMessageDiv.style.display = 'block';
                generatedPasswordDisplay.style.display = 'none';
            }
        } catch (error) {
            console.error('Error adding member:', error);
            addMemberMessageDiv.textContent = 'An error occurred while adding the member.';
            addMemberMessageDiv.className = 'message error';
            addMemberMessageDiv.style.display = 'block';
            generatedPasswordDisplay.style.display = 'none';
        }
    });

    const showAddMemberForm = document.getElementById('show-add-member-form');
    const showCreateMemberForm = document.getElementById('show-create-member-form');
    const addMemberForm = document.getElementById('add-member-form');
    const createMemberFormDiv = document.getElementById('create-member-form');

    if (showAddMemberForm) {
        showAddMemberForm.addEventListener('click', () => {
            addMemberForm.style.display = 'block';
            createMemberFormDiv.style.display = 'none';
        });
    }

    if (showCreateMemberForm) {
        showCreateMemberForm.addEventListener('click', () => {
            addMemberForm.style.display = 'none';
            createMemberFormDiv.style.display = 'block';
        });
    }

    const showAllMemberMealForm = document.getElementById('show-all-member-meal-form');
    const showSingleMemberMealForm = document.getElementById('show-single-member-meal-form');
    const showMealRequestForm = document.getElementById('show-meal-request-form');
    const allMemberMealForm = document.getElementById('all-member-meal-form');
    const singleMemberMealFormDiv = document.getElementById('single-member-meal-form');
    const mealRequestForm = document.getElementById('meal-request-form');

    if (showAllMemberMealForm) {
        showAllMemberMealForm.addEventListener('click', () => {
            allMemberMealForm.style.display = 'block';
            singleMemberMealFormDiv.style.display = 'none';
            mealRequestForm.style.display = 'none';
        });
    }

    if (showSingleMemberMealForm) {
        showSingleMemberMealForm.addEventListener('click', () => {
            allMemberMealForm.style.display = 'none';
            singleMemberMealFormDiv.style.display = 'block';
            mealRequestForm.style.display = 'none';
        });
    }

    if (showMealRequestForm) {
        showMealRequestForm.addEventListener('click', () => {
            allMemberMealForm.style.display = 'none';
            singleMemberMealFormDiv.style.display = 'none';
            mealRequestForm.style.display = 'block';
        });
    }

    const showMealCostForm = document.getElementById('show-meal-cost-form');
    const showOtherCostForm = document.getElementById('show-other-cost-form');
    const mealCostForm = document.getElementById('meal-cost-form');
    const otherCostForm = document.getElementById('other-cost-form');

    if (showMealCostForm) {
        showMealCostForm.addEventListener('click', () => {
            mealCostForm.style.display = 'block';
            otherCostForm.style.display = 'none';
        });
    }

    if (showOtherCostForm) {
        showOtherCostForm.addEventListener('click', () => {
            mealCostForm.style.display = 'none';
            otherCostForm.style.display = 'block';
        });
    }

    function fetchMembers() {
        if (!currentUser || !currentUser['Mess ID']) {
            console.log('No mess ID found for current user. Cannot fetch members.');
            return;
        }
        fetch(`/api/members?mess_id=${currentUser['Mess ID']}`)
            .then(response => response.json())
            .then(data => {
                const allMemberTable = document.querySelector('.all-member-list tbody');
                const depositMemberSelect = document.getElementById('deposit-member');
                const mealMemberSelect = document.getElementById('meal-member');
                const shoppersSelect = document.getElementById('shoppers');
                const otherCostMemberSelect = document.getElementById('other-cost-member');

                allMemberTable.innerHTML = '';
                depositMemberSelect.innerHTML = '';
                mealMemberSelect.innerHTML = '';
                shoppersSelect.innerHTML = '';
                otherCostMemberSelect.innerHTML = '<option value="">Shared Cost</option>';

                data.forEach(member => {
                    // All Member Page
                    const row = document.createElement('tr');
                    row.innerHTML = `
                        <td>${member['Name']}</td>
                        <td>${member['Email']}</td>
                        <td>-</td>
                        <td>-</td>
                        <td><button>Edit</button></td>
                    `;
                    allMemberTable.appendChild(row);

                    // Deposit Page
                    const depositOption = document.createElement('option');
                    depositOption.value = member['Member ID'];
                    depositOption.textContent = member['Name'];
                    depositMemberSelect.appendChild(depositOption);

                    // Meal Page
                    const mealOption = document.createElement('option');
                    mealOption.value = member['Member ID'];
                    mealOption.textContent = member['Name'];
                    mealMemberSelect.appendChild(mealOption);

                    // Cost Page
                    const shopperOption = document.createElement('option');
                    shopperOption.value = member['Member ID'];
                    shopperOption.textContent = member['Name'];
                    shoppersSelect.appendChild(shopperOption);

                    const otherCostOption = document.createElement('option');
                    otherCostOption.value = member['Member ID'];
                    otherCostOption.textContent = member['Name'];
                    otherCostMemberSelect.appendChild(otherCostOption);
                });
            });
    }

    fetchMembers();

    const createMemberForm = document.getElementById('create-member-form').querySelector('form');
    createMemberForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const memberName = document.getElementById('member-name').value;
        const memberEmail = document.getElementById('member-email').value;
        const memberPassword = document.getElementById('member-password').value; // This is not used in the backend

        const newMember = {
            "Member ID": Date.now().toString(), // Simple way to generate a unique ID
            "Name": memberName,
            "Phone": "",
            "Email": memberEmail,
            "Join Date": new Date().toLocaleDateString(),
            "Status": "Active"
        };

        fetch('/api/members', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMember)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                fetchMembers(); // Refresh the member list
                createMemberForm.reset();
            }
        });
    });

    const depositForm = document.querySelector('.deposit-form');
    depositForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const depositDate = document.getElementById('deposit-date').value;
        const depositAmount = document.getElementById('deposit-amount').value;
        const depositDetails = document.getElementById('deposit-details').value;
        const depositMember = document.getElementById('deposit-member').value;

        const newDeposit = {
            "Deposit ID": Date.now().toString(),
            "Date": depositDate,
            "Member ID": depositMember,
            "Amount": depositAmount
        };

        fetch('/api/deposits', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newDeposit)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                // Maybe show a success message
                depositForm.reset();
            }
        });
    });

    const singleMemberMealForm = document.getElementById('single-member-meal-form').querySelector('form');
    singleMemberMealForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const mealDate = document.getElementById('meal-date-single').value;
        const memberId = document.getElementById('meal-member').value;
        const breakfast = document.getElementById('breakfast').value;
        const lunch = document.getElementById('lunch').value;
        const dinner = document.getElementById('dinner').value;
        const totalMeals = parseInt(breakfast) + parseInt(lunch) + parseInt(dinner);

        const newMeal = {
            "Meal ID": Date.now().toString(),
            "Date": mealDate,
            "Member ID": memberId,
            "Breakfast": breakfast,
            "Lunch": lunch,
            "Dinner": dinner,
            "Total Meals": totalMeals
        };

        fetch('/api/meals', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newMeal)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                singleMemberMealForm.reset();
            }
        });
    });

    const mealCostForm = document.getElementById('meal-cost-form').querySelector('form');
    mealCostForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const costDate = document.getElementById('meal-cost-date').value;
        const costAmount = document.getElementById('meal-cost-amount').value;
        const costDetails = document.getElementById('meal-cost-details').value;
        const shopper = document.getElementById('shoppers').value;

        const newCost = {
            "Cost ID": Date.now().toString(),
            "Date": costDate,
            "Description": costDetails,
            "Amount": costAmount,
            "Paid By Member ID": shopper,
            "Category": "Meal"
        };

        fetch('/api/costs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newCost)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                mealCostForm.reset();
            }
        });
    });

    const otherCostForm = document.getElementById('other-cost-form').querySelector('form');
    otherCostForm.addEventListener('submit', (event) => {
        event.preventDefault();
        const costDate = document.getElementById('other-cost-date').value;
        const costAmount = document.getElementById('other-cost-amount').value;
        const costDetails = document.getElementById('other-cost-details').value;
        const member = document.getElementById('other-cost-member').value;

        const newCost = {
            "Cost ID": Date.now().toString(),
            "Date": costDate,
            "Description": costDetails,
            "Amount": costAmount,
            "Paid By Member ID": member,
            "Category": member ? "Individual" : "Shared"
        };

        fetch('/api/costs', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify(newCost)
        })
        .then(response => response.json())
        .then(data => {
            if (data.success) {
                otherCostForm.reset();
            }
        });
    });

    function fetchDashboardData() {
        fetch('/api/members').then(res => res.json()).then(members => {
            const allMemberInfo = document.querySelector('.all-member-info tbody');
            allMemberInfo.innerHTML = '';
            members.forEach(member => {
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>${member['Name']}</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                    <td>0</td>
                `;
                allMemberInfo.appendChild(row);
            });
        });

        fetch('/api/deposits').then(res => res.json()).then(deposits => {
            const totalDeposit = deposits.reduce((acc, dep) => acc + parseFloat(dep['Amount']), 0);
            document.querySelector('.summary-card:nth-child(2) p').textContent = totalDeposit;
        });

        fetch('/api/meals').then(res => res.json()).then(meals => {
            const totalMeal = meals.reduce((acc, meal) => acc + parseFloat(meal['Total Meals']), 0);
            document.querySelector('.summary-card:nth-child(3) p').textContent = totalMeal;
        });

        fetch('/api/costs').then(res => res.json()).then(costs => {
            const totalCost = costs.reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
            document.querySelector('.summary-card:nth-child(4) p').textContent = totalCost;

            const individualCosts = costs.filter(c => c.Category === 'Individual').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
            document.querySelector('.summary-card:nth-child(6) p').textContent = individualCosts;

            const sharedCosts = costs.filter(c => c.Category === 'Shared').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
            document.querySelector('.summary-card:nth-child(7) p').textContent = sharedCosts;
        });

        Promise.all([
            fetch('/api/deposits').then(res => res.json()),
            fetch('/api/costs').then(res => res.json()),
            fetch('/api/meals').then(res => res.json())
        ]).then(([deposits, costs, meals]) => {
            const totalDeposit = deposits.reduce((acc, dep) => acc + parseFloat(dep['Amount']), 0);
            const totalCost = costs.reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
            const totalMeal = meals.reduce((acc, meal) => acc + parseFloat(meal['Total Meals']), 0);

            const messBalance = totalDeposit - totalCost;
            document.querySelector('.summary-card:nth-child(1) p').textContent = messBalance;

            const mealRate = totalMeal > 0 ? totalCost / totalMeal : 0;
            document.querySelector('.summary-card:nth-child(5) p').textContent = mealRate.toFixed(2);
        });
    }

    fetchDashboardData();
});