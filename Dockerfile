FROM node:8

# Set timezone to Europe/Helsinki
RUN echo "Europe/Helsinki" > /etc/timezone
RUN dpkg-reconfigure -f noninteractive tzdata

# Setup
RUN mkdir -p /usr/src/app
COPY . /usr/src/app
WORKDIR /usr/src/app

# Update & install pdftk, libaio1, unzip
RUN apt-get update && apt-get install -y pdftk libaio1 libaio-dev unzip

RUN npm i;
RUN chmod 755 entrypoint.sh

EXPOSE 3100

ENTRYPOINT ["./entrypoint.sh"]
