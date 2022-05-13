#!/bin/sh

echo $branch
echo $tag
echo $dockerHub
echo $ecr
echo $gcr
echo $deploy


tag=tag"_"`date +%Y.%m.%d.%H.%M`

echo $tag

# echo $NAMESPACE
# echo $LOCAL_REGISTRY
# echo $WORKSPACE
# echo $ECR_URL
# echo $GCR_URL