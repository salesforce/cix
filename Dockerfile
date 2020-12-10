FROM docker
LABEL SCM_URL https://github.com/salesforce/cix

WORKDIR /usr/src/app

COPY docs docs
COPY scripts scripts
COPY node_modules node_modules
COPY package.json package.json
COPY src src

ADD https://nodejs.org/dist/v12.19.1/node-v12.19.1-linux-x64.tar.xz /usr/local/lib/
RUN tar -xf /usr/local/lib/node-v12.19.1-linux-x64.tar.xz -C /usr/local/lib/
RUN ln -s /usr/local/lib/node-v12.19.1-linux-x64/bin/node /usr/local/bin

ENTRYPOINT ["/usr/local/bin/node", "--no-warnings", "--experimental-modules", "/usr/src/app/src/index.js"]
