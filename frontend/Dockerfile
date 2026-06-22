# frontend/Dockerfile

# Stage 1: Hybrid Build Stage (Node environment + Bun installer)
FROM node:22-slim AS build-stage
WORKDIR /app

# Install Bun inside the Node container securely
RUN apt-get update && apt-get install -y curl unzip \
    && curl -fsSL https://bun.sh/install | bash \
    && apt-get clean && rm -rf /var/lib/apt/lists/*

# Add Bun to the system PATH
ENV PATH="/root/.bun/bin:$PATH"

# Copy package files to leverage Docker layer caching
COPY package.json bun.lockb* ./

RUN bun add -d react-app-rewired

# 🚀 Use Bun to install dependencies at lightning speed
RUN bun install --frozen-lockfile

# Copy the rest of your frontend source code
COPY . .


# 🛠️ Run the build using Node 22 (Avoids Bun's worker_threads limitations)
ENV CI=false
RUN npm run build


# Stage 2: Serve with Nginx
FROM nginx:stable-alpine
COPY --from=build-stage /app/build /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80
