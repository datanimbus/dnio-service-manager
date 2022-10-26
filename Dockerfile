FROM node:fermium-alpine

WORKDIR /app

RUN apk update
RUN apk upgrade

RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

COPY package.json /app

RUN npm install -g npm
RUN npm install --production
RUN npm audit fix
RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY api /app/api

COPY app.js /app

COPY config /app/config

COPY util /app/util

ENV IMAGE_TAG=__image_tag__

EXPOSE 10003

#RUN adduser -D appuser
#RUN chown -R appuser /app
#USER appuser

CMD node app.js