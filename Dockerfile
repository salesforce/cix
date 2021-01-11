FROM node:12.20.1-alpine
LABEL SCM_URL https://github.com/salesforce/cix
USER root

WORKDIR /usr/src/app

COPY docs docs
COPY scripts scripts
COPY node_modules node_modules
COPY package.json package.json
COPY src src

ENTRYPOINT ["node", "--no-warnings", "--experimental-modules", "/usr/src/app/src/index.js"]
