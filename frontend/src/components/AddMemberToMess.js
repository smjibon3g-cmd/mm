import React, { useState, useEffect } from 'react';
import LoadingSpinner from './LoadingSpinner';

function AddMemberToMess() {
  const [showAddMemberForm, setShowAddMemberForm] = useState(true);
  const [memberName, setMemberName] = useState('');
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState(''); // Not used in backend, but kept for form
  const [message, setMessage] = useState({ text: '', type: '' });
  const [availableUsers, setAvailableUsers] = useState([]);
  const [selectedUser, setSelectedUser] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [loadingInitial, setLoadingInitial] = useState(true);
  const [loadingExisting, setLoadingExisting] = useState(false);
  const [loadingCreate, setLoadingCreate] = useState(false);

  useEffect(() => {
    // Fetch users who are not yet members of any mess
    const fetchAvailableUsers = async () => {
      setLoadingInitial(true);
      try {
        const response = await fetch('/api/users'); // Assuming an API endpoint to get all users
        const data = await response.json();
        // Filter users who don't have a Mess ID
        setAvailableUsers(data.filter(user => !user['Mess ID']));
      } catch (error) {
        console.error('Error fetching available users:', error);
        setMessage({ text: 'Error fetching available users.', type: 'error' });
      } finally {
        setLoadingInitial(false);
      }
    };
    fetchAvailableUsers();
  }, []);

  const filteredUsers = availableUsers.filter(user =>
    user.Username.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleAddExistingMember = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '' });
    setLoadingExisting(true);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first.', type: 'error' });
      return;
    }

    if (!selectedUser) {
      setMessage({ text: 'Please select a member to add.', type: 'error' });
      return;
    }

    try {
      const response = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mess_id: currentUser['Mess ID'], username: selectedUser }),
      });
      const data = await response.json();

      if (response.ok) {
        setMessage({ text: `Member '${selectedUser}' added successfully! Generated Password: ${data.generated_password}`, type: 'success' });
        setSelectedUser('');
        // Refresh available users
        const updatedUsers = availableUsers.filter(user => user['Username'] !== selectedUser);
        setAvailableUsers(updatedUsers);
      } else {
        setMessage({ text: `Failed to add member: ${data.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error adding existing member:', error);
      setMessage({ text: 'An error occurred while adding the member.', type: 'error' });
    } finally {
      setLoadingExisting(false);
    }
  };

  const handleCreateAndAddMember = async (event) => {
    event.preventDefault();
    setMessage({ text: '', type: '', });
    setLoadingCreate(true);

    const currentUser = JSON.parse(localStorage.getItem('currentUser'));
    if (!currentUser || !currentUser['Mess ID']) {
      setMessage({ text: 'Please create or join a mess first.', type: 'error' });
      return;
    }

    try {
      // First, register the new user
      const registerResponse = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: memberName, password: memberPassword, email: memberEmail }), // Assuming backend handles email
      });
      const registerData = await registerResponse.json();

      if (!registerResponse.ok) {
        setMessage({ text: `Failed to create user: ${registerData.error || 'Unknown error'}`, type: 'error' });
        return;
      }

      // Then, add the newly created user to the mess
      const addMemberResponse = await fetch('/api/members', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ mess_id: currentUser['Mess ID'], username: memberName }),
      });
      const addMemberData = await addMemberResponse.json();

      if (addMemberResponse.ok) {
        setMessage({ text: `Member '${memberName}' created and added successfully! Generated Password: ${addMemberData.generated_password}`, type: 'success' });
        setMemberName('');
        setMemberEmail('');
        setMemberPassword('');
      } else {
        setMessage({ text: `Failed to add member to mess: ${addMemberData.error || 'Unknown error'}`, type: 'error' });
      }
    } catch (error) {
      console.error('Error creating and adding member:', error);
      setMessage({ text: 'An error occurred while creating and adding the member.', type: 'error' });
    } finally {
      setLoadingCreate(false);
    }
  };

  return (
    <div className="page">
      <h1>Add Member to Mess</h1>
      {loadingInitial ? (
        <LoadingSpinner />
      ) : (
        <>
          <div className="add-member-options">
            <button onClick={() => setShowAddMemberForm(true)}>Add Member</button>
            <button onClick={() => setShowAddMemberForm(false)}>Create and Add Member</button>
          </div>

          {showAddMemberForm ? (
            <div className="member-form">
              <h2>Add Existing Member</h2>
              <form onSubmit={handleAddExistingMember}>
                <label htmlFor="search-member">Search Member:</label>
                <input
                  type="text"
                  id="search-member"
                  name="search-member"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Search by username"
                />
                <label htmlFor="select-member">Select Member:</label>
                <select
                  id="select-member"
                  name="select-member"
                  value={selectedUser}
                  onChange={(e) => setSelectedUser(e.target.value)}
                >
                  <option value="">-- Select User --</option>
                  {filteredUsers.map((user) => (
                    <option key={user['User ID']} value={user['Username']}>
                      {user['Username']}
                    </option>
                  ))}
                </select>
                <button type="submit" disabled={loadingExisting}>{loadingExisting ? 'Adding...' : 'Add to Mess'}</button>
              </form>
            </div>
          ) : (
            <div className="member-form">
              <h2>Create and Add New Member</h2>
              <form onSubmit={handleCreateAndAddMember}>
                <label htmlFor="member-name">Name:</label>
                <input
                  type="text"
                  id="member-name"
                  name="member-name"
                  value={memberName}
                  onChange={(e) => setMemberName(e.target.value)}
                />
                <label htmlFor="member-email">Email:</label>
                <input
                  type="email"
                  id="member-email"
                  name="member-email"
                  value={memberEmail}
                  onChange={(e) => setMemberEmail(e.target.value)}
                />
                <label htmlFor="member-password">Password:</label>
                <input
                  type="password"
                  id="member-password"
                  name="member-password"
                  value={memberPassword}
                  onChange={(e) => setMemberPassword(e.target.value)}
                />
                <button type="submit" disabled={loadingCreate}>{loadingCreate ? 'Creating...' : 'Create and Add'}</button>
              </form>
            </div>
          )}
        </>
      )}
      {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
    </div>
  );
}

export default AddMemberToMess;
