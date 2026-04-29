FROM node:alpine
LABEL maintainer="nichi.hc@proton.me"
EXPOSE 5173

WORKDIR /app

COPY ./package*.json /app
RUN npm install

COPY . .

CMD ["npm", "run", "dev"]
