FROM node:18-alpine

WORKDIR /tmp/app

RUN apk update
RUN apk upgrade

RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

COPY package.json package.json

RUN npm install -g npm
# RUN npm install --production --no-audit
RUN npm i --production
RUN npm audit fix --production

RUN rm -rf /usr/local/lib/node_modules/npm/node_modules/node-gyp/test

COPY . .

ENV IMAGE_TAG=__image_tag__

EXPOSE 10003

#RUN adduser -D appuser
#RUN chown -R appuser /app
#USER appuser

RUN chmod -R 777 /tmp/app

CMD node app.js