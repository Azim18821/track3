import { hashPassword } from "../server/auth";

async function generateHash(password: string) {
  try {
    const hashedPassword = await hashPassword(password);
    console.log("Original password:", password);
    console.log("Hashed password:", hashedPassword);
    return hashedPassword;
  } catch (error) {
    console.error("Error generating hash:", error);
    process.exit(1);
  }
}

// Get password from command line argument
const password = process.argv[2] || "test123";

generateHash(password).then(hash => {
  console.log("\nUse this SQL to update the user password:");
  console.log(`UPDATE users SET password = '${hash}' WHERE username = 'testuser';`);
  process.exit(0);
});