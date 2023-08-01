#!/bin/bash

set -e

TAG=`cat CURRENT_SM`

echo "****************************************************"
echo "datanimbus.io.sm :: Saving Image to AWS S3 :: $S3_BUCKET/stable-builds"
echo "****************************************************"

TODAY_FOLDER=`date ++%Y_%m_%d`

docker save -o datanimbus.io.sm_$TAG.tar datanimbus.io.sm:$TAG
bzip2 datanimbus.io.sm_$TAG.tar
aws s3 cp datanimbus.io.sm_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/datanimbus.io.sm_$TAG.tar.bz2
rm datanimbus.io.sm_$TAG.tar.bz2

echo "****************************************************"
echo "datanimbus.io.sm :: Image Saved to AWS S3 AS datanimbus.io.sm_$TAG.tar.bz2"
echo "****************************************************"

docker save -o datanimbus.io.base_$TAG.tar datanimbus.io.base:$TAG
bzip2 datanimbus.io.base_$TAG.tar
aws s3 cp datanimbus.io.base_$TAG.tar.bz2 s3://$S3_BUCKET/stable-builds/$TODAY_FOLDER/datanimbus.io.base_$TAG.tar.bz2
rm datanimbus.io.base_$TAG.tar.bz2

echo "****************************************************"
echo "datanimbus.io.sm :: Image Saved to AWS S3 AS datanimbus.io.base_$TAG.tar.bz2"
echo "****************************************************"