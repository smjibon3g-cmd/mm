import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

function CreateMess() {
  const [messName, setMessName] = useState('');
  const [messLocation, setMessLocation] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['User ID']) {
      setMessage({ text: 'User not logged in or user ID not found.', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/create_mess', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mess_name: messName, location: messLocation, creator_user_id: currentUser['User ID'] }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: `Mess '${messName}' created successfully!`, type: 'success' });
        // Update currentUser's mess_id in localStorage
        currentUser['Mess ID'] = data.mess_id;
        localStorage.setItem('currentUser', JSON.stringify(currentUser));
        // Redirect to dashboard or refresh page
        navigate('/dashboard');
      } else {
        setMessage({ text: `Failed to create mess: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error creating mess:', error);
      setMessage({ text: 'An error occurred while creating the mess.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h1>Create a Mess</h1>
      <form className="fade-in" onSubmit={handleSubmit}>
        <label htmlFor="mess-name">Mess Name:</label>
        <input
          type="text"
          id="mess-name"
          name="mess-name"
          required
          value={messName}
          onChange={(e) => setMessName(e.target.value)}
        />
        <label htmlFor="mess-location">Location:</label>
        <input
          type="text"
          id="mess-location"
          name="mess-location"
          required
          value={messLocation}
          onChange={(e) => setMessLocation(e.target.value)}
        />
        <button type="submit" disabled={loading}>{loading ? 'Creating...' : 'Create Mess'}</button>
      </form>
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      {loading && <LoadingSpinner />}
    </div>
  );
}

export default CreateMess;