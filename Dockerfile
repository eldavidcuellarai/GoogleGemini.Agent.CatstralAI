# Use the official Node.js runtime as the base image
FROM node:18-alpine

# Set the working directory in the container
WORKDIR /app

# Copy package.json and package-lock.json (if available)
COPY package*.json ./

# Install dependencies
RUN npm install --only=production

# Copy the application code
COPY . .

# Expose the port the app runs on
EXPOSE 8080

# Set environment variable for port
ENV PORT=8080

# Command to run the application
CMD ["node", "server.js"]