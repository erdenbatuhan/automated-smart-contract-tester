# Use an official Node.js runtime as the base image
FROM node:18

# Set the working directory in the container
WORKDIR /app

# Install the project dependencies
COPY package*.json ./
RUN npm ci --omit=dev

# Bundle the app source
COPY . .

# Expose the port
EXPOSE $PORT

# Start the app
CMD [ "npm", "run", "serve" ]
