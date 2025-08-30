import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';

function Register() {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState({ text: '', type: '' });
  const [usernameMessage, setUsernameMessage] = useState({ text: '', type: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const showMessage = (text, type) => {
    setMessage({ text, type });
  };

  const handleUsernameBlur = async () => {
    if (username.length > 0) {
      setLoading(true);
      try {
        const response = await fetch(`/api/check_username?username=${username}`);
        const data = await response.json();
        if (data.exists) {
          setUsernameMessage({ text: 'Username already taken.', type: 'error' });
        } else {
          setUsernameMessage({ text: 'Username available.', type: 'success' });
        }
      } catch (error) {
        console.error('Error checking username:', error);
        setUsernameMessage({ text: 'Error checking username.', type: 'error' });
      } finally {
        setLoading(false);
      }
    } else {
      setUsernameMessage({ text: '', type: '' });
    }
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setLoading(true);

    try {
      const response = await fetch('/api/register', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username, password }),
      });
      const data = await response.json();

      if (response.ok) {
        showMessage('Registration successful! Please login.', 'success');
        setUsername('');
        setPassword('');
        setTimeout(() => {
          navigate('/login');
        }, 2000);
      } else {
        showMessage(data.error || 'Registration failed', 'error');
      }
    } catch (error) {
      console.error('Error during registration:', error);
      showMessage('An error occurred during registration.', 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-container">
      <div className="auth-card fade-in">
        <h2>Register for Mess Manager</h2>
        <form onSubmit={handleSubmit}>
          <div className="input-group">
            <label htmlFor="username">Username</label>
            <input
              type="text"
              id="username"
              name="username"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              onBlur={handleUsernameBlur}
            />
            {usernameMessage.text && <div className={`message ${usernameMessage.type}`}>{usernameMessage.text}</div>}
          </div>
          <div className="input-group">
            <label htmlFor="password">Password</label>
            <input
              type="password"
              id="password"
              name="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          <button type="submit" className="btn-primary" disabled={loading}>{loading ? 'Registering...' : 'Register'}</button>
        </form>
        <p className="auth-switch">Already have an account? <a href="/login">Login here</a></p>
        {message.text && <div className={`message ${message.type}`}>{message.text}</div>}
      </div>
      {loading && <LoadingSpinner />}
    </div>
  );
}

export default Register;