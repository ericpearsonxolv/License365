// scripts/getTenantSkus.js
const { ClientSecretCredential } = require('@azure/identity');
const { Client } = require('@microsoft/microsoft-graph-client');
const fs = require('fs');
const path = require('path');

const tenantId = process.env.AZURE_TENANT_ID;
const clientId = process.env.AZURE_CLIENT_ID;
const clientSecret = process.env.AZURE_CLIENT_SECRET;

if (!tenantId || !clientId || !clientSecret) {
  console.error("ERROR: Please set AZURE_TENANT_ID, AZURE_CLIENT_ID, and AZURE_CLIENT_SECRET env vars.");
  process.exit(1);
}

(async () => {
  try {
    // Authenticate and create Graph client
    const credential = new ClientSecretCredential(tenantId, clientId, clientSecret);
    const accessToken = (await credential.getToken("https://graph.microsoft.com/.default")).token;
    const client = Client.init({ authProvider: (done) => done(null, accessToken) });

    // Fetch all subscribed SKUs for your tenant
    const res = await client.api('/subscribedSkus').get();
    const lookup = {};

    for (const sku of res.value) {
      // Compose friendly name (combine product name and part number)
      // E.g. "Office 365 E3 (ENTERPRISEPACK)"
      const friendlyName = `${sku.skuPartNumber} (${sku.skuId})`;
      lookup[sku.skuId] = `${sku.skuPartNumber} (${sku.skuId})`;
    }

    // Write to src/skuLookup.js
    const outFile = path.join(__dirname, '../src/skuLookup.js');
    const output =
      "// Auto-generated from Microsoft Graph /subscribedSkus\n" +
      "const skuLookup = " + JSON.stringify(lookup, null, 2) + ";\n" +
      "export default skuLookup;\n";
    fs.writeFileSync(outFile, output, 'utf8');

    console.log(`\nSUCCESS: ${Object.keys(lookup).length} SKUs written to src/skuLookup.js\n`);
  } catch (err) {
    console.error("Error fetching SKUs from Microsoft Graph:", err.message);
    process.exit(1);
  }
})();