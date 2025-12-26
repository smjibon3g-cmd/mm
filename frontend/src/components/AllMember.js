import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

function AllMember() {
  const [members, setMembers] = useState([]);
  const [message, setMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(true);
  const [currentUser, setCurrentUser] = useState(null);
  const [electingManager, setElectingManager] = useState(false);

  const fetchMembers = async () => {
    setLoading(true);
    const user = JSON.parse(localStorage.getItem('currentUser'));
    setCurrentUser(user);

    if (!user || !user['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first to view members.', type: 'error' });
      setLoading(false);
      return;
    }

    const messId = user['Mess ID'];

    try {
      const membersRes = await fetch(`/api/members?mess_id=${messId}`);
      if (!membersRes.ok) {
        throw new Error('Failed to fetch members.');
      }
      const membersData = await membersRes.json();
      setMembers(membersData);

    } catch (error) {
      console.error('Error fetching data:', error);
      setMessage({ text: 'Error fetching data.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMembers();
  }, []);

  const handleElectManager = async (newManagerUserId) => {
    if (!currentUser || !currentUser['Mess ID']) {
        setMessage({ text: 'Could not verify current user.', type: 'error' });
        return;
    }
    setMessage({ text: '', type: '' }); // Clear previous messages
    setElectingManager(true); // Start loading

    try {
        const response = await fetch('/api/mess/elect-manager', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                mess_id: currentUser['Mess ID'],
                new_manager_user_id: newManagerUserId,
                requesting_user_id: currentUser['User ID'],
            }),
        });

        const data = await response.json();

        if (response.ok && data.success) {
            setMessage({ text: data.message || 'Successfully elected new manager!', type: 'success' });
            
            // Update the current user's state and localStorage with the authoritative data from the backend
            localStorage.setItem('currentUser', JSON.stringify(data.updated_user));
            setCurrentUser(data.updated_user);

            // Refresh the member list to show the new roles for everyone
            await fetchMembers();
        } else {
            throw new Error(data.error || 'Failed to elect manager.');
        }
    } catch (error) {
        console.error('Error electing manager:', error);
        setMessage({ text: error.message, type: 'error' });
    } finally {
        setElectingManager(false); // End loading
    }
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  const loggedInUserAsMember = members.find(m => m['User ID'] === currentUser['User ID']);
  const isManager = loggedInUserAsMember && loggedInUserAsMember.Role === 'mess manager';

  return (
    <div className="page">
      <h1>All Member</h1>
      <div className="all-member-list fade-in">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Role</th>
              <th>Action</th>
            </tr>
          </thead>
          <tbody>
            {members.map((member) => (
              <tr key={member['Member ID']}>
                <td>{member['Name']}</td>
                <td>{member['Email']}</td>
                <td>{member['Role']}</td>
                <td>
                  {isManager && member['Role'] !== 'mess manager' && (
                    <button onClick={() => handleElectManager(member['User ID'])} disabled={electingManager}>
                      {electingManager ? 'Electing...' : 'Make Manager'}
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {electingManager && <LoadingSpinner />}
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
    </div>
  );
}

export default AllMember;