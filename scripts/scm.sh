#!/bin/bash

echo "****************************************************"
echo "data.stack:sm :: SM Checking out :: $branch"
echo "****************************************************"

git checkout $branch

echo "****************************************************"
echo "data.stack:sm :: SM Pulling Code :: $branch"
echo "****************************************************"

git pull origin $branch

LAST_PULL=`cat LAST_PULL_SM`


if [ $LAST_PULL ]; then
    echo "****************************************************"
    echo "data.stack:sm :: Changes Found :: $branch"
    echo "****************************************************"

    git log --pretty=oneline --since="$LAST_PULL"

else
    echo "****************************************************"
    echo "data.stack:sm :: Last Pull Not Available :: $branch"
    echo "data.stack:sm :: Showing Last 10 Changes :: $branch"
    echo "****************************************************"

    git log --pretty=oneline -10
fi

echo `date +%Y-%m-%dT%H:%M:%S%z` > LAST_PULL_SM

cDate=`date +%Y.%m.%d.%H.%M`

TAG=$RELEASE"_"$cDate
if [ $tag == 'dev' ]; then

    echo "****************************************************"
    echo "data.stack:sm :: Default Tag Found, Creating new TAG :: $TAG"
    echo "****************************************************"

    echo `$TAG` > CURRENT_SM

else
    echo "****************************************************"
    echo "data.stack:sm :: User's Tag Found :: $tag"
    echo "****************************************************"

    echo `$tag` > CURRENT_SM
fi