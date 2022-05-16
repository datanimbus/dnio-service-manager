#!/bin/bash

set -e


echo "****************************************************"
echo "data.stack:sm :: SM Clearing Untracked Files"
echo "****************************************************"

git stash
git stash clear

echo "****************************************************"
echo "data.stack:sm :: SM Checking out :: $branch"
echo "****************************************************"

git checkout $branch

echo "****************************************************"
echo "data.stack:sm :: SM Pulling Code :: $branch"
echo "****************************************************"

git pull origin $branch

if [ -f LAST_PULL_SM ]; then
    LAST_PULL=`cat LAST_PULL_SM`
fi



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