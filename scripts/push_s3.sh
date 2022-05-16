#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

docker save -o data.stack.sm_$TAG.tar data.stack.sm:$TAG
bzip2 data.stack.sm_$TAG.tar
aws s3 cp data.stack.sm_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/data.stack.sm_$TAG.tar.bz2
rm data.stack.sm_$TAG.tar.bz2

echo "****************************************************"
echo "data.stack:sm :: Image Saved to AWS S3 AS data.stack.sm_$TAG.tar.bz2"
echo "****************************************************"