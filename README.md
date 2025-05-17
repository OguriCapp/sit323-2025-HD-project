This project is a full-stack web application called Deakin Task Board, developed using Express, Node.js and Firebase. 
It was built as an HD-level unit task. This project supports task creation, editing, status tracking, and team collaboration. 

Meanwhile, Firebase is used for both authentication and data storage, also allowing real-time sync and user access control. 
Each user could manage their own dashboard, view deadlines, and also organize tasks by progress and priority. 
Additionally, this platform also supports team task sharing, making it useful for both individual and group.

The whole app was containerized using Docker to simplify deployment. 
I first deployed it to Google Cloud Run for a setup, and later tested deployment on Google Kubernetes Engine using Kubernetes manifests. 
After testing if everything worked, I deleted the GKE cluster to reduce costs.
