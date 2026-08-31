const requiredEnv = ["DATABASE_URL", "NEXTAUTH_SECRET"];

requiredEnv.forEach((key) => {
  if (!process.env[key]) {
    throw new Error(`Missing environment variable: ${key}`);
  }
});
