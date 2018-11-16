#!/bin/sh

echo "Copy oracle client zip"
cp /opt/instantclient-basic-linux.x64-18.3.0.0.0dbru.zip /tmp || exit 1
cd /tmp
echo "unzip oracle client" || exit 1
unzip instantclient-basic-linux.x64-18.3.0.0.0dbru.zip || exit 1
echo "create dir for oracle libs"
mkdir -p /opt/oracle || exit 1
echo "copy files to lib"
mv instantclient_18_3 /opt/oracle || exit 1
echo "Create conf file for oracle"
sh -c "echo /opt/oracle/instantclient_18_3 > /etc/ld.so.conf.d/oracle-instantclient.conf" || exit 1
echo "ldconfig"
ldconfig || exit 1

echo "Add LD_LIBRARY_PATH variable"
export LD_LIBRARY_PATH=/opt/oracle:$LD_LIBRARY_PATH

echo "Now starting Grappa"
cd /usr/src/app || exit 1
npm run start:prod || exit 1
