import React, { useState, useEffect, useRef } from 'react';
import { useParams, useLocation } from 'react-router-dom'; // Import useLocation
import LoadingSpinner from './LoadingSpinner';
import jsPDF from 'jspdf';
import html2canvas from 'html2canvas';
import * as XLSX from 'xlsx';

function ActiveMonthDetails() {
  const { memberId: memberIdFromUrl } = useParams();
  const location = useLocation(); // Get location object
  const [meals, setMeals] = useState([]);
  const [members, setMembers] = useState([]);
  const [deposits, setDeposits] = useState([]); // New state for deposits
  const [costs, setCosts] = useState([]);     // New state for costs
  const [membersWithDetails, setMembersWithDetails] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const formatDate = (dateString) => {
    const [year, month, day] = dateString.split('-');
    return `${day}-${month}-${year}`;
  };

  useEffect(() => {
    const storedUser = JSON.parse(localStorage.getItem('currentUser'));


    const fetchActiveMonthData = async () => {
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
          fetch(`/api/deposits?mess_id=${messId}`), // Fetch deposits
          fetch(`/api/costs?mess_id=${messId}`)     // Fetch costs
        ]);

        if (!mealsRes.ok || !membersRes.ok || !depositsRes.ok || !costsRes.ok) {
          throw new Error('Failed to fetch active month data.');
        }

        const mealsData = await mealsRes.json();
        const membersData = await membersRes.json();
        const depositsData = await depositsRes.json(); // Get deposits data
        const costsData = await costsRes.json();     // Get costs data

        setMeals(mealsData);
        setMembers(membersData);
        setDeposits(depositsData);
        setCosts(costsData);

        const memberMealTotals = mealsData.reduce((acc, meal) => {
          const memberId = meal['Member ID'];
          acc[memberId] = (acc[memberId] || 0) + parseFloat(meal['Total Meals']);
          return acc;
        }, {});

        const mealConsumers = new Set(mealsData.map(meal => meal['Member ID']));
        const numberOfMealConsumers = mealConsumers.size;

        const mealCosts = costsData.filter(c => c.Category === 'Meal').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
        const sharedMealConsumerCostsTotal = costsData.filter(c => c.Category === 'Shared - Meal Consumers').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);
        const sharedAllMembersCostsTotal = costsData.filter(c => c.Category === 'Shared - All Members').reduce((acc, cost) => acc + parseFloat(cost['Amount']), 0);

        const totalM = mealsData.reduce((acc, meal) => acc + parseFloat(meal['Total Meals']), 0);

        const mealR = totalM > 0 ? mealCosts / totalM : 0;

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
            sharedCost: sharedCostForMember,
            totalCost,
            balance,
          };
        });

        setMembersWithDetails(membersWithDetails);

      } catch (err) {
        console.error('Error fetching active month data:', err);
        setError('Failed to load active month data. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchActiveMonthData();
  }, []);

  const contentRef = useRef();

  const handleExportExcel = () => {
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();

    const filterByCurrentMonth = (item) => {
      const itemDate = new Date(item['Date']);
      return itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear;
    };

    const currentMonthMeals = meals.filter(filterByCurrentMonth);
    const currentMonthDeposits = deposits.filter(filterByCurrentMonth);
    const currentMonthCosts = costs.filter(filterByCurrentMonth);

    const memberMap = members.reduce((acc, member) => {
      acc[member['Member ID']] = member['Name'];
      return acc;
    }, {});

    const mealsByDateAndMember = {};
    currentMonthMeals.forEach(meal => {
      const date = meal['Date'];
      const memberId = meal['Member ID'];
      if (!mealsByDateAndMember[date]) {
        mealsByDateAndMember[date] = {};
      }
      mealsByDateAndMember[date][memberId] = {
        breakfast: parseFloat(meal['Breakfast']),
        lunch: parseFloat(meal['Lunch']),
        dinner: parseFloat(meal['Dinner']),
        totalMeals: parseFloat(meal['Total Meals'])
      };
    });

    const uniqueDates = Object.keys(mealsByDateAndMember).sort();

    const allMemberIds = members.map(member => member['Member ID']);

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
        const meal = mealsByDateAndMember[date]?.[memberId];
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
    const input = contentRef.current;
    html2canvas(input, { scrollY: -window.scrollY }).then((canvas) => {
      const imgData = canvas.toDataURL('image/png');
      const pdf = new jsPDF('p', 'mm', 'a4');
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      const canvasWidth = canvas.width;
      const canvasHeight = canvas.height;
      const ratio = canvasWidth / pdfWidth;
      const height = canvasHeight / ratio;
      let position = 0;

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
        pdf.addImage(imgData, 'PNG', 0, position, pdfWidth, height);
      }

      pdf.save('active-month-details.pdf');
    });
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
      breakfast: parseFloat(meal['Breakfast']),
      lunch: parseFloat(meal['Lunch']),
      dinner: parseFloat(meal['Dinner']),
      totalMeals: parseFloat(meal['Total Meals'])
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
                {allMemberIds.map(memberId => (
                  <React.Fragment key={memberId + '-meals'}>
                    <td className={memberId === memberIdFromUrl ? 'highlight' : ''}>{mealsByDateAndMember[date][memberId] ? mealsByDateAndMember[date][memberId].breakfast : 0}</td>
                    <td className={memberId === memberIdFromUrl ? 'highlight' : ''}>{mealsByDateAndMember[date][memberId] ? mealsByDateAndMember[date][memberId].lunch : 0}</td>
                    <td className={memberId === memberIdFromUrl ? 'highlight' : ''}>{mealsByDateAndMember[date][memberId] ? mealsByDateAndMember[date][memberId].dinner : 0}</td>
                  </React.Fragment>
                ))}
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
            </tr>
          </thead>
          <tbody>
            {currentMonthDeposits.map((deposit, index) => (
              <tr key={index} className={highlightDeposit && deposit['Member ID'] === memberIdFromUrl ? 'highlight-deposit' : ''}>
                <td>{formatDate(deposit['Date'])}</td>
                <td>{memberMap[deposit['Member ID']]}</td>
                <td>{deposit['Amount']}</td>
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
            </tr>
          </thead>
          <tbody>
            {currentMonthCosts.filter(cost => cost.Category === 'Meal').map((cost, index) => (
              <tr key={index}>
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{memberMap[cost['Paid By Member ID']]}</td>
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
            </tr>
          </thead>
          <tbody>
            {currentMonthCosts.filter(cost => cost.Category === 'Individual').map((cost, index) => (
              <tr key={index}>
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{memberMap[cost['Paid By Member ID']]}</td>
                <td>{cost['Category']}</td>
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
            </tr>
          </thead>
          <tbody>
            {currentMonthCosts.filter(cost => cost.Category === 'Shared - Meal Consumers' || cost.Category === 'Shared - All Members').map((cost, index) => (
              <tr key={index}>
                <td>{formatDate(cost['Date'])}</td>
                <td>{cost['Description']}</td>
                <td>{cost['Amount']}</td>
                <td>{memberMap[cost['Paid By Member ID']]}</td>
                <td>{cost['Category']}</td>
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
    </div>
  );
}

export default ActiveMonthDetails;