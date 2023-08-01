#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "datanimbus.io.sm :: Cleaning Up Local Images :: $TAG"
echo "****************************************************"

docker rmi datanimbus.io.sm:$TAG -f
docker rmi datanimbus.io.base:$TAG -f