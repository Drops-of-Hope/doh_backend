# Use official Node.js image
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files and install dependencies
COPY package*.json ./
RUN npm install

# Copy rest of the code
COPY . .

# Build if needed (for TypeScript)
RUN npm run build

# Expose port (your backend port, e.g., 3001)
EXPOSE 3001

# Start the server
CMD ["npm", "start"]
