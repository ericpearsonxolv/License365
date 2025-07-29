module.exports = async function (context, req) {
  context.res = {
    status: 200,
    headers: { "Content-Type": "application/json" },
    body: [
      { id: "1", name: "Test User", status: "Active", tag: "Admin", skuId: "06ebc4ee-1bb5-47dd-8120-11324bc54e06", onboardedDate: "2024-09-01", offboardedDate: null },
      { id: "2", name: "Jane Doe", status: "Offboarded", tag: "User", skuId: "b05e124f-c7cc-45a0-a6aa-8cf78c946968", onboardedDate: "2024-07-11", offboardedDate: "2025-06-01" }
    ]
  };
};