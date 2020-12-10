FROM centos/nodejs-12-centos7

LABEL SCM_URL https://github.com/salesforce/cix
USER root

WORKDIR /usr/src/app

COPY docs docs
COPY scripts scripts
COPY node_modules node_modules
COPY package.json package.json
COPY src src
RUN yum-config-manager \
    --add-repo \
    https://download.docker.com/linux/centos/docker-ce.repo && \
    yum -y install docker-ce docker-ce-cli containerd.io && \
    yum clean all && rm -rf /var/cache/yum

ENTRYPOINT ["node", "--no-warnings", "--experimental-modules", "/usr/src/app/src/index.js"]
