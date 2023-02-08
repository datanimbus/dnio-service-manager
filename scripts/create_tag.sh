#!/bin/bash

set -e

cDate=`date +%Y.%m.%d.%H.%M`



TAG=$RELEASE"_"$cDate
if [ $tag = 'dev' ] || [ $tag = 'main' ] || [ $tag = 'vNext' ]; then

    echo "****************************************************"
    echo "data.stack:sm :: Default Tag Found, Creating new TAG :: $TAG"
    echo "****************************************************"

    echo $TAG > CURRENT_SM

else
    echo "****************************************************"
    echo "data.stack:sm :: User's Tag Found :: $tag"
    echo "****************************************************"

    echo $tag > CURRENT_SM
fi