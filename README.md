This project is a full-stack web application called Deakin Task Board. It helps users manage tasks, work with teams, track progress, and see deadlines. It's built using Express and Node.js for the backend, and Firebase for authentication and data.

Key Features
Task Management: Create, edit, and track tasks. Organize tasks by progress and how important they are.

User Dashboard: Each user has their own dashboard to see their tasks and deadlines.

Team Collaboration: Share tasks with your team members.

Firebase Authentication: Secure login system, limited to @deakin.edu.au email addresses.

Secure File Upload: Upload and store files safely using Firebase Storage.

Real-time Sync: See updates instantly on different devices.

Deadline Reminders: Get reminders for upcoming deadlines.

Technology Stack

Backend: Express, Node.js

Database: Firebase (Authentication, Firestore, Storage)

Containerization: Docker

Deployment: Google Cloud Platform (Google Kubernetes Engine, Cloud Run)

Work Log (Just to record all the process during developing):

Weeks 5-6: I started by trying a microservices idea. I tested small parts for users, tasks, and teams separately. I used Docker to package these parts and put the images in Google Cloud Artifact Registry.

Weeks 7-8: I planned to put these microservices on Google Kubernetes Engine (GKE) using YAML files. But then I decided it would be simpler to combine the services into one app. This made managing the project easier for now.

Weeks 9-10: I focused on adding the main features using Firebase. I set up login so only Deakin emails work. I made file uploading secure with Firebase Storage. I also added real-time sync and reminders for deadlines. I put this single app on GKE and watched how it performed.

Week 11: I changed deployment from GKE to Google Cloud Run. This was to save money and make deployment simpler because Cloud Run handles scaling automatically.

Later, after getting feedback, I made more changes, especially about scaling on GKE. I put the app on GKE again.

Then I added Horizontal Pod Autoscaler (HPA) to make GKE scale the app by itself based on CPU use. I also fixed problems with cluster resources by adding more nodes in Google Cloud. Finally, I tested the auto-scaling with Postman to send many requests. The app automatically created more copies (Pods) to handle the load.

Deployment
This app is now deployed and can be accessed at both:
GKE: http://35.198.236.96/
Cloud Run: https://deakin-task-board-928342173867.asia-southeast1.run.app
