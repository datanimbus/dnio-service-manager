#!/bin/bash

TAG=`cat $WORKSPACE/CURRENT_SM`

echo "****************************************************"
echo "data.stack:sm :: Building SM using TAG :: $TAG"
echo "****************************************************"


docker build -t data.stack.sm:$TAG .


echo "****************************************************"
echo "data.stack:sm :: SM Built using TAG :: $TAG"
echo "****************************************************"