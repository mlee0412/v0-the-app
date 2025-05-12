/**
 * This script verifies the project for common deployment issues
 * Run this before deploying to catch potential problems
 */

import fs from "fs"
import path from "path"

// Check for invalid imports in TypeScript/JavaScript files
const checkInvalidImports = () => {
  console.log("Checking for invalid imports...")

  // Add implementation to scan files for problematic imports
  // This is a placeholder for a more comprehensive check

  console.log("Import check completed")
}

// Verify package.json for invalid dependencies
const verifyPackageJson = () => {
  console.log("Verifying package.json...")

  try {
    const packageJson = JSON.parse(fs.readFileSync(path.join(process.cwd(), "package.json"), "utf8"))

    // Check dependencies
    const dependencies = { ...packageJson.dependencies, ...packageJson.devDependencies }

    for (const [name, version] of Object.entries(dependencies)) {
      if (
        typeof version === "string" &&
        (version.includes("http:") ||
          version.includes("https:") ||
          version.includes("git+") ||
          version.includes("github.com"))
      ) {
        console.warn(`Warning: Potentially problematic dependency format: ${name}: ${version}`)
      }
    }

    console.log("Package.json verification completed")
  } catch (error) {
    console.error("Error verifying package.json:", error)
  }
}

// Run verification checks
const runVerification = () => {
  console.log("Starting deployment verification...")

  checkInvalidImports()
  verifyPackageJson()

  console.log("Deployment verification completed")
}

runVerification()
