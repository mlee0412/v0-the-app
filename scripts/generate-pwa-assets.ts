// This is a script that would be run to generate PWA assets
// You would need to install the pwa-asset-generator package:
// npm install --save-dev pwa-asset-generator

/*
To run this script:
1. Install the package: npm install --save-dev pwa-asset-generator
2. Run: npx ts-node scripts/generate-pwa-assets.ts

This will generate all the necessary icons and splash screens for your PWA.
*/

import { exec } from "child_process"
import path from "path"

const sourceIcon = path.join(__dirname, "../public/images/space-billiard-logo.png")
const outputFolder = path.join(__dirname, "../public")

// Generate PWA assets
const command = `npx pwa-asset-generator ${sourceIcon} ${outputFolder} --background "#000033" --padding "10%" --icon-only --favicon --opaque false --maskable true --type png --index ./public/index.html`

console.log("Generating PWA assets...")
exec(command, (error, stdout, stderr) => {
  if (error) {
    console.error(`Error: ${error.message}`)
    return
  }
  if (stderr) {
    console.error(`Stderr: ${stderr}`)
    return
  }
  console.log(`Assets generated successfully: ${stdout}`)
})
