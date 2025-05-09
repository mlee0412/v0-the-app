export function registerServiceWorker() {
  if (typeof window !== "undefined" && "serviceWorker" in navigator && window.location.protocol === "https:") {
    window.addEventListener("load", () => {
      navigator.serviceWorker.register("/sw.js").then(
        (registration) => {
          console.log("Service Worker registration successful with scope: ", registration.scope)
        },
        (err) => {
          console.log("Service Worker registration failed: ", err)
        },
      )
    })
  }
}

// Function to check if the app can be installed
export function checkInstallability() {
  if (typeof window !== "undefined") {
    let deferredPrompt: any

    window.addEventListener("beforeinstallprompt", (e) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault()
      // Stash the event so it can be triggered later
      deferredPrompt = e

      // Update UI to notify the user they can add to home screen
      const installButton = document.getElementById("install-button")
      if (installButton) {
        installButton.style.display = "block"

        installButton.addEventListener("click", () => {
          // Show the install prompt
          deferredPrompt.prompt()

          // Wait for the user to respond to the prompt
          deferredPrompt.userChoice.then((choiceResult: any) => {
            if (choiceResult.outcome === "accepted") {
              console.log("User accepted the install prompt")
            } else {
              console.log("User dismissed the install prompt")
            }
            deferredPrompt = null

            // Hide the install button
            installButton.style.display = "none"
          })
        })
      }
    })

    // Listen for the appinstalled event
    window.addEventListener("appinstalled", (evt) => {
      console.log("Space Billiards was installed.")
      // Hide the install button
      const installButton = document.getElementById("install-button")
      if (installButton) {
        installButton.style.display = "none"
      }
    })
  }
}
