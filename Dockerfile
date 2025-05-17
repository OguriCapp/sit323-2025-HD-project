FROM node:14-alpine

# Create app directory
WORKDIR /usr/src/app

# Install app dependencies
# A wildcard is used to ensure both package.json AND package-lock.json are copied
COPY package*.json ./

RUN npm install

# Bundle app source
COPY . .

# Expose port
EXPOSE 8080

# Set environment variables
ENV PORT=8080
ENV NODE_ENV=production
ENV FIREBASE_API_KEY=AIzaSyBy4Z3PYziygEpMJp9TWlkO2Poq8hJkjF4
ENV FIREBASE_AUTH_DOMAIN=deakinataskboardby224385035.firebaseapp.com
ENV FIREBASE_PROJECT_ID=deakinataskboardby224385035
ENV FIREBASE_STORAGE_BUCKET=deakinataskboardby224385035.appspot.com
ENV FIREBASE_MESSAGING_SENDER_ID=928342173867
ENV FIREBASE_APP_ID=1:928342173867:web:2a685aa3254e0d3584efee

# Start the application
CMD [ "npm", "start" ] 