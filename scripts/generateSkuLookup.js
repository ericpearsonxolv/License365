const fs = require("fs");
const path = require("path");

// Read the CSV file (now only two columns)
const csv = fs.readFileSync(path.join(__dirname, "../src/assets/MS365_SKU_list.csv"), "utf-8");
const lines = csv.split(/\r?\n/).filter(Boolean);

// Assume header: ProductName;LicenseSKUID
const lookup = {};

for (let i = 1; i < lines.length; i++) {
  const [product, skuId] = lines[i].split(";");
  if (skuId && product) {
    lookup[skuId.trim()] = product.trim();
  }
}

// Write out JS file
const outFile = path.join(__dirname, "../src/assets/skuLookup.js");
const output =
  "// AUTO-GENERATED FROM MS365_SKU_list.csv. DO NOT EDIT MANUALLY.\n" +
  "export const skuLookup = " +
  JSON.stringify(lookup, null, 2) +
  ";\nexport default skuLookup;\n";

fs.writeFileSync(outFile, output, "utf-8");
console.log(`Generated ${outFile} (${Object.keys(lookup).length} entries)`);