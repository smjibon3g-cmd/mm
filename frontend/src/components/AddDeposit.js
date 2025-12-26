import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

function AddDeposit() {
  const [depositDate, setDepositDate] = useState('');
  const [depositAmount, setDepositAmount] = useState('');
  const [depositDetails, setDepositDetails] = useState('');
  const [depositMember, setDepositMember] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true); // Add loading state
  const [addedDeposits, setAddedDeposits] = useState([]); // New state for added deposits

  useEffect(() => {
    const fetchInitialData = async () => {
      setLoading(true);
      const currentUser = JSON.parse(localStorage.getItem('currentUser'));
      if (!currentUser || !currentUser['Mess ID']) {
        setMessage({ text: 'Please create or join a mess first to add a deposit.', type: 'error' });
        setLoading(false);
        return;
      }
      try {
        const [membersResponse, depositsResponse] = await Promise.all([
          fetch(`/api/members?mess_id=${currentUser['Mess ID']}`),
          fetch(`/api/deposits?mess_id=${currentUser['Mess ID']}`)
        ]);

        const membersData = await membersResponse.json();
        const depositsData = await depositsResponse.json();

        setMembers(membersData);
        setAddedDeposits(depositsData); // Initialize with fetched deposits
      } catch (error) {
        console.error('Error fetching initial data:', error);
        setMessage({ text: 'Error fetching initial data for deposit form.', type: 'error' });
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

  const handleSubmit = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first.', type: 'error' });
      return;
    }

    const newDeposit = {
      "Deposit ID": Date.now().toString(), // Simple way to generate a unique ID
      "Date": depositDate,
      "Member ID": depositMember,
      "Amount": depositAmount,
      "Details": depositDetails, // Include deposit details
      "Mess ID": currentUser['Mess ID'], // Include Mess ID
      "requesting_user_id": currentUser['User ID'] // Include requesting user ID
    };

    try {
      const response = await fetch('/api/deposits', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(newDeposit),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: 'Deposit added successfully!', type: 'success' });
        setAddedDeposits(prevDeposits => [...prevDeposits, newDeposit]); // Add new deposit to state
        setDepositDate('');
        setDepositAmount('');
        setDepositDetails('');
        setDepositMember('');
      } else {
        setMessage({ text: `Failed to add deposit: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding deposit:', error);
      setMessage({ text: 'An error occurred while adding the deposit.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Add Deposit</h1>
      <form className="deposit-form fade-in" onSubmit={handleSubmit}>
        <label htmlFor="deposit-date">Select Date:</label>
        <input
          type="date"
          id="deposit-date"
          name="deposit-date"
          value={depositDate}
          onChange={(e) => setDepositDate(e.target.value)}
          required
        />
        <label htmlFor="deposit-amount">Deposit Amount:</label>
        <input
          type="number"
          id="deposit-amount"
          name="deposit-amount"
          value={depositAmount}
          onChange={(e) => setDepositAmount(e.target.value)}
          required
        />
        <label htmlFor="deposit-details">Deposit Details (optional):</label>
        <textarea
          id="deposit-details"
          name="deposit-details"
          value={depositDetails}
          onChange={(e) => setDepositDetails(e.target.value)}
        ></textarea>
        <label htmlFor="deposit-member">Select Member:</label>
        <select
          id="deposit-member"
          name="deposit-member"
          value={depositMember}
          onChange={(e) => setDepositMember(e.target.value)}
          required
        >
          <option value="">-- Select Member --</option>
          {members.map((member) => (
            <option key={member['Member ID']} value={member['Member ID']}>
              {member['Name']}
            </option>
          ))}
        </select>
        <button type="submit" disabled={loading}>{loading ? 'Submitting...' : 'Submit'}</button>
      </form>
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {addedDeposits.length > 0 && (
        <div className="added-deposits-section" style={{ marginTop: '20px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h2>Recently Added Deposits</h2>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '10px' }}>
            <thead style={{ backgroundColor: '#f2f2f2' }}>
              <tr>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Date</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Member</th>
                <th style={{ padding: '10px', border: '1px solid #ddd', textAlign: 'left' }}>Amount</th>
              </tr>
            </thead>
            <tbody>
              {addedDeposits.map((deposit, index) => {
                const memberName = members.find(m => m['Member ID'] === deposit['Member ID'])?.['Name'] || 'Unknown Member';
                return (
                  <tr key={index} style={{ backgroundColor: index % 2 === 0 ? '#fff' : '#f9f9f9' }}>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{deposit['Date']}</td>
                    <td style={{ padding: '10px', border: '1px solid #ddd' }}>{memberName}</td>
                    <td>{deposit['Amount']}</td>
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

export default AddDeposit;