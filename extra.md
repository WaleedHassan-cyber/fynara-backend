{
  "version": 2,
  "builds": [
    {
      "src": "app.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/app.js"
    }
  ],  
  "crons": [
    {
      "path": "/api/cron-job",
      "schedule": "0 1 * * *"
    }
  ]
}




  // Runs every 05 minutes
 