FROM node:alpine

LABEL version="1.0"
LABEL description="Code Editor."
LABEL maintainer=["mohitur669@gmail.com"]

# Install required system packages for compilation
RUN apk add --no-cache python3 py3-pip gcc g++ make

WORKDIR /app

COPY ["package.json", "package-lock.json*", "./"]

# Install all dependencies (including dev dependencies for build)
RUN npm install

COPY . .

# Build the React app
RUN npm run build

# Set environment variables with actual values
ENV REACT_APP_BACKEND_URL=http://72.145.9.233:5000
ENV SERVER_PORT=5000
ENV NODE_ENV=production

# Create temp directory for code compilation
RUN mkdir -p /app/temp

# Expose the necessary ports
EXPOSE 5000
EXPOSE 8000
EXPOSE 3000

# Run the application
CMD ["npm", "run", "start:docker"]