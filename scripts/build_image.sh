#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "odp:sm :: Toggle mode is on, terminating build"
    echo "odp:sm :: BUILD CANCLED"
    echo "****************************************************"
    exit 0
fi

cDate=`date +%Y.%m.%d.%H.%M` #Current date and time

if [ -f $WORKSPACE/../CICD ]; then
    CICD=`cat $WORKSPACE/../CICD`
fi
if [ -f $WORKSPACE/../ODP_RELEASE ]; then
    REL=`cat $WORKSPACE/../ODP_RELEASE`
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
    echo "odp:sm :: Please Create file ODP_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "odp:sm :: BUILD FAILED"
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
    echo "odp:sm :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../ODP_NAMESPACE ]; then
        echo "****************************************************"
        echo "odp:sm :: Please Create file ODP_NAMESPACE with the namespace at $WORKSPACE"
        echo "odp:sm :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    ODP_NS=`cat $WORKSPACE/../ODP_NAMESPACE`
fi

sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2

echo "****************************************************"
echo "odp:sm :: Using build :: "$TAG
echo "****************************************************"

cd $WORKSPACE

echo "****************************************************"
echo "odp:sm :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_SM ]; then
    echo "****************************************************"
    echo "odp:sm :: Doing a clean build"
    echo "****************************************************"
    
    docker build --no-cache -t odp:sm.$TAG .

    echo "****************************************************"
    echo "odp:sm :: Building base image"
    echo "****************************************************"
    docker build --no-cache -t odp:base.$TAG -f Dockerfile_base .
    rm $WORKSPACE/../CLEAN_BUILD_SM

    echo "****************************************************"
    echo "odp:sm :: Copying deployment files"
    echo "****************************************************"

    if [ $CICD ]; then
        sed -i.bak s#__docker_registry_server__#$DOCKER_REG# sm.yaml
        sed -i.bak s/__release_tag__/"'$REL'"/ sm.yaml
        sed -i.bak s#__release__#$TAG# sm.yaml
        sed -i.bak s#__namespace__#$ODP_NS# sm.yaml
        sed -i.bak '/imagePullSecrets/d' sm.yaml
        sed -i.bak '/- name: regsecret/d' sm.yaml

        kubectl delete deploy sm -n $ODP_NS || true # deleting old deployement
        kubectl delete service sm -n $ODP_NS || true # deleting old service
        #creating new deployment
        kubectl create -f sm.yaml
    fi

else
    echo "****************************************************"
    echo "odp:sm :: Doing a normal build"
    echo "****************************************************"

    docker build -t odp:sm.$TAG .

    echo "****************************************************"
    echo "odp:sm :: Building base image"
    echo "****************************************************"

    docker build -t odp:base.$TAG -f Dockerfile_base .

    if [ $CICD ]; then
        kubectl set image deployment/sm sm=odp:sm.$TAG -n $ODP_NS --record=true
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "odp:sm :: Docker Registry found, pushing image"
    echo "****************************************************"

    echo "docker tag odp:sm.$TAG $DOCKER_REG/odp:sm.$TAG"
    docker tag odp:sm.$TAG $DOCKER_REG/odp:sm.$TAG
    echo "docker push $DOCKER_REG/odp:sm.$TAG"
    docker push $DOCKER_REG/odp:sm.$TAG

    echo "docker tag odp:base.$TAG $DOCKER_REG/odp:base.$TAG"
    docker tag odp:base.$TAG $DOCKER_REG/odp:base.$TAG
    echo "docker push $DOCKER_REG/odp:base.$TAG"
    docker push $DOCKER_REG/odp:base.$TAG
fi
echo "****************************************************"
echo "odp:sm :: BUILD SUCCESS :: odp:sm.$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_SM
