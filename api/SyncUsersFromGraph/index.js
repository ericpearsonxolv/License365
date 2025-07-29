const { Client } = require('@microsoft/microsoft-graph-client');
const { ClientSecretCredential } = require('@azure/identity');
const { CosmosClient } = require("@azure/cosmos");

// App settings (from environment variables)
const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;
const cosmosEndpoint = process.env.COSMOS_DB_ENDPOINT;
const cosmosKey = process.env.COSMOS_DB_KEY;
const cosmosDbName = process.env.COSMOS_DB_DATABASE || "license365";
const cosmosContainer = process.env.COSMOS_DB_CONTAINER || "userSnapshots";
const extensionAppId = "9f405f31004214f60b5a65e10cd9ef460"; // Your App ID

// Timer schedule - every 15 minutes (CRON format)
module.exports.timer = {
  schedule: "0 */15 * * * *" // every 15 minutes
};

// Helper: fetch users from Microsoft Graph
async function fetchAllUsers(client) {
  let users = [];
  let url = `/users?$select=id,displayName,mail,userPrincipalName,accountEnabled,createdDateTime,assignedLicenses,signInActivity,department,employeeId,onLeave,customSecurityAttributes,extension_${extensionAppId}_onLeave`;
  let retryCount = 0;
  while (url) {
    try {
      let req = client.api(url);
      if (url.startsWith('/users?')) req = req.top(100);
      req = req.version('beta');
      const res = await req.get();
      users.push(...res.value);
      url = res['@odata.nextLink'] ? res['@odata.nextLink'].replace('https://graph.microsoft.com/beta', '') : null;
      retryCount = 0;
    } catch (e) {
      if (e.statusCode === 429 && retryCount < 5) {
        const delay = e.response?.headers?.['retry-after'] ? parseInt(e.response.headers['retry-after'], 10) * 1000 : 5000;
        await new Promise(resolve => setTimeout(resolve, delay));
        retryCount++;
        continue;
      } else {
        throw e;
      }
    }
  }
  return users;
}

// Helper: Store in Cosmos DB
async function storeUsersInCosmosDB(users, timestamp, tenantId) {
  if (!cosmosEndpoint || !cosmosKey) throw new Error('CosmosDB config missing');
  const client = new CosmosClient({ endpoint: cosmosEndpoint, key: cosmosKey });
  const container = client.database(cosmosDbName).container(cosmosContainer);
  const createOps = users.map(user =>
    container.items.create({
      id: `${user.id}-${timestamp}`,
      userId: user.id,
      timestamp,
      tenantId,
      graphData: user
    })
  );
  await Promise.all(createOps);
}

// Main function
module.exports = async function (context, myTimer) {
  context.log('SyncUsersFromGraph function started');

  try {
    // Auth
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const accessToken = (await credential.getToken("https://graph.microsoft.com/.default")).token;
    const graphClient = Client.init({
      authProvider: (done) => done(null, accessToken)
    });

    // Fetch users
    context.log('Fetching users from Microsoft Graph...');
    const users = await fetchAllUsers(graphClient);
    context.log(`Fetched ${users.length} users.`);

    // Store users in Cosmos DB
    const timestamp = new Date().toISOString();
    await storeUsersInCosmosDB(users, timestamp, tenantId);
    context.log(`Stored ${users.length} users in Cosmos DB at ${timestamp}`);

  } catch (err) {
    context.log.error('SyncUsersFromGraph error:', err);
    throw err;
  }
  context.log('SyncUsersFromGraph function completed');
};