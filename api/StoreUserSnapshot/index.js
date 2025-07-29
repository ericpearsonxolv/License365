const { CosmosClient } = require("@azure/cosmos");

const endpoint = process.env.COSMOS_DB_ENDPOINT;
const key = process.env.COSMOS_DB_KEY;
const databaseId = process.env.COSMOS_DB_DATABASE;
const containerId = process.env.COSMOS_DB_CONTAINER;

module.exports = async function (context, req) {
  const users = req.body.users;
  if (!users || !Array.isArray(users)) {
    context.res = { status: 400, body: "Missing users array" };
    return;
  }

  const client = new CosmosClient({ endpoint, key });
  const container = client.database(databaseId).container(containerId);
  const timestamp = new Date().toISOString();

  let storedCount = 0;
  let errors = [];

  await Promise.all(users.map(async user => {
    const userId =
      user.id ||
      user.userId ||
      user.userPrincipalName ||
      user.mail;

    if (!userId) {
      errors.push({ error: "Missing userId", user });
      return;
    }

    let statusLastChanged = timestamp;
    let createdDateTime = user.createdDateTime || user.creationDateTime || null;
    let prevStatus = null;

    try {
      // Cosmos can have throughput penalties for many point queries; optimize if possible
      const query = {
        query: "SELECT TOP 1 * FROM c WHERE c.userId = @userId ORDER BY c.timestamp DESC",
        parameters: [{ name: "@userId", value: userId }]
      };
      const { resources: prevSnaps } = await container.items.query(query).fetchAll();
      if (prevSnaps.length > 0) {
        prevStatus = prevSnaps[0].status;
        if (!createdDateTime) createdDateTime = prevSnaps[0].createdDateTime || null;
        statusLastChanged = (prevStatus !== normalizeStatus(user))
          ? timestamp
          : prevSnaps[0].statusLastChanged || timestamp;
      }
    } catch (err) {
      context.log.warn(`Could not fetch previous snapshot for user ${userId}: ${err.message}`);
      errors.push({ userId, error: err.message });
    }

    try {
      await container.items.create({
        id: `${userId}-${timestamp}`,
        userId,
        timestamp,
        displayName: user.displayName || user.name || "",
        licenses: Array.isArray(user.licenses) ? user.licenses : [],
        status: normalizeStatus(user),
        createdDateTime,
        statusLastChanged,
        ...user // for any extra Graph fields
      });
      storedCount++;
    } catch (err) {
      context.log.error(`Failed to store snapshot for user ${userId}: ${err.message}`);
      errors.push({ userId, error: err.message });
    }
  }));

  context.res = {
    status: 200,
    body: {
      message: `Stored ${storedCount} user snapshots.`,
      timestamp,
      errors
    }
  };
};

// Normalize Microsoft status (Active/Inactive)
function normalizeStatus(user) {
  if (user.status) return user.status;
  if (user.accountEnabled === false) return "Inactive";
  return "Active";
}