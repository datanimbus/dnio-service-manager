#!/bin/bash

set -e

TAG=`cat CURRENT_SM`


echo "****************************************************"
echo "data.stack:sm :: Pushing Image to ECR :: $ECR_URL/data.stack.sm:$TAG"
echo "****************************************************"

aws ecr get-login --no-include-email
docker tag data.stack.sm:$TAG $ECR_URL/data.stack.sm:$TAG
docker push $ECR_URL/data.stack.sm:$TAG


echo "****************************************************"
echo "data.stack:sm :: Image pushed to ECR AS $ECR_URL/data.stack.sm:$TAG"
echo "****************************************************"