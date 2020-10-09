#!/bin/bash

echo "****************************************************"
echo "odp:sm :: Copying yaml file "
echo "****************************************************"
if [ ! -d $WORKSPACE/../yamlFiles ]; then
    mkdir $WORKSPACE/../yamlFiles
fi

REL=$1
if [ $2 ]; then
    REL=$REL-$2
fi

rm -rf $WORKSPACE/../yamlFiles/sm.*
cp $WORKSPACE/sm.yaml $WORKSPACE/../yamlFiles/sm.$REL.yaml
cd $WORKSPACE/../yamlFiles/
echo "****************************************************"
echo "odp:sm :: Preparing yaml file "
echo "****************************************************"
sed -i.bak s/__release_tag__/"'$1'"/ sm.$REL.yaml
sed -i.bak s/__release__/$REL/ sm.$REL.yaml