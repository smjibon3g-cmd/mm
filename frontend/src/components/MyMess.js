import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

function MyMess() {
  const [messDetails, setMessDetails] = useState(null);
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [currentUser, setCurrentUser] = useState(null); // Add currentUser state
  const [selectedNewManager, setSelectedNewManager] = useState(''); // State for new manager selection
  const [deletingMess, setDeletingMess] = useState(false);
  const [transferringManager, setTransferringManager] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    const fetchMessData = async () => {
      if (!storedUser || !storedUser['Mess ID']) {
        setMessage({ text: 'You are not associated with any mess.', type: 'error' });
        return;
      }

      const messId = storedUser['Mess ID'];

      try {
        // Fetch mess details
        const messDetailsRes = await fetch(`/api/my_mess?mess_id=${messId}`);
        const messDetailsData = await messDetailsRes.json();

        if (messDetailsRes.ok) {
          setMessDetails(messDetailsData.mess);
        } else {
          throw new Error(messDetailsData.error || 'Failed to fetch mess details');
        }

        // Fetch mess members
        const membersRes = await fetch(`/api/members?mess_id=${messId}&requesting_user_id=${storedUser['User ID']}`);
        const membersData = await membersRes.json();

        if (membersRes.ok) {
          setMembers(membersData);
        } else {
          throw new Error(membersData.error || 'Failed to fetch members');
        }

      } catch (error) {
        console.error('Error fetching mess data:', error);
        setMessage({ text: error.message, type: 'error' });
      }
    };

    fetchMessData();
  }, []);

  const handleCreateMess = () => {
    navigate('/create-mess');
  };

  const handleDeleteMess = async () => {
    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'No mess to delete.', type: 'error' });
      return;
    }

    if (window.confirm('Are you sure you want to delete this mess? This action cannot be undone.')) {
      setMessage({ text: '', type: '' });
      setDeletingMess(true);
      try {
        const response = await fetch(`/api/delete_mess/${currentUser['Mess ID']}?user_id=${currentUser['User ID']}`, {
          method: 'DELETE',
        });
        const data = await response.json();

        if (response.ok) {
          setMessage({ text: 'Mess deleted successfully!', type: 'success' });
          // Update local storage to reflect the change
          const updatedUser = { ...currentUser, 'Mess ID': null, 'Role': 'user' };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          navigate('/dashboard'); // Navigate to a neutral page
        } else {
          setMessage({ text: `Failed to delete mess: ${data.error || 'Unknown error'}`, type: 'error' });
        }
      } catch (error) {
        console.error('Error deleting mess:', error);
        setMessage({ text: 'An error occurred while deleting the mess.', type: 'error' });
      } finally {
        setDeletingMess(false);
      }
    }
  };

  const handleTransferManager = async () => {
    if (!selectedNewManager) {
      setMessage({ text: 'Please select a new manager.', type: 'error' });
      return;
    }

    if (!currentUser || !currentUser['Mess ID'] || currentUser.Role !== 'mess manager') {
      setMessage({ text: 'You are not authorized to transfer the manager role.', type: 'error' });
      return;
    }

    if (window.confirm(`Are you sure you want to transfer the mess manager role to ${members.find(m => m['User ID'] === selectedNewManager)?.Name}?`)) {
      setMessage({ text: '', type: '' });
      setTransferringManager(true);
      try {
        const response = await fetch('/api/mess/transfer_manager', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            mess_id: currentUser['Mess ID'],
            old_manager_user_id: currentUser['User ID'],
            new_manager_user_id: selectedNewManager,
          }),
        });
        const data = await response.json();

        if (response.ok) {
          setMessage({ text: data.message, type: 'success' });
          // If the current user was the old manager, update their role in localStorage
          const updatedUser = { ...currentUser, 'Role': 'user' };
          localStorage.setItem('currentUser', JSON.stringify(updatedUser));
          setCurrentUser(updatedUser); // Update state as well
          // Refresh members list to show updated roles
          const messId = currentUser['Mess ID'];
          const membersRes = await fetch(`/api/members?mess_id=${messId}`);
          const membersData = await membersRes.json();
          if (membersRes.ok) {
            setMembers(membersData);
          }
          setSelectedNewManager(''); // Clear selection
        } else {
          setMessage({ text: `Failed to transfer role: ${data.error || 'Unknown error'}`, type: 'error' });
        }
      } catch (error) {
        console.error('Error transferring manager role:', error);
        setMessage({ text: 'An error occurred while transferring the manager role.', type: 'error' });
      } finally {
        setTransferringManager(false);
      }
    }
  };

  if (!messDetails) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  return (
    <div className="page fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>My Mess Details</h1>
        <button onClick={handleCreateMess} className="btn-primary">Create Another Mess</button>
      </div>

      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}

      {messDetails && (
        <div className="mess-info-card">
          <p><strong>Mess Name:</strong> {messDetails['Mess Name']}</p>
          <p><strong>Location:</strong> {messDetails['Location']}</p>
          <p><strong>Creator:</strong> {messDetails['Creator User ID']}</p>
        </div>
      )}

      <div className="all-member-list">
        <h2>All Members</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Phone</th>
              <th>Join Date</th>
              <th>Status</th>
              <th>Role</th>
              {currentUser && currentUser.Role === 'mess manager' && <th>Password</th>}
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member['Member ID']}>
                <td>{member['Name']}</td>
                <td>{member['Email']}</td>
                <td>{member['Phone']}</td>
                <td>{member['Join Date']}</td>
                <td>{member['Status']}</td>
                <td>{member['Role']}</td>
                {currentUser && currentUser.Role === 'mess manager' && <td>{member['Password']}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div style={{ marginTop: '20px' }}>
        <button onClick={handleDeleteMess} className="btn-primary" style={{ backgroundColor: '#f44336' }} disabled={deletingMess}>
          {deletingMess ? 'Deleting...' : 'Delete This Mess'}
        </button>
      </div>

      {currentUser && currentUser.Role === 'mess manager' && (
        <div className="transfer-manager-section" style={{ marginTop: '30px', borderTop: '1px solid #eee', paddingTop: '20px' }}>
          <h2>Elect Mess Manager</h2>
          <p>Only the current mess manager can elect the next mess manager. Electing a new manager will demote the current manager to a regular user.</p>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <label htmlFor="new-manager-select">Select New Manager:</label>
            <select
              id="new-manager-select"
              value={selectedNewManager}
              onChange={(e) => setSelectedNewManager(e.target.value)}
              style={{ padding: '8px', borderRadius: '4px', border: '1px solid #ccc' }}
              disabled={transferringManager}
            >
              <option value="">-- Select Member --</option>
              {members.map((member) => (
                // Exclude the current mess manager from the list of potential new managers
                member['User ID'] !== currentUser['User ID'] && (
                  <option key={member['Member ID']} value={member['User ID']}>
                    {member['Name']}
                  </option>
                )
              ))}
            </select>
            <button onClick={handleTransferManager} className="btn-primary" disabled={transferringManager}>
              {transferringManager ? 'Transferring...' : 'Transfer Role'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default MyMess;
