import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

function AddCost() {
  const [showForm, setShowForm] = useState('meal-cost'); // 'meal-cost', 'other-cost'
  const [mealCostDate, setMealCostDate] = useState('');
  const [mealCostAmount, setMealCostAmount] = useState('');
  const [mealCostDetails, setMealCostDetails] = useState('');
  const [mealShopper, setMealShopper] = useState('');
  const [addAsDeposit, setAddAsDeposit] = useState(false);

  const [otherCostDate, setOtherCostDate] = useState('');
  const [otherCostAmount, setOtherCostAmount] = useState('');
  const [otherCostDetails, setOtherCostDetails] = useState('');
  const [otherCostMember, setOtherCostMember] = useState(''); // Can be empty for shared cost
  const [sharedCostType, setSharedCostType] = useState('all-members'); // New state for shared cost type

  const [message, setMessage] = useState({ text: '', type: '' });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [addedCosts, setAddedCosts] = useState([]); // New state for added costs

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!currentUser || !currentUser['Mess ID']) {
        setMessage({ text: 'Please create or join a mess first to add costs.', type: 'error' });
        setLoading(false);
        return;
      }
      try {
        const [membersResponse, costsResponse] = await Promise.all([
          fetch(`/api/members?mess_id=${currentUser['Mess ID']}`),
          fetch(`/api/costs?mess_id=${currentUser['Mess ID']}`)
        ]);

        const membersData = await membersResponse.json();
        const costsData = await costsResponse.json();

        setMembers(membersData);
        setAddedCosts(costsData);
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setMessage({ text: 'Error fetching initial data for cost form.', type: 'error' });
      } finally {
        setLoading(false);
      }
    };
    fetchInitialData();
  }, []);

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  const handleMealCostSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first.', type: 'error' });
      return;
    }

    const newCost = {
      "Cost ID": Date.now().toString(),
      "Date": mealCostDate,
      "Description": mealCostDetails,
      "Amount": mealCostAmount,
      "Paid By Member ID": mealShopper,
      "Category": "Meal",
      "Mess ID": currentUser['Mess ID'], // Include Mess ID
      "add_as_deposit": addAsDeposit, // Include the checkbox value
      "requesting_user_id": currentUser['User ID'] // Include requesting user ID
    };

    try {
      const response = await fetch('/api/costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCost),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Meal cost added successfully!', type: 'success' });
        setAddedCosts(prevCosts => [...prevCosts, newCost]); // Add new cost to state
        setMealCostDate('');
        setMealCostAmount('');
        setMealCostDetails('');
        setMealShopper('');
        setAddAsDeposit(false);
      } else {
        setMessage({ text: `Failed to add meal cost: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding meal cost:', error);
      setMessage({ text: 'An error occurred while adding the meal cost.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  const handleOtherCostSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first.', type: 'error' });
      return;
    }

    let category = "";
    if (otherCostMember) {
      category = "Individual";
    } else {
      // Determine shared cost type
      if (sharedCostType === 'meal-consumers') {
        category = "Shared - Meal Consumers";
      } else {
        category = "Shared - All Members";
      }
    }

    const newCost = {
      "Cost ID": Date.now().toString(),
      "Date": otherCostDate,
      "Description": otherCostDetails,
      "Amount": otherCostAmount,
      "Paid By Member ID": otherCostMember,
      "Category": category, // Use the determined category
      "Mess ID": currentUser['Mess ID'], // Include Mess ID
      "requesting_user_id": currentUser['User ID'] // Include requesting user ID
    };

    try {
      const response = await fetch('/api/costs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newCost),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Other cost added successfully!', type: 'success' });
        setAddedCosts(prevCosts => [...prevCosts, newCost]); // Add new cost to state
        setOtherCostDate('');
        setOtherCostAmount('');
        setOtherCostDetails('');
        setOtherCostMember('');
        setSharedCostType('all-members'); // Reset to default
      } else {
        setMessage({ text: `Failed to add other cost: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding other cost:', error);
      setMessage({ text: 'An error occurred while adding the other cost.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Add Cost</h1>
      <div className="add-cost-options">
        <button onClick={() => setShowForm('meal-cost')}>Add Meal Cost</button>
        <button onClick={() => setShowForm('other-cost')}>Add Other Cost</button>
      </div>

      {showForm === 'meal-cost' && (
        <div className="cost-form fade-in">
          <h2>Add Meal Cost</h2>
          <form onSubmit={handleMealCostSubmit}>
            <label htmlFor="meal-cost-date">Select Date:</label>
            <input
              type="date"
              id="meal-cost-date"
              name="meal-cost-date"
              value={mealCostDate}
              onChange={(e) => setMealCostDate(e.target.value)}
              required
            />
            <label htmlFor="meal-cost-amount">Meal Cost Amount:</label>
            <input
              type="number"
              id="meal-cost-amount"
              name="meal-cost-amount"
              value={mealCostAmount}
              onChange={(e) => setMealCostAmount(e.target.value)}
              required
            />
            <label htmlFor="meal-cost-details">Meal Cost/Bazar Details (optional):</label>
            <textarea
              id="meal-cost-details"
              name="meal-cost-details"
              value={mealCostDetails}
              onChange={(e) => setMealCostDetails(e.target.value)}
            ></textarea>
            <label htmlFor="shoppers">Select Shoppers:</label>
            <select
              id="shoppers"
              name="shoppers"
              value={mealShopper}
              onChange={(e) => setMealShopper(e.target.value)}
              required
            >
              <option value="">-- Select Shopper --</option>
              {members.map((member) => (
                <option key={member['Member ID']} value={member['Member ID']}>
                  {member['Name']}
                </option>
              ))}
            </select>
            <label>
              <input
                type="checkbox"
                name="add-as-deposit"
                checked={addAsDeposit}
                onChange={(e) => setAddAsDeposit(e.target.checked)}
              />{' '}
              Add also as Deposit For this shopper?
            </label>
            <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </form>
        </div>
      )}

      {showForm === 'other-cost' && (
        <div className="cost-form fade-in">
          <h2>Add Other Cost</h2>
          <form onSubmit={handleOtherCostSubmit}>
            <label htmlFor="other-cost-date">Select Date:</label>
            <input
              type="date"
              id="other-cost-date"
              name="other-cost-date"
              value={otherCostDate}
              onChange={(e) => setOtherCostDate(e.target.value)}
              required
            />
            <label htmlFor="other-cost-amount">Cost Amount:</label>
            <input
              type="number"
              id="other-cost-amount"
              name="other-cost-amount"
              value={otherCostAmount}
              onChange={(e) => setOtherCostAmount(e.target.value)}
              required
            />
            <label htmlFor="other-cost-details">Cost Details:</label>
            <textarea
              id="other-cost-details"
              name="other-cost-details"
              value={otherCostDetails}
              onChange={(e) => setOtherCostDetails(e.target.value)}
            ></textarea>
            <label htmlFor="other-cost-member">Select Member (for individual cost):</label>
            <select
              id="other-cost-member"
              name="other-cost-member"
              value={otherCostMember}
              onChange={(e) => setOtherCostMember(e.target.value)}
            >
              <option value="">Shared Cost</option>
              {members.map((member) => (
                <option key={member['Member ID']} value={member['Member ID']}>
                  {member['Name']}
                </option>
              ))}
            </select>

            {!otherCostMember && ( // Only show shared cost type if no individual member is selected
              <div style={{ marginTop: '10px' }}>
                <label>Shared Cost Type:</label>
                <div>
                  <input
                    type="radio"
                    id="shared-meal-consumers"
                    name="shared-cost-type"
                    value="meal-consumers"
                    checked={sharedCostType === 'meal-consumers'}
                    onChange={(e) => setSharedCostType(e.target.value)}
                  />
                  <label htmlFor="shared-meal-consumers">For Meal Consumers</label>
                </div>
                <div>
                  <input
                    type="radio"
                    id="shared-all-members"
                    name="shared-cost-type"
                    value="all-members"
                    checked={sharedCostType === 'all-members'}
                    onChange={(e) => setSharedCostType(e.target.value)}
                  />
                  <label htmlFor="shared-all-members">For All Members</label>
                </div>
              </div>
            )}

            <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
          </form>
        </div>
      )}
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {addedCosts.length > 0 && (
        <div className="added-costs-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h2>Recently Added Costs</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead style={{ backgroundColor: '#f2f2f2' }}>
              <tr>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Description</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Amount</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Paid By</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Category</th>
              </tr>
            </thead>
            <tbody>
              {addedCosts.map((cost, index) => {
                const memberName = members.find(m => m['Member ID'] === cost['Paid By Member ID'])?.['Name'] || 'N/A';
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cost['Date']}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cost['Description']}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cost['Amount']}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{memberName}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{cost['Category']}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default AddCost;
