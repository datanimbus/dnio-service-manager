#!/bin/bash

TAG=`cat $WORKSPACE/CURRENT_SM`


echo "****************************************************"
echo "data.stack:sm :: Deploying Image in K8S :: $NAMESPACE"
echo "****************************************************"

kubectl set image deployment/sm sm=$ECR_URL/data.stack.sm:$TAG -n $NAMESPACE --record=true


echo "****************************************************"
echo "data.stack:sm :: Image Deployed in K8S AS $ECR_URL/data.stack.sm:$TAG"
echo "****************************************************"