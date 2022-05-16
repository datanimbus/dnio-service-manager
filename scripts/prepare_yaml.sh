#!/bin/bash

echo "****************************************************"
echo "data.stack:sm :: Copying yaml file "
echo "****************************************************"
if [ ! -d $WORKSPACE/yamlFiles ]; then
    mkdir $WORKSPACE/yamlFiles
fi

TAG=`cat $WORKSPACE/CURRENT_SM`

rm -rf $WORKSPACE/yamlFiles/sm.*
cp $WORKSPACE/sm.yaml $WORKSPACE/yamlFiles/sm.$TAG.yaml
cd $WORKSPACE/yamlFiles/
echo "****************************************************"
echo "data.stack:sm :: Preparing yaml file "
echo "****************************************************"

sed -i.bak s/__release__/$TAG/ sm.$TAG.yaml

echo "****************************************************"
echo "data.stack:sm :: yaml file saved"
echo "****************************************************"