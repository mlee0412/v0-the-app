import webPush from "web-push"

// Generate VAPID keys
const vapidKeys = webPush.generateVAPIDKeys()

console.log("Add these to your .env.local file:")
console.log(`NEXT_PUBLIC_VAPID_PUBLIC_KEY=${vapidKeys.publicKey}`)
console.log(`VAPID_PRIVATE_KEY=${vapidKeys.privateKey}`)
console.log(`VAPID_SUBJECT=mailto:admin@billiardsapp.com`)
