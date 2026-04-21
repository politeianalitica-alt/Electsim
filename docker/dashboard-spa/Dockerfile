FROM node:20-alpine AS build

WORKDIR /app/dashboard/spa

COPY dashboard/spa/package*.json ./
RUN npm install

COPY dashboard/spa/ ./
RUN npm run build

FROM nginx:1.27-alpine

COPY docker/dashboard-spa/nginx.conf /etc/nginx/conf.d/default.conf
COPY --from=build /app/dashboard/spa/dist /usr/share/nginx/html

EXPOSE 80
