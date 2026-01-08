
import { createClient } from "@supabase/supabase-js";
import fs from "fs";
import path from "path";

// Manually parse .env file
const envPath = path.join(process.cwd(), ".env");
const envContent = fs.readFileSync(envPath, "utf-8");
const envVars = envContent.split("\n").reduce((acc, line) => {
  const [key, ...valueParts] = line.split("=");
  if (key && valueParts.length > 0) {
    let value = valueParts.join("=");
    // Remove quotes if present
    if (value.startsWith('"') && value.endsWith('"')) {
      value = value.slice(1, -1);
    }
    acc[key.trim()] = value.trim();
  }
  return acc;
}, {} as Record<string, string>);

const SUPABASE_URL = envVars.VITE_SUPABASE_URL;
const SERVICE_ROLE_KEY = envVars.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error("Missing VITE_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY");
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function assignAdminRole(email: string) {
  console.log(`Looking up user: ${email}`);

  // 1. Find the user ID
  const { data: { users }, error: listError } = await supabase.auth.admin.listUsers();

  if (listError) {
    console.error("Error listing users:", listError);
    return;
  }

  const user = users.find((u) => u.email === email);

  if (!user) {
    console.error("User not found!");
    return;
  }

  console.log(`Found user ID: ${user.id}`);

  // 2. Assign role
  const { error: insertError } = await supabase
    .from("user_roles")
    .insert({
      user_id: user.id,
      role: "admin",
    });

  if (insertError) {
    if (insertError.code === "23505") { // Unique violation
      console.log("User is already an admin!");
    } else {
      console.error("Error checking/assigning role:", insertError);
    }
  } else {
    console.log("✅ Successfully assigned 'admin' role!");
  }
}

assignAdminRole("admin@keystate.com");
