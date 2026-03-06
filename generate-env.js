require("dotenv").config();
const fs = require("fs");
const path = require("path");

// Read environment variables
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_ANON_KEY;

if (!supabaseUrl) {
  throw new Error("SUPABASE_URL environment variable is not set!");
}
if (!supabaseKey) {
  throw new Error("SUPABASE_ANON_KEY environment variable is not set!");
}

const production = process.env.PRODUCTION === "true";

// Define the content for environment files
const envContent = `
export const environment = {
  production: ${production},
  supabaseUrl: '${supabaseUrl}',
  supabaseKey: '${supabaseKey}'
};
`;

// Write the environment files
const envPath = path.join(__dirname, "src/environments/environment.ts");
const envProdPath = path.join(
  __dirname,
  "src/environments/environment.prod.ts"
);

fs.writeFileSync(envPath, envContent);
fs.writeFileSync(envProdPath, envContent);

console.log("Environment files generated successfully.");