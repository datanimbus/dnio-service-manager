#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "datanimbus.io.sm :: Pushing Image to Docker Hub :: appveen/datanimbus.io.sm:$TAG"
echo "****************************************************"

docker tag datanimbus.io.sm:$TAG appveen/datanimbus.io.sm:$TAG
docker push appveen/datanimbus.io.sm:$TAG

echo "****************************************************"
echo "datanimbus.io.sm :: Image Pushed to Docker Hub AS appveen/datanimbus.io.sm:$TAG"
echo "****************************************************"

docker tag datanimbus.io.base:$TAG appveen/datanimbus.io.base:$TAG
docker push appveen/datanimbus.io.base:$TAG

echo "****************************************************"
echo "datanimbus.io.sm :: Image Pushed to Docker Hub AS appveen/datanimbus.io.base:$TAG"
echo "****************************************************"