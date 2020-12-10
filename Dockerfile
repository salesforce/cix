FROM centos/nodejs-12-centos7:latest
LABEL SCM_URL https://github.com/salesforce/cix

WORKDIR /usr/src/app

COPY docs docs
COPY scripts scripts
COPY node_modules node_modules
COPY package.json package.json
COPY src src

ENTRYPOINT ["/usr/local/bin/node", "--no-warnings", "--experimental-modules", "/usr/src/app/src/index.js"]
