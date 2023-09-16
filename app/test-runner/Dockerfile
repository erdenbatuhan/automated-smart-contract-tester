# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Install the project dependencies
COPY package*.json ./
ARG ENV
RUN NODE_ENV=$ENV npm install

# Bundle the app source
COPY . .

# Expose the port
ARG PORT
EXPOSE $PORT

# Start the app
CMD [ "npm", "run", "serve" ]
