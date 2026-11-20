/**
 * Safely converts a value to a finite number, defaulting to 0.
 */
export function toNumber(value) {
  const num = parseFloat(value);
  return Number.isFinite(num) ? num : 0;
}

/**
 * Computes consistent mess-wide and per-member financial summaries.
 * Guarantees:
 * - Empty/non-numeric values never poison totals with NaN.
 * - Only members with totalMeals > 0 are counted as meal consumers for
 *   "Shared - Meal Consumers" costs.
 * - Sum of all member balances equals messBalance (assuming all records belong
 *   to current members).
 */
export function calculateMessSummary({
  membersData = [],
  mealsData = [],
  depositsData = [],
  costsData = [],
}) {
  const memberMealTotals = mealsData.reduce((acc, meal) => {
    const memberId = meal['Member ID'];
    const rowMeals =
      meal['Total Meals'] !== undefined && meal['Total Meals'] !== ''
        ? toNumber(meal['Total Meals'])
        : toNumber(meal['Breakfast']) + toNumber(meal['Lunch']) + toNumber(meal['Dinner']);
    acc[memberId] = (acc[memberId] || 0) + rowMeals;
    return acc;
  }, {});

  // Only members who actually consumed > 0 meals share "Shared - Meal Consumers" costs
  const mealConsumers = new Set(
    membersData
      .filter((member) => (memberMealTotals[member['Member ID']] || 0) > 0)
      .map((member) => member['Member ID'])
  );
  const numberOfMealConsumers = mealConsumers.size;

  const totalDeposit = depositsData.reduce((acc, dep) => acc + toNumber(dep['Amount']), 0);
  const totalMeal = Object.values(memberMealTotals).reduce((acc, val) => acc + val, 0);

  const mealCosts = costsData
    .filter((c) => c.Category === 'Meal')
    .reduce((acc, cost) => acc + toNumber(cost['Amount']), 0);
  const individualCosts = costsData
    .filter((c) => c.Category === 'Individual')
    .reduce((acc, cost) => acc + toNumber(cost['Amount']), 0);
  const sharedMealConsumerCostsTotal = costsData
    .filter((c) => c.Category === 'Shared - Meal Consumers')
    .reduce((acc, cost) => acc + toNumber(cost['Amount']), 0);
  const sharedAllMembersCostsTotal = costsData
    .filter((c) => c.Category === 'Shared - All Members')
    .reduce((acc, cost) => acc + toNumber(cost['Amount']), 0);

  const totalSharedOtherCost = sharedMealConsumerCostsTotal + sharedAllMembersCostsTotal;
  const totalAllCosts = mealCosts + individualCosts + totalSharedOtherCost;
  const messBalance = totalDeposit - totalAllCosts;
  const mealRate = totalMeal > 0 ? mealCosts / totalMeal : 0;

  const perMemberSharedAllMembersCost =
    membersData.length > 0 ? sharedAllMembersCostsTotal / membersData.length : 0;
  const perMemberSharedMealConsumerCost =
    numberOfMealConsumers > 0 ? sharedMealConsumerCostsTotal / numberOfMealConsumers : 0;

  const membersWithDetails = membersData.map((member) => {
    const memberId = member['Member ID'];
    const totalMeals = memberMealTotals[memberId] || 0;
    const mealCost = mealRate * totalMeals;

    const memberDeposit = depositsData
      .filter((dep) => dep['Member ID'] === memberId)
      .reduce((acc, dep) => acc + toNumber(dep['Amount']), 0);

    const individualCost = costsData
      .filter((cost) => cost.Category === 'Individual' && cost['Paid By Member ID'] === memberId)
      .reduce((acc, cost) => acc + toNumber(cost['Amount']), 0);

    let sharedCostForMember = perMemberSharedAllMembersCost;
    if (mealConsumers.has(memberId)) {
      sharedCostForMember += perMemberSharedMealConsumerCost;
    }

    const totalCost = mealCost + individualCost + sharedCostForMember;
    const balance = memberDeposit - totalCost;

    return {
      ...member,
      totalMeals,
      totalDeposit: memberDeposit,
      mealCost,
      individualCost,
      sharedCost: sharedCostForMember,
      totalCost,
      balance,
    };
  });

  return {
    totalDeposit,
    totalMeal,
    mealCosts,
    individualCosts,
    totalSharedOtherCost,
    totalAllCosts,
    messBalance,
    mealRate,
    membersWithDetails,
  };
}
