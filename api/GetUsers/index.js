const { createClient } = require('redis');
const { CosmosClient } = require("@azure/cosmos");

// ---- ENVIRONMENT CONFIG ----
const tenantId = process.env.AZURE_TENANT_ID;
const redisUrl = process.env.REDIS_URL;
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const cosmosDbName = process.env.COSMOS_DB_DATABASE || "license365";
const cosmosContainer = process.env.COSMOS_DB_CONTAINER || "userSnapshots";
const cosmosSkuContainer = process.env.COSMOS_SKU_CONTAINER || "skus"; // NEW

// ---- HELPER: Set common headers ----
function responseHeaders() {
  return {
    "X-Content-Type-Options": "nosniff",
    "Content-Security-Policy": "frame-ancestors 'self'",
    "Access-Control-Allow-Origin": "https://license365.thefoc.io", // CHANGE if needed
    "Vary": "Origin",
    "Content-Type": "application/json; charset=utf-8",
    "Cache-Control": "no-cache"
  };
}

// ---- HELPERS ----
function parseRedisUrl(url) {
  if (!url) return null;
  if (url.startsWith("rediss://")) return url;
  const parts = url.split(',');
  const host = parts[0].replace(/^rediss:\/\//, '');
  let password = '';
  for (const part of parts) {
    if (part.startsWith('password=')) password = part.replace('password=', '');
  }
  return `rediss://:${password}@${host}`;
}

// Cosmos: Fetch latest user snapshots for all users (latest by timestamp)
async function fetchLatestUserSnapshotsFromCosmos(context) {
  try {
    const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
    const container = client.database(cosmosDbName).container(cosmosContainer);

    const query = {
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
      parameters: [{ name: "@tenantId", value: tenantId }]
    };
    let allSnapshots = [];
    const iterator = container.items.query(query, { maxItemCount: 1000 });
    while (true) {
      const { resources, hasMoreResults } = await iterator.fetchNext();
      if (resources && resources.length > 0) allSnapshots.push(...resources);
      if (!hasMoreResults) break;
    }

    // Find latest snapshot per userId
    const userMap = new Map();
    for (const snap of allSnapshots) {
      const prev = userMap.get(snap.userId);
      if (!prev || snap.timestamp > prev.timestamp) userMap.set(snap.userId, snap);
    }

    // Transform for dashboard
    return Array.from(userMap.values()).map(snap => {
      const g = snap.graphData || {};
      return {
        ...g,
        id: g.id,
        name: g.displayName || g.name || "",
        email: g.mail || g.userPrincipalName || "",
        jobTitle: g.jobTitle || "",
        department: g.department || "",
        companyName: g.companyName || "",
        officeLocation: g.officeLocation || "",
        status: g.accountEnabled === false ? "Inactive" : "Active",
        accountEnabled: g.accountEnabled,
        lastSignIn: g.signInSessionsValidFromDateTime || g.lastSignIn || g.signInActivity?.lastSignInDateTime,
        licenses: (g.assignedLicenses || []).map(l => l.skuId),
        assignedLicenses: g.assignedLicenses || [],
        assignedPlans: g.assignedPlans || [],
        domain: (g.mail || g.userPrincipalName || "").split("@")[1] || "",
        leaveOfAbsence: !!g.employeeLeaveDateTime,
        onLeave: !!g.employeeLeaveDateTime,
        // Fix: use correct extension application ID when reading custom costCenter attribute
        costCenter: g["extension_9f405f31004214f60b5a65e10cd9ef460_costCenter"] || "",
        ...g
      };
    });
  } catch (err) {
    context.log.error("CosmosDB User Query Error:", err);
    throw new Error("Failed to fetch user snapshots from CosmosDB");
  }
}

// Cosmos: Fetch SKUs (if you save them separately; otherwise return empty)
async function fetchSkusFromCosmos(context) {
  try {
    const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
    const container = client.database(cosmosDbName).container(cosmosSkuContainer);

    // All SKUs for this tenant
    const query = {
      query: "SELECT * FROM c WHERE c.tenantId = @tenantId",
      parameters: [{ name: "@tenantId", value: tenantId }]
    };
    const { resources } = await container.items.query(query).fetchAll();
    return resources && resources.length
      ? resources.map(sku => ({
          skuId: sku.skuId,
          skuPartNumber: sku.skuPartNumber,
          displayName: sku.displayName || sku.skuPartNumber,
          prepaidUnits: sku.prepaidUnits?.enabled || 0
        }))
      : [];
  } catch (err) {
    context.log.warn("CosmosDB SKU Query Error:", err);
    return []; // Not fatal, just return empty array
  }
}

// ---- MAIN EXPORT ----
module.exports = async function (context, req) {
  let redis = null;
  try {
    // --- REDIS ---
    const redisUrlParsed = parseRedisUrl(redisUrl);
    let allUsers = [];
    let tenantSkus = [];
    let gotFromCache = false;

    if (redisUrlParsed) {
      try {
        redis = createClient({
          url: redisUrlParsed,
          socket: { tls: true, rejectUnauthorized: false }
        });
        await redis.connect();
        const cacheKeyUsers = `users_all_${tenantId}`;
        const cacheKeySkus = `tenant_skus_${tenantId}`;
        const cachedUsers = await redis.get(cacheKeyUsers);
        const cachedSkus = await redis.get(cacheKeySkus);
        if (cachedUsers) {
          allUsers = JSON.parse(cachedUsers);
          gotFromCache = true;
        }
        if (cachedSkus) {
          tenantSkus = JSON.parse(cachedSkus);
        }
      } catch (redisErr) {
        context.log.warn("Redis unavailable, falling back to CosmosDB. Error:", redisErr);
      }
    }

    // --- COSMOSDB if not cached ---
    if (!allUsers.length) {
      allUsers = await fetchLatestUserSnapshotsFromCosmos(context);
      // Only cache if Redis is connected
      if (redis) {
        await redis.set(`users_all_${tenantId}`, JSON.stringify(allUsers), { EX: 900 }); // 15min
      }
    }

    // --- Get SKUs ---
    if (!tenantSkus.length) {
      tenantSkus = await fetchSkusFromCosmos(context);
      if (redis && tenantSkus.length) {
        await redis.set(`tenant_skus_${tenantId}`, JSON.stringify(tenantSkus), { EX: 900 });
      }
    }

    // --- Paging ---
    const page = parseInt(req.query.page, 10) || 1;
    const size = parseInt(req.query.size, 10) || 100;
    if (page < 1 || size < 1) {
      context.res = {
        status: 400,
        headers: responseHeaders(),
        body: { error: "Page and size must be >= 1" }
      };
      return;
    }
    const startIdx = (page - 1) * size;
    const pagedUsers = allUsers.slice(startIdx, startIdx + size);

    // --- Response ---
    context.res = {
      status: 200,
      headers: responseHeaders(),
      body: {
        users: pagedUsers,
        totalCount: allUsers.length,
        skus: tenantSkus
      }
    };
  } catch (err) {
    context.log.error('API error:', err);
    context.res = {
      status: 500,
      headers: responseHeaders(),
      body: { error: "API error: " + (err.message || "Unknown error") }
    };
  } finally {
    if (redis) try { await redis.disconnect(); } catch { }
  }
};