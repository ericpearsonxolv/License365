import { useState, useEffect } from "react";
import Papa from "papaparse";

// Must be in your public/ directory!
const CSV_PATH = "/MS365_SKU_list.csv";

export default function useLicenseLookup() {
  const [skuLookup, setSkuLookup] = useState({});

  useEffect(() => {
    fetch(CSV_PATH)
      .then((res) => res.text())
      .then((csv) => {
        Papa.parse(csv, {
          header: true,
          delimiter: ";",
          complete: (result) => {
            const lookup = {};
            result.data.forEach((row) => {
              if (!row.LicenseSKUID || !row.ProductName) return;
              lookup[row.LicenseSKUID.trim()] = row.ProductName.trim();
            });
            setSkuLookup(lookup);
          },
        });
      });
  }, []);

  return skuLookup;
}