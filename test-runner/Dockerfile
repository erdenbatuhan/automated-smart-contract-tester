# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory
WORKDIR /app

# Install the dependencies
COPY package*.json ./
ARG ENV
RUN if [ "$ENV" = "dev" ]; then NODE_ENV=$ENV npm i; else NODE_ENV=$ENV npm ci; fi

# Bundle the app source
COPY . .

# Expose the port
ARG PORT
EXPOSE $PORT

# Start the app
CMD [ "npm", "run", "start" ]
