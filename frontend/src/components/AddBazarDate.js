import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

function AddBazarDate() {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [selectedMember, setSelectedMember] = useState('');
  const [members, setMembers] = useState([]);
  const [currentUser, setCurrentUser] = useState(null);
  const [isMessManager, setIsMessManager] = useState(false);
  const [message, setMessage] = useState(null);
  const [messageType, setMessageType] = useState(null);
  const [loading, setLoading] = useState(false);
  const [bazarDates, setBazarDates] = useState([]); // New state for bazar dates

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const fetchMembers = async (storedUser) => {
    if (!storedUser || !storedUser['Mess ID']) {
      setMessage('User not associated with a mess.');
      setMessageType('error');
      return;
    }
    try {
      const response = await fetch(`/api/members?mess_id=${storedUser['Mess ID']}`);
      if (!response.ok) {
        throw new Error('Failed to fetch members.');
      }
      const data = await response.json();
      setMembers(data);
    } catch (err) {
      setMessage(err.message);
      setMessageType('error');
    }
  };

  const fetchBazarDates = async (storedUser) => {
    if (!storedUser || !storedUser['Mess ID']) {
      return;
    }
    try {
      const response = await fetch(`/api/bazar_dates?mess_id=${storedUser['Mess ID']}`);
      if (!response.ok) {
        throw new Error('Failed to fetch bazar dates.');
      }
      const data = await response.json();
      setBazarDates(data);
    } catch (err) {
      console.error('Error fetching bazar dates:', err);
    }
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
      if (storedUser.Role === 'mess manager') {
        setIsMessManager(true);
      } else {
        setMessage('Only mess managers can add bazar dates.');
        setMessageType('error');
      }
    }

    fetchMembers(storedUser);
    fetchBazarDates(storedUser);
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage(null);
    setMessageType(null);
    setLoading(true); // Set loading to true on form submission

    if (!currentUser || !currentUser['Mess ID']) {
      setMessage('User not associated with a mess.');
      setMessageType('error');
      return;
    }

    if (!startDate || !endDate || !selectedMember) {
      setMessage('Please select a start date, end date, and a member.');
      setMessageType('error');
      return;
    }

    if (new Date(startDate) > new Date(endDate)) {
      setMessage('Start date cannot be after end date.');
      setMessageType('error');
      return;
    }

    try {
      const response = await fetch('/api/bazar_dates', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          mess_id: currentUser['Mess ID'],
          member_id: selectedMember,
          start_date: startDate,
          end_date: endDate,
          requesting_user_id: currentUser['User ID'],
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage('Bazar date added successfully!');
        setMessageType('success');
        setStartDate('');
        setEndDate('');
        setSelectedMember('');
        fetchBazarDates(currentUser); // Refresh bazar dates after successful submission
      } else {
        setMessage(data.error || 'Failed to add bazar date.');
        setMessageType('error');
      }
    } catch (err) {
      setMessage('Network error. Please try again.');
      setMessageType('error');
    } finally {
      setLoading(false); // Set loading to false after API call completes
    }
  };

  return (
    <div className="page">
      <h1>Add Bazar Date</h1>
      {message && <div className={`message ${messageType}`}>{message}</div>}
      {isMessManager ? (
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="startDate">Start Date:</label>
            <input
              type="date"
              id="startDate"
              value={startDate}
              onChange={(e) => setStartDate(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="endDate">End Date:</label>
            <input
              type="date"
              id="endDate"
              value={endDate}
              onChange={(e) => setEndDate(e.target.value)}
              required
            />
          </div>
          <div className="input-group">
            <label htmlFor="member">Member:</label>
            <select
              id="member"
              value={selectedMember}
              onChange={(e) => setSelectedMember(e.target.value)}
              required
            >
              <option value="">Select a member</option>
              {members.map((member) => (
                <option key={member['Member ID']} value={member['Member ID']}>
                  {member.Name}
                </option>
              ))}
            </select>
          </div>
          <button type="submit" disabled={loading}>{loading ? 'Adding...' : 'Add Bazar Date'}</button>
        </form>
      ) : (
        <div className="message error">You do not have permission to add bazar dates. Only mess managers can perform this action.</div>
      )}
      {loading && <LoadingSpinner />}

      <div className="details-section">
        <h2>Added Bazar Dates</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
            </tr>
          </thead>
          <tbody>
            {bazarDates.length > 0 ? (
              bazarDates.map((bazarDate, index) => (
                <tr key={index}>
                  <td>{formatDate(bazarDate.Date)}</td>
                  <td>{members.find(m => m['Member ID'] === bazarDate['Member ID'])?.Name}</td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="2">No bazar dates added yet.</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default AddBazarDate;