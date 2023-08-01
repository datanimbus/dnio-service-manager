#!/bin/bash
set -e
if [ -f $WORKSPACE/../TOGGLE ]; then
    echo "****************************************************"
    echo "datanimbus.io.sm :: Toggle mode is on, terminating build"
    echo "datanimbus.io.sm :: BUILD CANCLED"
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
    echo "datanimbus.io.sm :: Please Create file DATA_STACK_RELEASE with the releaese at $WORKSPACE or provide it as 1st argument of this script."
    echo "datanimbus.io.sm :: BUILD FAILED"
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
    echo "datanimbus.io.sm :: CICI env found"
    echo "****************************************************"
    TAG=$TAG"_"$cDate
    if [ ! -f $WORKSPACE/../DATA_STACK_NAMESPACE ]; then
        echo "****************************************************"
        echo "datanimbus.io.sm :: Please Create file DATA_STACK_NAMESPACE with the namespace at $WORKSPACE"
        echo "datanimbus.io.sm :: BUILD FAILED"
        echo "****************************************************"
        exit 0
    fi
    DATA_STACK_NS=`cat $WORKSPACE/../DATA_STACK_NAMESPACE`
fi

sh $WORKSPACE/scripts/prepare_yaml.sh $REL $2

echo "****************************************************"
echo "datanimbus.io.sm :: Using build :: "$TAG
echo "****************************************************"

cd $WORKSPACE

echo "****************************************************"
echo "datanimbus.io.sm :: Adding IMAGE_TAG in Dockerfile :: "$TAG
echo "****************************************************"
sed -i.bak s#__image_tag__#$TAG# Dockerfile

if [ -f $WORKSPACE/../CLEAN_BUILD_SM ]; then
    echo "****************************************************"
    echo "datanimbus.io.sm :: Doing a clean build"
    echo "****************************************************"
    
    docker build --no-cache -t datanimbus.io.sm:$TAG .
    rm $WORKSPACE/../CLEAN_BUILD_SM

    echo "****************************************************"
    echo "datanimbus.io.sm :: Building base image"
    echo "****************************************************"
    cd $WORKSPACE/../ds-base
    sed -i.bak s#__image_tag__#$TAG# Dockerfile
    docker build --no-cache -t datanimbus.io.base:$TAG .
    cd $WORKSPACE

    echo "****************************************************"
    echo "datanimbus.io.sm :: Copying deployment files"
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
    echo "datanimbus.io.sm :: Doing a normal build"
    echo "****************************************************"

    docker build -t datanimbus.io.sm:$TAG .

    echo "****************************************************"
    echo "datanimbus.io.sm :: Building base image"
    echo "****************************************************"
    
    cd $WORKSPACE/../ds-base
    sed -i.bak s#__image_tag__#$TAG# Dockerfile
    docker build -t datanimbus.io.base:$TAG .
    cd $WORKSPACE

    if [ $CICD ]; then
        if [ $DOCKER_REG ]; then
            kubectl set image deployment/sm sm=$DOCKER_REG/datanimbus.io.sm:$TAG -n $DATA_STACK_NS --record=true
        else 
            kubectl set image deployment/sm sm=datanimbus.io.sm:$TAG -n $DATA_STACK_NS --record=true
        fi
    fi
fi
if [ $DOCKER_REG ]; then
    echo "****************************************************"
    echo "datanimbus.io.sm :: Docker Registry found, pushing image"
    echo "****************************************************"

    echo "docker tag datanimbus.io.sm:$TAG $DOCKER_REG/datanimbus.io.sm:$TAG"
    docker tag datanimbus.io.sm:$TAG $DOCKER_REG/datanimbus.io.sm:$TAG
    echo "docker push $DOCKER_REG/datanimbus.io.sm:$TAG"
    docker push $DOCKER_REG/datanimbus.io.sm:$TAG

    echo "docker tag datanimbus.io.base:$TAG $DOCKER_REG/datanimbus.io.base:$TAG"
    docker tag datanimbus.io.base:$TAG $DOCKER_REG/datanimbus.io.base:$TAG
    echo "docker push $DOCKER_REG/datanimbus.io.base:$TAG"
    docker push $DOCKER_REG/datanimbus.io.base:$TAG
fi
echo "****************************************************"
echo "datanimbus.io.sm :: BUILD SUCCESS :: datanimbus.io.sm:$TAG"
echo "****************************************************"
echo $TAG > $WORKSPACE/../LATEST_SM
