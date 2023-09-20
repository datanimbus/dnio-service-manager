#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "datanimbus.io.sm :: Pushing Image to Docker Hub :: datanimbus/datanimbus.io.sm:$TAG"
echo "****************************************************"

docker tag datanimbus.io.sm:$TAG datanimbus/datanimbus.io.sm:$TAG
docker push datanimbus/datanimbus.io.sm:$TAG

echo "****************************************************"
echo "datanimbus.io.sm :: Image Pushed to Docker Hub AS datanimbus/datanimbus.io.sm:$TAG"
echo "****************************************************"

docker tag datanimbus.io.base:$TAG datanimbus/datanimbus.io.base:$TAG
docker push datanimbus/datanimbus.io.base:$TAG

echo "****************************************************"
echo "datanimbus.io.sm :: Image Pushed to Docker Hub AS datanimbus/datanimbus.io.base:$TAG"
echo "****************************************************"