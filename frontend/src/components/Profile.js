import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

function Profile() {
  const [currentUser, setCurrentUser] = useState(null);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser'));
    if (user) {
      setCurrentUser(user);
    } else {
      setMessage({ text: 'User not logged in.', type: 'error' });
    }
  }, []);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setMessage({ text: '', type: '' });
    setLoading(true);

    if (newPassword !== confirmNewPassword) {
      setMessage({ text: 'New password and confirm new password do not match.', type: 'error' });
      setLoading(false);
      return;
    }

    if (!currentPassword || !newPassword) {
      setMessage({ text: 'Please fill in all password fields.', type: 'error' });
      setLoading(false);
      return;
    }

    try {
      const response = await fetch('/api/change_password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_id: currentUser['User ID'],
          current_password: currentPassword,
          new_password: newPassword,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setMessage({ text: data.message, type: 'success' });
        // Update the password in localStorage as well
        const updatedUser = { ...currentUser, 'Password': newPassword };
        localStorage.setItem('currentUser', JSON.stringify(updatedUser));
        setCurrentUser(updatedUser);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
      } else {
        setMessage({ text: data.error || 'Failed to change password.', type: 'error' });
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setMessage({ text: 'An error occurred while changing password.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  if (!currentUser) {
    return <div className="page">Loading profile...</div>;
  }

  return (
    <div className="page fade-in">
      <h1>My Profile</h1>
      {currentUser && (
        <div>
          <p><strong>User ID:</strong> {currentUser['User ID']}</p>
          <p><strong>Username:</strong> {currentUser['Username']}</p>
          <p><strong>Email:</strong> {currentUser['Email']}</p>
          <p><strong>Role:</strong> {currentUser['Role']}</p>
          <p><strong>Mess ID:</strong> {currentUser['Mess ID'] || 'N/A'}</p>
          {/* Add more profile details as needed */}
        </div>
      )}

      <h2>Change Password</h2>
      <form onSubmit={handleChangePassword}>
        <div className="form-group">
          <label htmlFor="currentPassword">Current Password:</label>
          <input
            type="password"
            id="currentPassword"
            value={currentPassword}
            onChange={(e) => setCurrentPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="newPassword">New Password:</label>
          <input
            type="password"
            id="newPassword"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            required
          />
        </div>
        <div className="form-group">
          <label htmlFor="confirmNewPassword">Confirm New Password:</label>
          <input
            type="password"
            id="confirmNewPassword"
            value={confirmNewPassword}
            onChange={(e) => setConfirmNewPassword(e.target.value)}
            required
          />
        </div>
        <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Changing...' : 'Change Password'}</button>
      </form>

      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      {loading && <LoadingSpinner />}
    </div>
  );
}

export default Profile;
