# Use the official Node.js image as the base
FROM node:22-alpine

# Set the working directory
WORKDIR /app

# Used by the guarded CI/CD migration recovery to create a verified logical
# backup before Prisma marks a known failed migration as rolled back.
RUN apk add --no-cache mariadb-client

# Install dependencies
COPY package*.json ./
COPY prisma ./prisma
RUN mkdir -p src/generated && npm install

# Copy the Next.js app files
COPY . .

ENV NODE_OPTIONS="--max-old-space-size=4096"

# Build the Next.js app
RUN DATABASE_URL="mysql://root:face%40by87Gym0766@mysql-database:3306/ahealthplace" npm run build

# Expose the port the app will run on
EXPOSE 3000

# Start the app
CMD ["npm", "start"]
