#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Building SM using TAG :: $TAG"
echo "****************************************************"

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache -t data.stack.sm:$TAG .
else 
    docker build -t data.stack.sm:$TAG .
fi


echo "****************************************************"
echo "data.stack:sm :: SM Built using TAG :: $TAG"
echo "****************************************************"

echo "****************************************************"
echo "data.stack:sm :: Building Base using TAG :: $TAG"
echo "****************************************************"

cd $WORKSPACE/ds-base

sed -i.bak s#__image_tag__#$TAG# Dockerfile

if $cleanBuild ; then
    docker build --no-cache -t data.stack.base:$TAG .
else 
    docker build -t data.stack.base:$TAG .
fi


echo "****************************************************"
echo "data.stack:sm :: Base Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_SM