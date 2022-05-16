#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Building SM using TAG :: $TAG"
echo "****************************************************"


docker build -t data.stack.sm:$TAG .


echo "****************************************************"
echo "data.stack:sm :: SM Built using TAG :: $TAG"
echo "****************************************************"

echo "****************************************************"
echo "data.stack:sm :: Building Base using TAG :: $TAG"
echo "****************************************************"

cd $WORKSPACE/ds-base

docker build -t data.stack.base:$TAG .


echo "****************************************************"
echo "data.stack:sm :: Base Built using TAG :: $TAG"
echo "****************************************************"


echo $TAG > LATEST_SM