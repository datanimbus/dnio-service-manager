#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"

docker rmi data.stack.sm:$TAG -f
docker rmi data.stack.base:$TAG -f