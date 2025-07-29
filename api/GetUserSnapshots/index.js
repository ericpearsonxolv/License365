const { CosmosClient } = require("@azure/cosmos");

const tenantId = process.env.AZURE_TENANT_ID;
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const cosmosDbName = process.env.COSMOS_DB_DATABASE || "license365";
const cosmosContainer = process.env.COSMOS_DB_CONTAINER || "userSnapshots";

function responseHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "frame-ancestors 'self'",
    "Access-Control-Allow-Origin": "https://license365.thefoc.io",
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  };
}

function getDailyLatestSnapshots(allSnapshots) {
  const latest = {};
  allSnapshots.forEach(snap => {
    const day = (snap.timestamp || "").slice(0, 10); // "YYYY-MM-DD"
    const userId =
      snap.graphData?.id ||
      snap.userId ||
      snap.id ||
      snap.userPrincipalName ||
      snap.mail;
    if (!userId || !day) return;
    const key = `${day}|${userId}`;
    if (!latest[key] || snap.timestamp > latest[key].timestamp) {
      latest[key] = snap;
    }
  });
  return Object.values(latest);
}

// Normalize snapshot for easier processing
function normalizeSnapshot(snap) {
  const g = snap.graphData || {};
  const status =
    g.accountEnabled === false ||
    snap.status === "Inactive" ||
    g.status === "Inactive"
      ? "Inactive"
      : "Active";
  const licenses = Array.isArray(g.assignedLicenses)
    ? g.assignedLicenses.map(l => l.skuId)
    : Array.isArray(snap.licenses)
    ? snap.licenses
    : [];
  return {
    timestamp: snap.timestamp,
    id: g.id || snap.userId || snap.id || snap.userPrincipalName || snap.mail,
    status,
    licenses,
    createdDateTime: g.createdDateTime || snap.createdDateTime || "",
    statusLastChanged: snap.statusLastChanged || g.statusLastChanged || "",
    // ...add more fields as needed
  };
}

// Compute daily trends
function computeTrends(dailySnapshots) {
  // Group by day
  const byDay = {};
  dailySnapshots.forEach(snap => {
    const day = (snap.timestamp || "").slice(0, 10);
    if (!day) return;
    if (!byDay[day]) byDay[day] = [];
    byDay[day].push(snap);
  });
  const sortedDays = Object.keys(byDay).sort();

  // Trends array: for each day, count new users, offboarded, total licenses
  const trends = sortedDays.map(day => {
    const snaps = byDay[day];
    const newUsers = snaps.filter(
      s => (s.createdDateTime || "").slice(0, 10) === day
    ).length;
    const offboardedUsers = snaps.filter(
      s =>
        (s.status === "Inactive") &&
        (s.statusLastChanged && s.statusLastChanged.slice(0, 10) === day)
    ).length;
    // Only count licenses for active users
    const totalLicenses = snaps
      .filter(s => s.status === "Active")
      .reduce((sum, s) => sum + (Array.isArray(s.licenses) ? s.licenses.length : 0), 0);
    return {
      date: day,
      newUsers,
      offboardedUsers,
      totalLicenses,
    };
  });

  return trends;
}

module.exports = async function (context, req) {
  try {
    const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
    const container = client.database(cosmosDbName).container(cosmosContainer);

    const oneYearAgo = new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString();

    const query = {
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId AND c.timestamp >= @since",
      parameters: [
        { name: "@tenantId", value: tenantId },
        { name: "@since", value: oneYearAgo }
      ]
    };

    const { resources } = await container.items.query(query).fetchAll();

    // Get only the latest snapshot per user per day
    const dailyLatestSnapshots = getDailyLatestSnapshots(resources);

    // Normalize all fields
    const snapshots = dailyLatestSnapshots.map(normalizeSnapshot);

    // Add trends calculation
    const trends = computeTrends(snapshots);

    context.log.info(
      `UserSnapshots: returned ${snapshots.length} daily snapshots for ${[...new Set(snapshots.map(s => s.id))].length} unique users.`
    );

    context.res = {
      status: 200,
      headers: responseHeaders(),
      body: { snapshots, trends }
    };
  } catch (err) {
    context.log.error("GetUserSnapshots API error:", err);
    context.res = {
      status: 500,
      headers: responseHeaders(),
      body: { error: "API error: " + (err.message || "Unknown error") }
    };
  }
};