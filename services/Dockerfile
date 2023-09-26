# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Install the dependencies
COPY package*.json ./
ARG ENV
RUN NODE_ENV=$ENV npm install

# Bundle the app source
COPY . .

# Ensure secrets are not included (already ignored in .dockerignore, this is just an additional safeguard)
RUN rm -rf /app/secrets

# Expose the port
ARG PORT
EXPOSE $PORT

# Start the app
CMD [ "npm", "run", "start" ]
