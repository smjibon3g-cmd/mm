import React, { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import LoadingSpinner from './LoadingSpinner';
import { FaBalanceScale, FaMoneyBillWave, FaUtensils, FaMoneyBillAlt, FaChartLine, FaUserCircle, FaUsers, FaUser, FaCalendarAlt, FaMoneyBill, FaHome, FaTachometerAlt } from 'react-icons/fa';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  const contentRef = useRef();

  const handleDownloadPdf = () => {
    const input = contentRef.current;
    html2canvas(input, { scrollY: -window.scrollY, scale: 3 }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / pdfWidth;
      const height = canvasHeight / ratio;

      if (height > pdfHeight) {
        let pageHeight = pdfHeight;
        let totalPages = Math.ceil(height / pageHeight);

        for (let i = 0; i < totalPages; i++) {
          let y = i * pageHeight;
          let h = Math.min(pageHeight, height - y);
          let pageCanvas = document.createElement('canvas');
          pageCanvas.width = canvasWidth;
          pageCanvas.height = h * ratio;
          let pageCtx = pageCanvas.getContext('2d');
          pageCtx.drawImage(canvas, 0, y * ratio, canvasWidth, h * ratio, 0, 0, canvasWidth, h * ratio);

          if (i > 0) {
            pdf.addPage();
          }
          pdf.addImage(pageCanvas.toDataURL('image/png'), 'PNG', 0, 0, pdfWidth, h);
        }
      } else {
        pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, height);
      }

      pdf.save('dashboard.pdf');
    });
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

  return (
    <div className="page" ref={contentRef}>
      <h1><FaTachometerAlt /> Dashboard</h1>
      {messName && (
        <div className="mess-details-card fade-in-up">
          <h2><FaHome /> Mess: {messName} (Manager: {messManager})</h2>
        </div>
      )}
      <div className="dashboard-options">
        <button onClick={handleDownloadPdf}>Download Pdf</button>
        <button onClick={handleExportExcel}>Export Excel</button>
      </div>
      {currentUser && <p>Welcome, {currentUser.Username}! Your role: {currentUser.Role}</p>}
      <div className="dashboard-summary">
        <div className="summary-card fade-in-up">
          <h3><FaBalanceScale /> Mess Balance</h3>
          <p>{messBalance}</p>
        </div>
        <div className="summary-card fade-in-up">
          <h3><FaMoneyBillWave /> Total Deposit</h3>
          <p>
            {currentUser && currentUser['Member ID'] && (
              <Link to={`/active-month-details/${currentUser['Member ID']}?highlightDeposit=true`}>
                {totalDeposit}
              </Link>
            )}
            {(!currentUser || !currentUser['Member ID']) && totalDeposit}
          </p>
        </div>
        <div className="summary-card fade-in-up">
          <h3><FaUtensils /> Total Meal</h3>
          <p><Link to="/active-month-details">{totalMeal}</Link></p>
        </div>
        <div className="summary-card fade-in-up">
          <h3><FaMoneyBillAlt /> Total Meal Cost</h3>
          <p>{totalMealCost}</p>
        </div>
        <div className="summary-card fade-in-up">
          <h3><FaChartLine /> Meal Rate</h3>
          <p>{mealRate}</p>
        </div>
        <div className="summary-card fade-in-up">
          <h3><FaUserCircle /> Total Individual Other Cost</h3>
          <p>{totalIndividualOtherCost}</p>
        </div>
        <div className="summary-card fade-in-up">
          <h3><FaUsers /> Total Shared Other Cost</h3>
          <p>{totalSharedOtherCost}</p>
        </div>
      </div>
      <div className="dashboard-details">
        <div className="personal-info-card">
          <h2><FaUser /> My Personal Info</h2>
          <p>My Total Meal: {myTotalMeal}</p>
          <p>My Deposit: {myDeposit}</p>
          <p>My Cost: {myCost.toFixed(2)}</p>
          <p>My Balance: {myBalance.toFixed(2)}</p>
        </div>
        <div className="bazar-dates">
          <h2><FaCalendarAlt /> My Bazar Date</h2>
          <ul>
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
        <h2><FaUsers /> All Member Info</h2>
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
              <tr key={member['Member ID']} className="fade-in">
                <td>{member['Name']}</td>
                <td><Link to={`/active-month-details/${member['Member ID']}`}>{member.totalMeals}</Link></td>
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
      <div className="other-costs-info">
        <h2><FaMoneyBill /> Cost info</h2>
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
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{cost['Category']}</td>
                <td>{membersWithDetails.find(m => m['Member ID'] === cost['Paid By Member ID'])?.Name}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default Dashboard;