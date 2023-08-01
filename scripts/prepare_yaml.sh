#!/bin/bash

set -e

echo "****************************************************"
echo "datanimbus.io.sm :: Copying yaml file "
echo "****************************************************"
if [ ! -d yamlFiles ]; then
    mkdir yamlFiles
fi

TAG=`cat CURRENT_SM`

rm -rf yamlFiles/sm.*
cp sm.yaml yamlFiles/sm.$TAG.yaml
cd yamlFiles/
echo "****************************************************"
echo "datanimbus.io.sm :: Preparing yaml file "
echo "****************************************************"

sed -i.bak s/__release__/$TAG/ sm.$TAG.yaml

echo "****************************************************"
echo "datanimbus.io.sm :: yaml file saved"
echo "****************************************************"