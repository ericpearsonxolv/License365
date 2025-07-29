// src/mockUsers.js

import skuLookup from "./skuLookup";

// Expensive SKUs (make these more likely for Admin/Manager)
const expensiveSkuIds = [
  "06ebc4ee-1bb5-47dd-8120-11324bc54e06", // M365 E5
  "c7df2760-2c81-4ef7-b578-5b5392b571df", // O365 E5
  "b05e124f-c7cc-45a0-a6aa-8cf78c946968", // EMS E5
];

// All SKU IDs from your lookup (for random non-expensive assignment)
const skuIds = Object.keys(skuLookup);

const firstNames = [
  "Alice", "Bob", "Charlie", "Diana", "Edward", "Fiona", "George", "Hannah", "Ian", "Julia",
  "Kyle", "Lara", "Mike", "Nina", "Oscar", "Paula", "Quentin", "Rachel", "Sam", "Tina",
  "Uma", "Vince", "Wendy", "Xander", "Yara", "Zane"
];
const lastNames = [
  "Anderson", "Brown", "Clark", "Davis", "Evans", "Foster", "Green", "Hill", "Irwin", "Johnson",
  "King", "Lewis", "Martinez", "Nguyen", "Owens", "Parker", "Quinn", "Robinson", "Smith", "Turner",
  "Underwood", "Vasquez", "Wilson", "Xu", "Young", "Zimmerman"
];
const statuses = ["Active", "Inactive", "Offboarded"];
const tags = ["Admin", "User", "Manager", "Contractor"];

function randomFrom(array) {
  return array[Math.floor(Math.random() * array.length)];
}

// Generates a date string in ISO format, up to N days in the past
function randomPastDate(maxDaysAgo) {
  const now = new Date();
  const past = new Date(now.getTime() - Math.floor(Math.random() * maxDaysAgo) * 24 * 60 * 60 * 1000);
  return past.toISOString().split("T")[0];
}

function makeEmail(fname, lname, idx) {
  return `${fname.toLowerCase()}.${lname.toLowerCase()}${idx}@example.com`;
}

const mockUsers = Array.from({ length: 200 }).map((_, idx) => {
  const fname = randomFrom(firstNames);
  const lname = randomFrom(lastNames);
  const tag = randomFrom(tags);

  // Assign status with realistic distribution
  let status;
  if (idx < 120) status = "Active";           // 60% Active
  else if (idx < 170) status = "Inactive";    // 25% Inactive
  else status = "Offboarded";                 // 15% Offboarded

  // Assign more expensive licenses to Admin/Manager
  let skuId;
  if ((tag === "Admin" || tag === "Manager") && Math.random() < 0.5) {
    skuId = randomFrom(expensiveSkuIds);
  } else {
    skuId = randomFrom(skuIds);
  }

  // Date logic for trend and recent offboarding widgets
  let onboardedDate = randomPastDate(365); // up to 1 year ago
  let offboardedDate = null;
  if (status === "Offboarded") {
    offboardedDate = randomPastDate(180); // last 6 months
  }

  return {
    id: `${idx + 1}`,
    name: `${fname} ${lname}`,
    email: makeEmail(fname, lname, idx + 1),
    status,
    tag,
    skuId,
    onboardedDate,
    offboardedDate,
  };
});

export default mockUsers;