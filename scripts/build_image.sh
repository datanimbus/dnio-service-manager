#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "data.stack:sm :: Toggle mode is on, terminating build"
    echo "data.stack:sm :: BUILD CANCLED"
    echo "****************************************************"
    exit 0
fi

cDate=`date +%Y.%m.%d.%H.%M` #Current date and time

if [ -f $WORKSPACE/../CICD ]; then
    CICD=`cat $WORKSPACE/../CICD`
fi
if [ -f $WORKSPACE/../DATA_STACK_RELEASE ]; then
    REL=`cat $WORKSPACE/../DATA_STACK_RELEASE`
fi
if [ -f $WORKSPACE/../DOCKER_REGISTRY ]; then
    DOCKER_REG=`cat $WORKSPACE/../DOCKER_REGISTRY`
fi
BRANCH='dev'
if [ -f $WORKSPACE/../BRANCH ]; then
    BRANCH=`cat $WORKSPACE/../BRANCH`
fi
if [ $1 ]; then
    REL=$1
fi
if [ ! $REL ]; then
    echo "****************************************************"
    echo "data.stack:sm :: Please Create file DATA_STACK_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "data.stack:sm :: BUILD FAILED"
    echo "****************************************************"
    exit 0
fi
TAG=$REL
if [ $2 ]; then
    TAG=$TAG"-"$2
fi
if [ $3 ]; then
    BRANCH=$3
fi
if [ $CICD ]; then
    echo "****************************************************"
    echo "data.stack:sm :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../DATA_STACK_NAMESPACE ]; then
        echo "****************************************************"
        echo "data.stack:sm :: Please Create file DATA_STACK_NAMESPACE with the namespace at $WORKSPACE"
        echo "data.stack:sm :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    DATA_STACK_NS=`cat $WORKSPACE/../DATA_STACK_NAMESPACE`
fi

sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2

echo "****************************************************"
echo "data.stack:sm :: Using build :: "$TAG
echo "****************************************************"

cd $WORKSPACE

echo "****************************************************"
echo "data.stack:sm :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_SM ]; then
    echo "****************************************************"
    echo "data.stack:sm :: Doing a clean build"
    echo "****************************************************"
    
    docker build --no-cache -t data.stack:sm.$TAG .
    rm $WORKSPACE/../CLEAN_BUILD_SM

    echo "****************************************************"
    echo "data.stack:sm :: Building base image"
    echo "****************************************************"
    cd $WORKSPACE/../ds-base
    
    docker build --no-cache -t data.stack:base.$TAG .
    cd $WORKSPACE

    echo "****************************************************"
    echo "data.stack:sm :: Copying deployment files"
    echo "****************************************************"

    if [ $CICD ]; then
        sed -i.bak s#__docker_registry_server__#$DOCKER_REG# sm.yaml
        sed -i.bak s/__release_tag__/"'$REL'"/ sm.yaml
        sed -i.bak s#__release__#$TAG# sm.yaml
        sed -i.bak s#__namespace__#$DATA_STACK_NS# sm.yaml
        sed -i.bak '/imagePullSecrets/d' sm.yaml
        sed -i.bak '/- name: regsecret/d' sm.yaml

        kubectl delete deploy sm -n $DATA_STACK_NS || true # deleting old deployement
        kubectl delete service sm -n $DATA_STACK_NS || true # deleting old service
        #creating new deployment
        kubectl create -f sm.yaml
    fi

else
    echo "****************************************************"
    echo "data.stack:sm :: Doing a normal build"
    echo "****************************************************"

    docker build -t data.stack:sm.$TAG .

    echo "****************************************************"
    echo "data.stack:sm :: Building base image"
    echo "****************************************************"
    
    cd $WORKSPACE/../ds-base

    docker build -t data.stack:base.$TAG -f Dockerfile_base .
    cd $WORKSPACE

    if [ $CICD ]; then
        kubectl set image deployment/sm sm=data.stack:sm.$TAG -n $DATA_STACK_NS --record=true
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "data.stack:sm :: Docker Registry found, pushing image"
    echo "****************************************************"

    echo "docker tag data.stack:sm.$TAG $DOCKER_REG/data.stack:sm.$TAG"
    docker tag data.stack:sm.$TAG $DOCKER_REG/data.stack:sm.$TAG
    echo "docker push $DOCKER_REG/data.stack:sm.$TAG"
    docker push $DOCKER_REG/data.stack:sm.$TAG

    echo "docker tag data.stack:base.$TAG $DOCKER_REG/data.stack:base.$TAG"
    docker tag data.stack:base.$TAG $DOCKER_REG/data.stack:base.$TAG
    echo "docker push $DOCKER_REG/data.stack:base.$TAG"
    docker push $DOCKER_REG/data.stack:base.$TAG
fi
echo "****************************************************"
echo "data.stack:sm :: BUILD SUCCESS :: data.stack:sm.$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_SM
