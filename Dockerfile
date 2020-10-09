FROM node:12-alpine 

RUN set -ex; apk add --no-cache --virtual .fetch-deps curl tar git ;

WORKDIR /app

COPY package.json /app

RUN npm install --production

COPY api /app/api
COPY app.js /app
COPY config /app/config
COPY util /app/util
RUN mkdir -p /app/generatedServices

ENV IMAGE_TAG=__image_tag__

EXPOSE 10003

#RUN adduser -D appuser
#RUN chown -R appuser /app
RUN chmod -R 777 /app/generatedServices
#USER appuser

CMD node app.js