import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';
import { v4 as uuidv4 } from 'uuid';

function AddMeal() {
  const [showForm, setShowForm] = useState(''); // 'all-member', 'single-member', 'meal-request'
  const [mealDateAll, setMealDateAll] = useState('');
  const [mealDateSingle, setMealDateSingle] = useState('');
  const [singleMealMember, setSingleMealMember] = useState('');
  const [breakfast, setBreakfast] = useState(0);
  const [lunch, setLunch] = useState(0);
  const [dinner, setDinner] = useState(0);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [members, setMembers] = useState([]);
  const [memberMeals, setMemberMeals] = useState({}); // For all member meal form
  const [meals, setMeals] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [currentUser, setCurrentUser] = useState(null); // Add currentUser state
  const [mealRequestMessage, setMealRequestMessage] = useState('');

  useEffect(() => {
    const fetchMembers = async () => {
      setLoading(true); // Set loading to true when fetching starts
      const storedUser = JSON.parse(localStorage.getItem('currentUser'));
      if (storedUser) {
        setCurrentUser(storedUser);
        if (storedUser.Role !== 'mess manager') {
          setShowForm('single-member');
        } else {
          setShowForm('all-member');
        }
      }
      if (!storedUser || !storedUser['Mess ID']) {
        setMessage({ text: 'Please create or join a mess first to add meals.', type: 'error' });
        setLoading(false);
        return;
      }
      try {
        const [membersRes, mealsRes] = await Promise.all([
          fetch(`/api/members?mess_id=${storedUser['Mess ID']}&requesting_user_id=${storedUser['User ID']}`),
          fetch(`/api/meals?mess_id=${storedUser['Mess ID']}`)
        ]);
        const membersData = await membersRes.json();
        const mealsData = await mealsRes.json();
        setMembers(membersData);
        setMeals(mealsData);

        if (storedUser.Role !== 'mess manager') {
            const currentUserMember = membersData.find(member => member.Name === storedUser.Username);
            if(currentUserMember) {
                setSingleMealMember(currentUserMember['Member ID']);
            }
        }

        // Initialize memberMeals state
        const initialMemberMeals = {};
        membersData.forEach(member => {
          initialMemberMeals[member['Member ID']] = { breakfast: 0, lunch: 0, dinner: 0 };
        });
        setMemberMeals(initialMemberMeals);
      } catch (error) {
        console.error('Error fetching members:', error);
        setMessage({ text: 'Error fetching members for meal entry.', type: 'error' });
      } finally {
        setLoading(false); // Set loading to false when fetching is complete
      }
    };
    fetchMembers();
  }, []);

  useEffect(() => {
    const fetchMealsForDate = async () => {
      if (mealDateAll && currentUser && currentUser.Role === 'mess manager') {
        // Reset meals to 0 before fetching new data
        const initialMemberMeals = {};
        members.forEach(member => {
          initialMemberMeals[member['Member ID']] = { breakfast: 0, lunch: 0, dinner: 0 };
        });
        setMemberMeals(initialMemberMeals);

        try {
          const response = await fetch(`/api/meals_by_date?mess_id=${currentUser['Mess ID']}&date=${mealDateAll}`);
          const mealsOnDate = await response.json();

          // Create a copy of the current memberMeals state
          const updatedMemberMeals = { ...initialMemberMeals };

          // Update the meal counts for members who have existing meals on the selected date
          mealsOnDate.forEach(meal => {
            const memberId = meal['Member ID'];
            if (updatedMemberMeals[memberId]) {
              updatedMemberMeals[memberId].breakfast = meal.Breakfast;
              updatedMemberMeals[memberId].lunch = meal.Lunch;
              updatedMemberMeals[memberId].dinner = meal.Dinner;
            }
          });

          setMemberMeals(updatedMemberMeals);

        } catch (error) {
          console.error('Error fetching meals for date:', error);
        }
      }
    };

    fetchMealsForDate();
  }, [mealDateAll, currentUser, members]);

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  const handleAllMemberMealChange = (memberId, mealType, value) => {
    setMemberMeals(prev => ({
      ...prev,
      [memberId]: {
        ...prev[memberId],
        [mealType]: parseInt(value) || 0
      }
    }));
  };

  const handleAllMemberMealSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first.', type: 'error' });
      return;
    }

    try {
      for (const memberId in memberMeals) {
        const { breakfast, lunch, dinner } = memberMeals[memberId];
        const totalMeals = breakfast + lunch + dinner;

        if (totalMeals > 0) { // Only add if there's at least one meal
          const newMeal = {
            "Meal ID": uuidv4(), // Unique ID for each meal entry
            "Date": mealDateAll,
            "Member ID": memberId,
            "Breakfast": breakfast,
            "Lunch": lunch,
            "Dinner": dinner,
            "Total Meals": totalMeals,
            "Mess ID": currentUser['Mess ID'], // Include Mess ID
            "requesting_user_id": currentUser['User ID']
          };

          const response = await fetch('/api/meals', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify(newMeal),
          });

          if (!response.ok) {
            const errorData = await response.json();
            setMessage({ text: `Failed to add meal for ${memberId}: ${errorData.error || 'Unknown error'}`, type: 'error' });
            return; // Stop on first error
          }
        }
      }
      setMessage({ text: 'All member meals added successfully!', type: 'success' });
      setMealDateAll('');
      // Reset memberMeals state
      const initialMemberMeals = {};
      members.forEach(member => {
        initialMemberMeals[member['Member ID']] = { breakfast: 0, lunch: 0, dinner: 0 };
      });
      setMemberMeals(initialMemberMeals);
    } catch (error) {
      console.error('Error adding all member meals:', error);
      setMessage({ text: 'An error occurred while adding all member meals.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleSingleMemberMealSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);
    const currentLoggedInUser = JSON.parse(localStorage.getItem('currentUser')); // Get latest from localStorage
    console.log('currentLoggedInUser:', currentLoggedInUser);
    console.log('Mess ID:', currentLoggedInUser ? currentLoggedInUser['Mess ID'] : 'N/A');
    console.log('User ID:', currentLoggedInUser ? currentLoggedInUser['User ID'] : 'N/A');

    if (!currentLoggedInUser || !currentLoggedInUser['Mess ID'] || !currentLoggedInUser['User ID']) {
      setMessage({ text: 'User session data is incomplete. Please log in again.', type: 'error' });
      return;
    }

    if (!singleMealMember) {
      setMessage({ text: 'Please select a member.', type: 'error' });
      return;
    }

    const totalMeals = breakfast + lunch + dinner;
    const newMeal = {
      "Meal ID": uuidv4(), // Unique ID for each meal entry
      "Date": mealDateSingle,
      "Member ID": singleMealMember,
      "Breakfast": breakfast,
      "Lunch": lunch,
      "Dinner": dinner,
      "Total Meals": totalMeals,
      "Mess ID": currentLoggedInUser['Mess ID'], // Include Mess ID
      "requesting_user_id": currentLoggedInUser['User ID']
    };

    try {
      const response = await fetch('/api/meals', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newMeal),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Meal added successfully!', type: 'success' });
        setMealDateSingle('');
        setSingleMealMember('');
        setBreakfast(0);
        setLunch(0);
        setDinner(0);
      } else {
        setMessage({ text: `Failed to add meal: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding single member meal:', error);
      setMessage({ text: 'An error occurred while adding the meal.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleMealRequestSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID'] || !currentUser['User ID']) {
      setMessage({ text: 'User session data is incomplete. Please log in again.', type: 'error' });
      return;
    }

    if (!mealRequestMessage.trim()) {
      setMessage({ text: 'Meal request message cannot be empty.', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/meal_requests', { // New endpoint
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mess_id: currentUser['Mess ID'],
          requesting_user_id: currentUser['User ID'],
          message: mealRequestMessage,
          request_date: new Date().toISOString().slice(0, 10), // Current date
        }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Meal request sent successfully!', type: 'success' });
        setMealRequestMessage('');
      } else {
        setMessage({ text: `Failed to send meal request: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error sending meal request:', error);
      setMessage({ text: 'An error occurred while sending the meal request.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const filterByCurrentMonth = (item) => {
    const itemDate = new Date(item['Date']);
    return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
  };

  const currentMonthMeals = meals.filter(filterByCurrentMonth);

  const mealsByDateAndMember = {};
  currentMonthMeals.forEach(meal => {
    const date = meal['Date'];
    const memberId = meal['Member ID'];
    if (!mealsByDateAndMember[date]) {
      mealsByDateAndMember[date] = {};
    }
    mealsByDateAndMember[date][memberId] = {
      breakfast: parseFloat(meal['Breakfast']),
      lunch: parseFloat(meal['Lunch']),
      dinner: parseFloat(meal['Dinner']),
      totalMeals: parseFloat(meal['Total Meals'])
    };
  });

  const memberTotals = members.map(member => {
    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;

    Object.keys(mealsByDateAndMember).forEach(date => {
      if (mealsByDateAndMember[date][member['Member ID']]) {
        totalBreakfast += mealsByDateAndMember[date][member['Member ID']].breakfast;
        totalLunch += mealsByDateAndMember[date][member['Member ID']].lunch;
        totalDinner += mealsByDateAndMember[date][member['Member ID']].dinner;
      }
    });

    return {
      memberId: member['Member ID'],
      totalBreakfast,
      totalLunch,
      totalDinner,
    };
  });

  return (
    <div className="page">
      <h1>Add Meal</h1>
      <div className="add-meal-options">
        {currentUser && currentUser.Role === 'mess manager' && (
          <button onClick={() => setShowForm('all-member')}>For All Member</button>
        )}
        <button onClick={() => setShowForm('single-member')}>Add Own Meal</button>
        <button onClick={() => setShowForm('meal-request')}>Meal Request</button>
      </div>

      {showForm === 'all-member' && (
        <div className="meal-form fade-in">
          <h2>Add Meal for All Members</h2>
          <form onSubmit={handleAllMemberMealSubmit}>
            <label htmlFor="meal-date-all">Select Date:</label>
            <input
              type="date"
              id="meal-date-all"
              name="meal-date-all"
              value={mealDateAll}
              onChange={(e) => setMealDateAll(e.target.value)}
              required
            />
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Breakfast</th>
                  <th>Lunch</th>
                  <th>Dinner</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member['Member ID']}>
                    <td>{member['Name']}</td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={memberMeals[member['Member ID']]?.breakfast || 0}
                        onChange={(e) => handleAllMemberMealChange(member['Member ID'], 'breakfast', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={memberMeals[member['Member ID']]?.lunch || 0}
                        onChange={(e) => handleAllMemberMealChange(member['Member ID'], 'lunch', e.target.value)}
                      />
                    </td>
                    <td>
                      <input
                        type="number"
                        min="0"
                        value={memberMeals[member['Member ID']]?.dinner || 0}
                        onChange={(e) => handleAllMemberMealChange(member['Member ID'], 'dinner', e.target.value)}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </form>
        </div>
      )}

      {showForm === 'single-member' && (
        <div className="meal-form fade-in">
          <h2>Add Meal for {members.find(member => member['Member ID'] === singleMealMember)?.Name || 'Single Member'}</h2>
          <form onSubmit={handleSingleMemberMealSubmit}>
            <label htmlFor="meal-date-single">Select Date:</label>
            <input
              type="date"
              id="meal-date-single"
              name="meal-date-single"
              value={mealDateSingle}
              onChange={(e) => setMealDateSingle(e.target.value)}
              required
            />
            <label htmlFor="meal-member">Select Member:</label>
            <select
              id="meal-member"
              name="meal-member"
              value={singleMealMember}
              onChange={(e) => setSingleMealMember(e.target.value)}
              required
              disabled={currentUser && currentUser.Role !== 'mess manager'}
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                <option key={member['Member ID']} value={member['Member ID']}>
                  {member['Name']}
                </option>
              ))}
            </select>
            <label htmlFor="breakfast">Breakfast:</label>
            <input
              type="number"
              id="breakfast"
              name="breakfast"
              min="0"
              value={breakfast}
              onChange={(e) => setBreakfast(parseInt(e.target.value) || 0)}
            />
            <label htmlFor="lunch">Lunch:</label>
            <input
              type="number"
              id="lunch"
              name="lunch"
              min="0"
              value={lunch}
              onChange={(e) => setLunch(parseInt(e.target.value) || 0)}
            />
            <label htmlFor="dinner">Dinner:</label>
            <input
              type="number"
              id="dinner"
              name="dinner"
              min="0"
              value={dinner}
              onChange={(e) => setDinner(parseInt(e.target.value) || 0)}
            />
            <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </form>
        </div>
      )}

      {showForm === 'meal-request' && (
        <div className="meal-form fade-in">
          <h2>Meal Request</h2>
          <form onSubmit={handleMealRequestSubmit}>
            <label htmlFor="meal-request-message">Your Request:</label>
            <textarea
              id="meal-request-message"
              name="meal-request-message"
              value={mealRequestMessage}
              onChange={(e) => setMealRequestMessage(e.target.value)}
              rows="5"
              required
            ></textarea>
            <button type="submit" disabled={loading}>{loading ? 'Sending Request...' : 'Send Request'}</button>
          </form>
        </div>
      )}
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      <div className="details-section">
        <h2>Meal Details (Current Month)</h2>
        <table>
          <thead>
            <tr>
              <th rowSpan="2">Date</th>
              {members.map(member => (
                <th key={member['Member ID']} colSpan="3">{member['Name']}</th>
              ))}
            </tr>
            <tr>
              {members.map(member => (
                <React.Fragment key={member['Member ID'] + '-subheaders'}>
                  <th>B</th>
                  <th>L</th>
                  <th>D</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {Object.keys(mealsByDateAndMember).sort().map(date => (
              <tr key={date}>
                <td>{formatDate(date)}</td>
                {members.map(member => (
                  <React.Fragment key={member['Member ID'] + '-meals'}>
                    <td>{mealsByDateAndMember[date][member['Member ID']] ? mealsByDateAndMember[date][member['Member ID']].breakfast : 0}</td>
                    <td>{mealsByDateAndMember[date][member['Member ID']] ? mealsByDateAndMember[date][member['Member ID']].lunch : 0}</td>
                    <td>{mealsByDateAndMember[date][member['Member ID']] ? mealsByDateAndMember[date][member['Member ID']].dinner : 0}</td>
                  </React.Fragment>
                ))}
              </tr>
            ))}
            <tr>
              <td><strong>Total</strong></td>
              {memberTotals.map(total => (
                <React.Fragment key={total.memberId + '-total'}>
                  <td><strong>{total.totalBreakfast}</strong></td>
                  <td><strong>{total.totalLunch}</strong></td>
                  <td><strong>{total.totalDinner}</strong></td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AddMeal;
