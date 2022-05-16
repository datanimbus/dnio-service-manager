#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

TODAY_FOLDER=`date ++%Y_%m_%d`

docker save -o data.stack.sm_$TAG.tar data.stack.sm:$TAG
bzip2 data.stack.sm_$TAG.tar
aws s3 cp data.stack.sm_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/data.stack.sm_$TAG.tar.bz2
rm data.stack.sm_$TAG.tar.bz2

echo "****************************************************"
echo "data.stack:sm :: Image Saved to AWS S3 AS data.stack.sm_$TAG.tar.bz2"
echo "****************************************************"

docker save -o data.stack.base_$TAG.tar data.stack.base:$TAG
bzip2 data.stack.base_$TAG.tar
aws s3 cp data.stack.base_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/data.stack.base_$TAG.tar.bz2
rm data.stack.base_$TAG.tar.bz2

echo "****************************************************"
echo "data.stack:sm :: Image Saved to AWS S3 AS data.stack.base_$TAG.tar.bz2"
echo "****************************************************"