#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Pushing Image to Docker Hub :: appveen/data.stack.sm:$TAG"
echo "****************************************************"

docker tag data.stack.sm:$TAG appveen/data.stack.sm:$TAG
docker push appveen/data.stack.sm:$TAG

echo "****************************************************"
echo "data.stack:sm :: Image Pushed to Docker Hub AS appveen/data.stack.sm:$TAG"
echo "****************************************************"

docker tag data.stack.base:$TAG appveen/data.stack.base:$TAG
docker push appveen/data.stack.base:$TAG

echo "****************************************************"
echo "data.stack:sm :: Image Pushed to Docker Hub AS appveen/data.stack.base:$TAG"
echo "****************************************************"