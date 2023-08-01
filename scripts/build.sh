#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "datanimbus.io.sm :: Building SM using TAG :: $TAG"
echo "****************************************************"

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache --pull -t datanimbus.io.sm:$TAG .
else 
    docker build -t datanimbus.io.sm:$TAG .
fi


echo "****************************************************"
echo "datanimbus.io.sm :: SM Built using TAG :: $TAG"
echo "****************************************************"

echo "****************************************************"
echo "datanimbus.io.sm :: Building Base using TAG :: $TAG"
echo "****************************************************"

cd $WORKSPACE/ds-base

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache --pull -t datanimbus.io.base:$TAG .
else 
    docker build -t datanimbus.io.base:$TAG .
fi


echo "****************************************************"
echo "datanimbus.io.sm :: Base Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_SM