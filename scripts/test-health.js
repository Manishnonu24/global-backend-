// test-endpoints.js
async function testHealth() {
  console.log("=== Testing /api/health ===");
  try {
    const res = await fetch("http://localhost:3001/api/health");
    console.log(`Status: ${res.status}`);
    const data = await res.json();
    console.log("Response:", JSON.stringify(data, null, 2));
  } catch (err) {
    console.error("Health check fetch failed:", err);
  }
}

testHealth();
