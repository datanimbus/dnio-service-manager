#!/bin/bash

set -e

TAG=`cat CURRENT_SM`


echo "****************************************************"
echo "datanimbus.io.sm :: Pushing Image to ECR :: $ECR_URL/datanimbus.io.sm:$TAG"
echo "****************************************************"

$(aws ecr get-login --no-include-email)
docker tag datanimbus.io.sm:$TAG $ECR_URL/datanimbus.io.sm:$TAG
docker push $ECR_URL/datanimbus.io.sm:$TAG

echo "****************************************************"
echo "datanimbus.io.sm :: Image pushed to ECR AS $ECR_URL/datanimbus.io.sm:$TAG"
echo "****************************************************"

docker tag datanimbus.io.base:$TAG $ECR_URL/datanimbus.io.base:$TAG
docker push $ECR_URL/datanimbus.io.base:$TAG


echo "****************************************************"
echo "datanimbus.io.sm :: Image pushed to ECR AS $ECR_URL/datanimbus.io.base:$TAG"
echo "****************************************************"