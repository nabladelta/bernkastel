FROM node:alpine as base

WORKDIR /b

COPY ./ ./

RUN rm -rf node_modules && npm install --frozen-lockfile

WORKDIR /b/packages/client

ENV REACT_APP_API_URL="/api"
RUN npm run build

WORKDIR /b/packages/core
RUN npm run build

WORKDIR /b/packages/node

CMD ["npm", "run", "start"]