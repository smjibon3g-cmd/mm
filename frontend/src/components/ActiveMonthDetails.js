import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useLocation } from 'react-router-dom'; // Import useLocation
import { FaEdit } from 'react-icons/fa';
import LoadingSpinner from './LoadingSpinner';
import * as XLSX from 'xlsx';
import { exportElementToPdf } from '../utils/exportPdf';
import { calculateMessSummary } from '../utils/messCalculations';

function ActiveMonthDetails() {
  const { memberId: memberIdFromUrl } = useParams();
  const location = useLocation(); // Get location object
  const [currentUser, setCurrentUser] = useState(null);
  const [meals, setMeals] = useState([]);
  const [members, setMembers] = useState([]);
  const [deposits, setDeposits] = useState([]); // New state for deposits
  const [costs, setCosts] = useState([]);     // New state for costs
  const [membersWithDetails, setMembersWithDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [editModal, setEditModal] = useState(null);
  const [savingEdit, setSavingEdit] = useState(false);
  const [statusMessage, setStatusMessage] = useState({ text: '', type: '' });

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const fetchActiveMonthData = useCallback(async (userOverride) => {
    const storedUser = userOverride || JSON.parse(localStorage.getItem('currentUser'));
    setLoading(true);
    setError(null);

    if (!storedUser || !storedUser['Mess ID']) {
      setError('User not associated with a mess.');
      setLoading(false);
      return;
    }
    const messId = storedUser['Mess ID'];

    try {
      const [mealsRes, membersRes, depositsRes, costsRes] = await Promise.all([
        fetch(`/api/meals?mess_id=${messId}`),
        fetch(`/api/members?mess_id=${messId}`),
        fetch(`/api/deposits?mess_id=${messId}`),
        fetch(`/api/costs?mess_id=${messId}`)
      ]);

      if (!mealsRes.ok || !membersRes.ok || !depositsRes.ok || !costsRes.ok) {
        throw new Error('Failed to fetch active month data.');
      }

      const mealsData = await mealsRes.json();
      const membersData = await membersRes.json();
      const depositsData = await depositsRes.json();
      const costsData = await costsRes.json();

      setMeals(mealsData);
      setMembers(membersData);
      setDeposits(depositsData);
      setCosts(costsData);

      const { membersWithDetails } = calculateMessSummary({
        membersData,
        mealsData,
        depositsData,
        costsData,
      });

      setMembersWithDetails(membersWithDetails);
    } catch (err) {
      console.error('Error fetching active month data:', err);
      setError('Failed to load active month data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
    }
    fetchActiveMonthData(storedUser);
  }, [fetchActiveMonthData]);

  const isManager = currentUser && currentUser.Role === 'mess manager';

  const handleSaveEdit = async (e) => {
    e.preventDefault();
    if (!editModal || !currentUser) return;
    setSavingEdit(true);
    setStatusMessage({ text: '', type: '' });

    try {
      let url = '';
      let payload = { updated_by_user_id: currentUser['User ID'] };

      if (editModal.type === 'meal') {
        const b = parseFloat(editModal.data.Breakfast) || 0;
        const l = parseFloat(editModal.data.Lunch) || 0;
        const d = parseFloat(editModal.data.Dinner) || 0;
        url = `/api/meals/${editModal.id}`;
        payload = {
          ...payload,
          Date: editModal.data.Date,
          Breakfast: b,
          Lunch: l,
          Dinner: d,
          'Total Meals': b + l + d,
        };
      } else if (editModal.type === 'deposit') {
        url = `/api/deposits/${editModal.id}`;
        payload = {
          ...payload,
          Date: editModal.data.Date,
          'Member ID': editModal.data['Member ID'],
          Amount: parseFloat(editModal.data.Amount) || 0,
        };
      } else if (editModal.type === 'cost') {
        url = `/api/costs/${editModal.id}`;
        payload = {
          ...payload,
          Date: editModal.data.Date,
          Description: editModal.data.Description,
          Amount: parseFloat(editModal.data.Amount) || 0,
          'Paid By Member ID': editModal.data['Paid By Member ID'],
          Category: editModal.data.Category,
        };
      }

      const res = await fetch(url, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await res.json();
      if (!res.ok || !result.success) {
        throw new Error(result.error || 'Failed to save changes.');
      }

      setEditModal(null);
      setStatusMessage({ text: 'Entry updated and all mess members have been notified.', type: 'success' });
      await fetchActiveMonthData(currentUser);
    } catch (err) {
      setStatusMessage({ text: err.message || 'Failed to update entry.', type: 'error' });
    } finally {
      setSavingEdit(false);
    }
  };

  const contentRef = useRef();

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Meal Details
    const mealDetailsData = [];
    const header = ['Date'];
    members.forEach(member => {
      header.push(member.Name + ' B', member.Name + ' L', member.Name + ' D');
    });
    mealDetailsData.push(header);

    uniqueDates.forEach(date => {
      const row = [date];
      allMemberIds.forEach(memberId => {
        const meal = mealsByDateAndMember[date][memberId];
        row.push(meal ? meal.breakfast : 0, meal ? meal.lunch : 0, meal ? meal.dinner : 0);
      });
      mealDetailsData.push(row);
    });

    const totalRow = ['Total'];
    memberTotals.forEach(total => {
      totalRow.push(total.totalBreakfast, total.totalLunch, total.totalDinner);
    });
    mealDetailsData.push(totalRow);

    const ws1 = XLSX.utils.aoa_to_sheet(mealDetailsData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Meal Details');

    // Deposit Details
    const depositDetailsData = currentMonthDeposits.map(deposit => ({
      Date: deposit.Date,
      Member: memberMap[deposit['Member ID']],
      Amount: deposit.Amount
    }));
    const ws2 = XLSX.utils.json_to_sheet(depositDetailsData);
    XLSX.utils.book_append_sheet(wb, ws2, 'Deposit Details');

    // Meal Cost Details
    const mealCostDetailsData = currentMonthCosts.filter(cost => cost.Category === 'Meal').map(cost => ({
      Date: cost.Date,
      Description: cost.Description,
      Amount: cost.Amount,
      'Paid By': memberMap[cost['Paid By Member ID']]
    }));
    const ws3 = XLSX.utils.json_to_sheet(mealCostDetailsData);
    XLSX.utils.book_append_sheet(wb, ws3, 'Meal Cost Details');

    // Individual Other Cost Details
    const individualCostDetailsData = currentMonthCosts.filter(cost => cost.Category === 'Individual').map(cost => ({
      Date: cost.Date,
      Description: cost.Description,
      Amount: cost.Amount,
      'Paid By': memberMap[cost['Paid By Member ID']],
      Category: cost.Category
    }));
    const ws4 = XLSX.utils.json_to_sheet(individualCostDetailsData);
    XLSX.utils.book_append_sheet(wb, ws4, 'Individual Other Cost Details');

    // Shared Other Cost Details
    const sharedCostDetailsData = currentMonthCosts.filter(cost => cost.Category === 'Shared - Meal Consumers' || cost.Category === 'Shared - All Members').map(cost => ({
      Date: cost.Date,
      Description: cost.Description,
      Amount: cost.Amount,
      'Paid By': memberMap[cost['Paid By Member ID']],
      Category: cost.Category
    }));
    const ws5 = XLSX.utils.json_to_sheet(sharedCostDetailsData);
    XLSX.utils.book_append_sheet(wb, ws5, 'Shared Other Cost Details');

    XLSX.writeFile(wb, 'active-month-details.xlsx');
  };

  const handleDownloadPdf = () => {
    exportElementToPdf(contentRef.current, 'active-month-details.pdf');
  };

  if (loading) {
    return (
      <div className="page">
        <LoadingSpinner />
      </div>
    );
  }

  if (error) {
    return <div className="page message error">{error}</div>;
  }

  // Get highlightDeposit query parameter
  const queryParams = new URLSearchParams(location.search);
  const highlightDeposit = queryParams.get('highlightDeposit') === 'true';

  // Filter data for the current month
  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();

  const filterByCurrentMonth = (item) => {
    const itemDate = new Date(item['Date']);
    return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
  };

  const currentMonthMeals = meals.filter(filterByCurrentMonth);
  const currentMonthDeposits = deposits.filter(filterByCurrentMonth);
  const currentMonthCosts = costs.filter(filterByCurrentMonth);

  // Create a map for member ID to name lookup
  const memberMap = members.reduce((acc, member) => {
    acc[member['Member ID']] = member['Name'];
    return acc;
  }, {});

  // Process meals to group by date and member
  const mealsByDateAndMember = {};
  currentMonthMeals.forEach(meal => {
    const date = meal['Date'];
    const memberId = meal['Member ID'];
    if (!mealsByDateAndMember[date]) {
      mealsByDateAndMember[date] = {};
    }
    mealsByDateAndMember[date][memberId] = {
      mealId: meal['Meal ID'],
      breakfast: parseFloat(meal['Breakfast']) || 0,
      lunch: parseFloat(meal['Lunch']) || 0,
      dinner: parseFloat(meal['Dinner']) || 0,
      totalMeals: parseFloat(meal['Total Meals']) || 0
    };
  });

  // Get unique sorted dates
  const uniqueDates = Object.keys(mealsByDateAndMember).sort();

  // Get all member IDs for dynamic columns
  const allMemberIds = members.map(member => member['Member ID']);

  // Calculate totals for each member
  const memberTotals = allMemberIds.map(memberId => {
    let totalBreakfast = 0;
    let totalLunch = 0;
    let totalDinner = 0;

    uniqueDates.forEach(date => {
      if (mealsByDateAndMember[date] && mealsByDateAndMember[date][memberId]) {
        totalBreakfast += mealsByDateAndMember[date][memberId].breakfast;
        totalLunch += mealsByDateAndMember[date][memberId].lunch;
        totalDinner += mealsByDateAndMember[date][memberId].dinner;
      }
    });

    return {
      memberId,
      totalBreakfast,
      totalLunch,
      totalDinner,
    };
  });

  return (
    <div className="page" ref={contentRef}>
      <h1>Active Month Details</h1>
      {statusMessage.text && <div className={`message ${statusMessage.type}`}>{statusMessage.text}</div>}
      <div className="active-month-options">
        <button onClick={handleDownloadPdf}>Download Pdf</button>
        <button onClick={handleExportExcel}>Export Excel</button>
      </div>
      <div className="details-section">
        <h2>Meal Details</h2>
        <table>
          <thead>
            <tr>
              <th rowSpan="2">Date</th>
              {members.map(member => (
                <th key={member['Member ID']} colSpan="3" className={member['Member ID'] === memberIdFromUrl ? 'highlight' : ''}>{member['Name']}</th>
              ))}
            </tr>
            <tr>
              {members.map(member => (
                <React.Fragment key={member['Member ID'] + '-subheaders'}>
                  <th className={member['Member ID'] === memberIdFromUrl ? 'highlight' : ''}>B</th>
                  <th className={member['Member ID'] === memberIdFromUrl ? 'highlight' : ''}>L</th>
                  <th className={member['Member ID'] === memberIdFromUrl ? 'highlight' : ''}>D</th>
                </React.Fragment>
              ))}
            </tr>
          </thead>
          <tbody>
            {uniqueDates.map(date => (
              <tr key={date}>
                <td>{formatDate(date)}</td>
                {allMemberIds.map(memberId => {
                  const entry = mealsByDateAndMember[date][memberId];
                  return (
                    <React.Fragment key={memberId + '-meals'}>
                      <td className={memberId === memberIdFromUrl ? 'highlight' : ''}>{entry ? entry.breakfast : 0}</td>
                      <td className={memberId === memberIdFromUrl ? 'highlight' : ''}>{entry ? entry.lunch : 0}</td>
                      <td className={memberId === memberIdFromUrl ? 'highlight' : ''}>
                        {entry ? entry.dinner : 0}
                        {isManager && entry && entry.mealId && (
                          <button
                            type="button"
                            className="inline-edit-btn"
                            title={`Edit ${memberMap[memberId]}'s meal`}
                            onClick={() => setEditModal({
                              type: 'meal',
                              id: entry.mealId,
                              title: `Edit Meal — ${memberMap[memberId]} (${formatDate(date)})`,
                              data: {
                                Date: date,
                                Breakfast: entry.breakfast,
                                Lunch: entry.lunch,
                                Dinner: entry.dinner,
                              },
                            })}
                          >
                            <FaEdit />
                          </button>
                        )}
                      </td>
                    </React.Fragment>
                  );
                })}
            </tr>
            ))}
            <tr>
              <td><strong>Total</strong></td>
              {memberTotals.map(total => (
                <React.Fragment key={total.memberId + '-total'}>
                  <td className={total.memberId === memberIdFromUrl ? 'highlight' : ''}><strong>{total.totalBreakfast}</strong></td>
                  <td className={total.memberId === memberIdFromUrl ? 'highlight' : ''}><strong>{total.totalLunch}</strong></td>
                  <td className={total.memberId === memberIdFromUrl ? 'highlight' : ''}><strong>{total.totalDinner}</strong></td>
                </React.Fragment>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="details-section">
        <h2>Deposit Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Member</th>
              <th>Amount</th>
              {isManager && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentMonthDeposits.map((deposit, index) => (
              <tr key={deposit['Deposit ID'] || index} className={highlightDeposit && deposit['Member ID'] === memberIdFromUrl ? 'highlight-deposit' : ''}>
                <td>{formatDate(deposit['Date'])}</td>
                <td>{memberMap[deposit['Member ID']]}</td>
                <td>{deposit['Amount']}</td>
                {isManager && (
                  <td>
                    <button
                      type="button"
                      className="inline-edit-btn"
                      onClick={() => setEditModal({
                        type: 'deposit',
                        id: deposit['Deposit ID'],
                        title: `Edit Deposit — ${memberMap[deposit['Member ID']]}`,
                        data: {
                          Date: deposit['Date'],
                          'Member ID': deposit['Member ID'],
                          Amount: deposit['Amount'],
                        },
                      })}
                    >
                      <FaEdit /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="details-section">
        <h2>Meal Cost Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Paid By</th>
              {isManager && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentMonthCosts.filter(cost => cost.Category === 'Meal').map((cost, index) => (
              <tr key={cost['Cost ID'] || index}>
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{memberMap[cost['Paid By Member ID']]}</td>
                {isManager && (
                  <td>
                    <button
                      type="button"
                      className="inline-edit-btn"
                      onClick={() => setEditModal({
                        type: 'cost',
                        id: cost['Cost ID'],
                        title: 'Edit Meal Cost',
                        data: { ...cost },
                      })}
                    >
                      <FaEdit /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="details-section">
        <h2>Individual Other Cost Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Paid By</th>
              <th>Category</th>
              {isManager && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentMonthCosts.filter(cost => cost.Category === 'Individual').map((cost, index) => (
              <tr key={cost['Cost ID'] || index}>
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{memberMap[cost['Paid By Member ID']]}</td>
                <td>{cost['Category']}</td>
                {isManager && (
                  <td>
                    <button
                      type="button"
                      className="inline-edit-btn"
                      onClick={() => setEditModal({
                        type: 'cost',
                        id: cost['Cost ID'],
                        title: 'Edit Individual Cost',
                        data: { ...cost },
                      })}
                    >
                      <FaEdit /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="details-section">
        <h2>Shared Other Cost Details</h2>
        <table>
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Paid By</th>
              <th>Category</th>
              {isManager && <th>Action</th>}
            </tr>
          </thead>
          <tbody>
            {currentMonthCosts.filter(cost => cost.Category === 'Shared - Meal Consumers' || cost.Category === 'Shared - All Members').map((cost, index) => (
              <tr key={cost['Cost ID'] || index}>
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{memberMap[cost['Paid By Member ID']]}</td>
                <td>{cost['Category']}</td>
                {isManager && (
                  <td>
                    <button
                      type="button"
                      className="inline-edit-btn"
                      onClick={() => setEditModal({
                        type: 'cost',
                        id: cost['Cost ID'],
                        title: 'Edit Shared Cost',
                        data: { ...cost },
                      })}
                    >
                      <FaEdit /> Edit
                    </button>
                  </td>
                )}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="all-member-info">
        <h2>All Member Cost Info</h2>
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Total Meal</th>
              <th>Total Deposit</th>
              <th>Meal Cost</th>
              <th>Shared Cost</th>
              <th>Individual Cost</th>
              <th>Total Cost</th>
              <th>Balance</th>
            </tr>
          </thead>
          <tbody>
            {membersWithDetails.map((member) => (
              <tr key={member['Member ID']}>
                <td>{member['Name']}</td>
                <td>{member.totalMeals}</td>
                <td>{member.totalDeposit}</td>
                <td>{member.mealCost.toFixed(2)}</td>
                <td>{member.sharedCost.toFixed(2)}</td>
                <td>{member.individualCost}</td>
                <td>{member.totalCost.toFixed(2)}</td>
                <td>{member.balance.toFixed(2)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {editModal && (
        <div className="modal-backdrop" onClick={() => !savingEdit && setEditModal(null)}>
          <div className="modal-card" onClick={(e) => e.stopPropagation()}>
            <h2>{editModal.title}</h2>
            <form onSubmit={handleSaveEdit}>
              <div className="input-group">
                <label>Date</label>
                <input
                  type="date"
                  value={editModal.data.Date || ''}
                  onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Date: e.target.value } })}
                  required
                />
              </div>

              {editModal.type === 'meal' && (
                <>
                  <div className="input-group">
                    <label>Breakfast</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editModal.data.Breakfast}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Breakfast: e.target.value } })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Lunch</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editModal.data.Lunch}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Lunch: e.target.value } })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Dinner</label>
                    <input
                      type="number"
                      step="0.5"
                      min="0"
                      value={editModal.data.Dinner}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Dinner: e.target.value } })}
                      required
                    />
                  </div>
                </>
              )}

              {editModal.type === 'deposit' && (
                <>
                  <div className="input-group">
                    <label>Member</label>
                    <select
                      value={editModal.data['Member ID'] || ''}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, 'Member ID': e.target.value } })}
                      required
                    >
                      {members.map((m) => (
                        <option key={m['Member ID']} value={m['Member ID']}>{m['Name']}</option>
                      ))}
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editModal.data.Amount}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Amount: e.target.value } })}
                      required
                    />
                  </div>
                </>
              )}

              {editModal.type === 'cost' && (
                <>
                  <div className="input-group">
                    <label>Description</label>
                    <input
                      type="text"
                      value={editModal.data.Description || ''}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Description: e.target.value } })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Amount</label>
                    <input
                      type="number"
                      step="0.01"
                      min="0"
                      value={editModal.data.Amount}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Amount: e.target.value } })}
                      required
                    />
                  </div>
                  <div className="input-group">
                    <label>Category</label>
                    <select
                      value={editModal.data.Category || ''}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, Category: e.target.value } })}
                      required
                    >
                      <option value="Meal">Meal</option>
                      <option value="Individual">Individual</option>
                      <option value="Shared - Meal Consumers">Shared - Meal Consumers</option>
                      <option value="Shared - All Members">Shared - All Members</option>
                    </select>
                  </div>
                  <div className="input-group">
                    <label>Paid By</label>
                    <select
                      value={editModal.data['Paid By Member ID'] || ''}
                      onChange={(e) => setEditModal({ ...editModal, data: { ...editModal.data, 'Paid By Member ID': e.target.value } })}
                    >
                      <option value="">-- Shared / None --</option>
                      {members.map((m) => (
                        <option key={m['Member ID']} value={m['Member ID']}>{m['Name']}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}

              <div className="modal-actions">
                <button type="button" className="btn-export" onClick={() => setEditModal(null)} disabled={savingEdit}>
                  Cancel
                </button>
                <button type="submit" disabled={savingEdit}>
                  {savingEdit ? 'Saving...' : 'Save & Notify All'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default ActiveMonthDetails;