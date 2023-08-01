#!/bin/bash

set -e

TAG=`cat CURRENT_SM`


echo "****************************************************"
echo "datanimbus.io.sm :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/sm sm=$ECR_URL/datanimbus.io.sm:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "datanimbus.io.sm :: Image Deployed in K8S AS $ECR_URL/datanimbus.io.sm:$TAG"
echo "****************************************************"