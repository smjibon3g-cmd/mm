import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { FaBalanceScale, FaMoneyBillWave, FaUtensils, FaMoneyBillAlt, FaChartLine, FaUserCircle, FaUsers, FaUser, FaCalendarAlt, FaMoneyBill, FaHome, FaTachometerAlt, FaFilePdf, FaFileExcel, FaPlus, FaShoppingCart, FaPiggyBank } from 'react-icons/fa';
import * as XLSX from 'xlsx';
import { exportElementToPdf } from '../utils/exportPdf';

function Dashboard() {
  const [currentUser, setCurrentUser] = useState(null);
  const [messName, setMessName] = useState('');
  const [messManager, setMessManager] = useState('');
  const [messBalance, setMessBalance] = useState(0);
  const [totalDeposit, setTotalDeposit] = useState(0);
  const [totalMeal, setTotalMeal] = useState(0);
  const [totalMealCost, setTotalMealCost] = useState(0);
  const [mealRate, setMealRate] = useState(0);
  const [totalIndividualOtherCost, setTotalIndividualOtherCost] = useState(0);
  const [totalSharedOtherCost, setTotalSharedOtherCost] = useState(0);
  const [otherCosts, setOtherCosts] = useState([]);
  const [membersWithDetails, setMembersWithDetails] = useState([]);
  const [myTotalMeal, setMyTotalMeal] = useState(0);
  const [myDeposit, setMyDeposit] = useState(0);
  const [myCost, setMyCost] = useState(0);
  const [myBalance, setMyBalance] = useState(0);
  const [bazarDates, setBazarDates] = useState([]);
  const [memberSearch, setMemberSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const contentRef = useRef();

  const handleDownloadPdf = () => {
    exportElementToPdf(contentRef.current, 'dashboard.pdf');
  };

  const handleExportExcel = () => {
    const wb = XLSX.utils.book_new();

    // Summary Data
    const summaryData = [
      ['Mess Balance', messBalance],
      ['Total Deposit', totalDeposit],
      ['Total Meal', totalMeal],
      ['Total Meal Cost', totalMealCost],
      ['Meal Rate', mealRate],
      ['Total Individual Other Cost', totalIndividualOtherCost],
      ['Total Shared Other Cost', totalSharedOtherCost],
    ];
    const ws1 = XLSX.utils.aoa_to_sheet(summaryData);
    XLSX.utils.book_append_sheet(wb, ws1, 'Summary');

    // All Member Info
    const memberInfoHeaders = ['Name', 'Total Meal', 'Total Deposit', 'Meal Cost', 'Shared Cost', 'Individual Cost', 'Total Cost', 'Balance'];
    const memberInfoData = membersWithDetails.map(member => [
      member.Name,
      member.totalMeals,
      member.totalDeposit,
      member.mealCost.toFixed(2),
      member.sharedCost.toFixed(2),
      member.individualCost,
      member.totalCost.toFixed(2),
      member.balance.toFixed(2),
    ]);
    const ws2 = XLSX.utils.aoa_to_sheet([memberInfoHeaders, ...memberInfoData]);
    XLSX.utils.book_append_sheet(wb, ws2, 'Member Info');

    // Cost Info
    const costInfoHeaders = ['Date', 'Description', 'Amount', 'Category', 'Paid By'];
    const costInfoData = otherCosts.map(cost => [
      cost.Date,
      cost.Description,
      cost.Amount,
      cost.Category,
      membersWithDetails.find(m => m['Member ID'] === cost['Paid By Member ID'])?.Name || '',
    ]);
    const ws3 = XLSX.utils.aoa_to_sheet([costInfoHeaders, ...costInfoData]);
    XLSX.utils.book_append_sheet(wb, ws3, 'Cost Info');

    XLSX.writeFile(wb, 'dashboard.xlsx');
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));
    if (storedUser) {
      setCurrentUser(storedUser);
    }

    const fetchDashboardData = async () => {
      setLoading(true);
      setError(null);

      if (!storedUser || !storedUser['Mess ID']) {
        setError('User not associated with a mess.');
        setLoading(false);
        return;
      }
      const messId = storedUser['Mess ID'];

      try {
        const [membersRes, depositsRes, mealsRes, costsRes, messDetailsRes, bazarDatesRes] = await Promise.all([
          fetch(`/api/members?mess_id=${messId}`),
          fetch(`/api/deposits?mess_id=${messId}`),
          fetch(`/api/meals?mess_id=${messId}`),
          fetch(`/api/costs?mess_id=${messId}`),
          fetch(`/api/my_mess?mess_id=${messId}`),
          fetch(`/api/bazar_dates?mess_id=${messId}`)
        ]);

        if (!membersRes.ok || !depositsRes.ok || !mealsRes.ok || !costsRes.ok || !messDetailsRes.ok || !bazarDatesRes.ok) {
          throw new Error('Failed to fetch some dashboard data.');
        }

        const membersData = await membersRes.json();
        const depositsData = await depositsRes.json();
        const mealsData = await mealsRes.json();
        const costsData = await costsRes.json();
        const messDetailsData = await messDetailsRes.json();
        const bazarDatesData = await bazarDatesRes.json();

        setBazarDates(bazarDatesData);

        const memberMealTotals = mealsData.reduce((acc, meal) => {
          const memberId = meal['Member ID'];
          acc[memberId] = (acc[memberId] || 0) + parseFloat(meal['Total Meals']);
          return acc;
        }, {});

        // Identify unique meal consumers
        const mealConsumers = new Set(mealsData.map(meal => meal['Member ID']));
        const numberOfMealConsumers = mealConsumers.size;

        const manager = membersData.find(m => m.Role === 'mess manager');
        if (manager) {
          setMessManager(manager.Name);
        }

        if (messDetailsData.success) {
          setMessName(messDetailsData.mess['Mess Name']);
        } else {
          throw new Error(messDetailsData.error || 'Failed to fetch mess details');
        }

        const totalDep = depositsData.reduce((acc, dep) => acc + parseFloat(dep['Amount']), 0);
        setTotalDeposit(totalDep);

        const totalM = mealsData.reduce((acc, meal) => acc + parseFloat(meal['Total Meals']), 0);
        setTotalMeal(totalM);

        // Separate costs by category
        const mealCosts = costsData.filter(c => c.Category === 'Meal').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
        const individualCosts = costsData.filter(c => c.Category === 'Individual').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
        const sharedMealConsumerCostsTotal = costsData.filter(c => c.Category === 'Shared - Meal Consumers').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
        const sharedAllMembersCostsTotal = costsData.filter(c => c.Category === 'Shared - All Members').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);

        const otherCostsData = costsData.filter(c => c.Category !== 'Meal');
        setOtherCosts(otherCostsData);

        setTotalIndividualOtherCost(individualCosts);
        setTotalSharedOtherCost(sharedMealConsumerCostsTotal + sharedAllMembersCostsTotal); // Sum of both shared types

        setTotalMealCost(mealCosts); // Only meal costs for totalMealCost

        const totalAllCosts = mealCosts + individualCosts + sharedMealConsumerCostsTotal + sharedAllMembersCostsTotal; // Total of all costs
        
        const messBal = totalDep - totalAllCosts; // Use totalAllCosts for mess balance
        setMessBalance(messBal);

        const mealR = totalM > 0 ? mealCosts / totalM : 0; // Meal rate based only on meal costs
        setMealRate(mealR.toFixed(2));

        // Calculate per-member shared costs
        const perMemberSharedAllMembersCost = membersData.length > 0 ? sharedAllMembersCostsTotal / membersData.length : 0;
        const perMemberSharedMealConsumerCost = numberOfMealConsumers > 0 ? sharedMealConsumerCostsTotal / numberOfMealConsumers : 0;

        const membersWithDetails = membersData.map(member => {
          const memberId = member['Member ID'];
          const totalMeals = memberMealTotals[memberId] || 0;
          const mealCost = mealR * totalMeals;

          const totalDeposit = depositsData
            .filter(dep => dep['Member ID'] === memberId)
            .reduce((acc, dep) => acc + parseFloat(dep['Amount']), 0);

          const individualCost = costsData
            .filter(cost => cost.Category === 'Individual' && cost['Paid By Member ID'] === memberId)
            .reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);

          let sharedCostForMember = perMemberSharedAllMembersCost;
          if (mealConsumers.has(memberId)) {
            sharedCostForMember += perMemberSharedMealConsumerCost;
          }

          const totalCost = mealCost + individualCost + sharedCostForMember;
          const balance = totalDeposit - totalCost;

          return {
            ...member,
            totalMeals,
            totalDeposit,
            mealCost,
            individualCost,
            sharedCost: sharedCostForMember, // Use the calculated shared cost for the member
            totalCost,
            balance,
          };
        });

        setMembersWithDetails(membersWithDetails);

        const currentUserMemberDetails = membersWithDetails.find(m => m['User ID'] === storedUser['User ID']);
        if (currentUserMemberDetails) {
          setMyTotalMeal(currentUserMemberDetails.totalMeals);
          setMyDeposit(currentUserMemberDetails.totalDeposit);
          setMyCost(currentUserMemberDetails.totalCost);
          setMyBalance(currentUserMemberDetails.balance);
        }

      } catch (err) {
        console.error('Error fetching dashboard data:', err);
        setError('Failed to load dashboard data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboardData();
  }, []);

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

  const filteredMembers = membersWithDetails.filter((member) =>
    (member['Name'] || '').toLowerCase().includes(memberSearch.trim().toLowerCase())
  );

  return (
    <div className="page" ref={contentRef}>
      <div className="dashboard-hero fade-in-up">
        <div className="dashboard-hero-info">
          <div className="dashboard-title-row">
            <h1><FaTachometerAlt /> Dashboard</h1>
            {currentUser && <span className="role-pill">{currentUser.Role}</span>}
          </div>
          {messName && (
            <p className="dashboard-mess-subtitle">
              <FaHome /> <strong>{messName}</strong> &middot; Manager: <strong>{messManager}</strong>
              {currentUser && <> &middot; Hi, <strong>{currentUser.Username}</strong></>}
            </p>
          )}
        </div>
        <div className="dashboard-hero-actions">
          <div className="quick-actions">
            <Link to="/add-meal" className="quick-action-btn"><FaPlus /> Meal</Link>
            <Link to="/add-cost" className="quick-action-btn"><FaShoppingCart /> Cost</Link>
            <Link to="/add-deposit" className="quick-action-btn"><FaPiggyBank /> Deposit</Link>
          </div>
          <div className="dashboard-options">
            <button onClick={handleDownloadPdf} className="btn-export"><FaFilePdf /> PDF</button>
            <button onClick={handleExportExcel} className="btn-export"><FaFileExcel /> Excel</button>
          </div>
        </div>
      </div>

      <div className="dashboard-summary">
        <div className="summary-card kpi-emerald fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaBalanceScale /></span>
            <h3>Mess Balance</h3>
          </div>
          <p>{messBalance}</p>
        </div>
        <div className="summary-card kpi-blue fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaMoneyBillWave /></span>
            <h3>Total Deposit</h3>
          </div>
          <p>
            {currentUser && currentUser['Member ID'] ? (
              <Link className="kpi-link" to={`/active-month-details/${currentUser['Member ID']}?highlightDeposit=true`}>
                {totalDeposit}
              </Link>
            ) : totalDeposit}
          </p>
        </div>
        <div className="summary-card kpi-emerald fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaUtensils /></span>
            <h3>Total Meal</h3>
          </div>
          <p><Link className="kpi-link" to="/active-month-details">{totalMeal}</Link></p>
        </div>
        <div className="summary-card kpi-amber fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaMoneyBillAlt /></span>
            <h3>Total Meal Cost</h3>
          </div>
          <p>{totalMealCost}</p>
        </div>
        <div className="summary-card kpi-blue fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaChartLine /></span>
            <h3>Meal Rate</h3>
          </div>
          <p>{mealRate}</p>
        </div>
        <div className="summary-card kpi-amber fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaUserCircle /></span>
            <h3>Individual Cost</h3>
          </div>
          <p>{totalIndividualOtherCost}</p>
        </div>
        <div className="summary-card kpi-blue fade-in-up">
          <div className="kpi-header">
            <span className="kpi-icon"><FaUsers /></span>
            <h3>Shared Cost</h3>
          </div>
          <p>{totalSharedOtherCost}</p>
        </div>
      </div>
      <div className="dashboard-details">
        <div className="personal-info-card">
          <h2><FaUser /> My Personal Info</h2>
          <div className="info-row"><span>My Total Meal</span><strong>{myTotalMeal}</strong></div>
          <div className="info-row"><span>My Deposit</span><strong>{myDeposit}</strong></div>
          <div className="info-row"><span>My Cost</span><strong>{myCost.toFixed(2)}</strong></div>
          <div className="info-row">
            <span>My Balance</span>
            <span className={`balance-badge ${myBalance >= 0 ? 'positive' : 'negative'}`}>
              {myBalance >= 0 ? '+' : ''}{myBalance.toFixed(2)}
            </span>
          </div>
        </div>
        <div className="bazar-dates">
          <h2><FaCalendarAlt /> My Bazar Date</h2>
          <ul className="bazar-list">
            {bazarDates.length > 0 ? (
              Object.entries(bazarDates.filter(bazarDate => bazarDate['Member ID'] === currentUser['Member ID']).reduce((acc, bazarDate) => {
                const memberId = bazarDate['Member ID'];
                if (!acc[memberId]) {
                  acc[memberId] = [];
                }
                acc[memberId].push(bazarDate.Date);
                return acc;
              }, {})).map(([memberId, dates]) => {
                const memberName = membersWithDetails.find(m => m['Member ID'] === memberId)?.Name;
                const sortedDates = dates.sort();
                const startDate = formatDate(sortedDates[0]);
                const endDate = formatDate(sortedDates[sortedDates.length - 1]);
                return (
                  <li key={memberId}>
                    {startDate} to {endDate} - {memberName}
                  </li>
                );
              })
            ) : (
              <li>No dates assigned</li>
            )}
          </ul>
        </div>
      </div>
      <div className="all-member-info">
        <div className="section-header-row">
          <h2><FaUsers /> All Member Info <span className="count-pill">{filteredMembers.length}</span></h2>
          <input
            type="search"
            className="section-search-input"
            placeholder="Search member..."
            value={memberSearch}
            onChange={(e) => setMemberSearch(e.target.value)}
            aria-label="Search members"
          />
        </div>
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
            {filteredMembers.map((member) => (
              <tr key={member['Member ID']} className="fade-in">
                <td data-label="Name"><strong>{member['Name']}</strong></td>
                <td data-label="Total Meal"><Link className="meal-pill-link" to={`/active-month-details/${member['Member ID']}`}>{member.totalMeals}</Link></td>
                <td data-label="Total Deposit">{member.totalDeposit}</td>
                <td data-label="Meal Cost">{member.mealCost.toFixed(2)}</td>
                <td data-label="Shared Cost">{member.sharedCost.toFixed(2)}</td>
                <td data-label="Individual Cost">{member.individualCost}</td>
                <td data-label="Total Cost">{member.totalCost.toFixed(2)}</td>
                <td data-label="Balance">
                  <span className={`balance-badge ${member.balance >= 0 ? 'positive' : 'negative'}`}>
                    {member.balance >= 0 ? '+' : ''}{member.balance.toFixed(2)}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="other-costs-info">
        <div className="section-header-row">
          <h2><FaMoneyBill /> Cost Info <span className="count-pill">{otherCosts.length}</span></h2>
        </div>
        <table className="other-costs-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description</th>
              <th>Amount</th>
              <th>Category</th>
              <th>Paid By</th>
            </tr>
          </thead>
          <tbody>
            {otherCosts.map((cost, index) => (
              <tr key={index}>
                <td data-label="Date">{formatDate(cost['Date'])}</td>
                <td data-label="Description">{cost['Description']}</td>
                <td data-label="Amount">{cost['Amount']}</td>
                <td data-label="Category">{cost['Category']}</td>
                <td data-label="Paid By">{membersWithDetails.find(m => m['Member ID'] === cost['Paid By Member ID'])?.Name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;