pipeline {
    agent any


    parameters{
        string(name: 'branch', defaultValue: 'dev', description: 'Build from Branch')
        string(name: 'tag', defaultValue: 'dev', description: 'Image Tag')
        booleanParam(name: 'dockerHub', defaultValue: false, description: 'Push to Docker Hub')
        booleanParam(name: 'ecr', defaultValue: false, description: 'Push to ECR')
        booleanParam(name: 'gcr', defaultValue: false, description: 'Push to GCR')
        booleanParam(name: 'deploy', defaultValue: true, description: 'Deploy in machine')
    }
    stages {
        stage('Build') {
            steps {
                sh "chmod 777 ./scripts/echo.sh"
                sh "./scripts/echo.sh"
            }
        }
        stage('Script 2') {
            steps {
                sh "chmod 777 ./scripts/echo2.sh"
                sh "./scripts/echo2.sh"
            }
        }
        // stage('Build') {
        //     steps {
        //         sh "git checkout ${params.branch}"
        //         sh "git pull origin ${params.branch}"
        //         sh "docker build -t data.stack.sm:${params.tag} ."
        //     }
        // }
        // stage('Push to Local Registry') {
        //     steps {
        //         sh "docker tag data.stack.sm:${params.tag} ${env.LOCAL_REGISTRY}/data.stack.sm:${params.tag}"
        //         sh "docker push ${env.LOCAL_REGISTRY}/data.stack.sm:${params.tag}"
        //     }
        // }
        // stage('Save to S3') {
        //     when {
        //         expression {
        //             params.ecr  == true || params.gcr  == true || params.dockerHub  == true
        //         }
        //     }
        //     steps {
        //         sh "docker save -o data.stack.sm_${params.tag}.tar data.stack.sm:${params.tag}"
        //         sh "bzip2 data.stack.sm_${params.tag}.tar"
        //         sh "aws s3 cp data.stack.sm_${params.tag}.tar.bz2 s3://${env.S3_BUCKET}/stable-builds/data.stack.sm_${params.tag}.tar.bz2"
        //         sh "rm data.stack.sm_${params.tag}.tar.bz2"
        //     }
        // }
        // stage('Deploy') {
        //     when {
        //         expression {
        //             params.deploy == true
        //         }
        //     }
        //     steps {
        //         sh "kubectl set image deployment/sm sm=${env.LOCAL_REGISTRY}/data.stack.sm:${params.tag} -n ${env.NAMESPACE} --record=true"
        //     }
        // }
        // stage('Push to Docker Hub') {
        //     when {
        //         expression {
        //             params.dockerHub  == true
        //         }
        //     }
        //     steps {
        //         sh "docker tag data.stack.sm:${params.tag}appveen/data.stack.sm:${params.tag}"
        //         sh "docker push appveen/data.stack.sm:${params.tag}"
        //     }
        // }
        // stage('Push to ECR') {
        //     when {
        //         expression {
        //             params.ecr  == true
        //         }
        //     }
        //     steps {
        //         sh "aws ecr get-login --no-include-email"
        //         sh "docker tag data.stack.sm:${params.tag} ${env.ECR_URL}/data.stack.sm:${params.tag}"
        //         sh "docker push ${env.ECR_URL}/data.stack.sm:${params.tag}"
        //     }
        // }
        // stage('Push to GCR') {
        //     when {
        //         expression {
        //             params.gcr  == true
        //         }
        //     }
        //     steps {
        //         sh "docker tag data.stack.sm:${params.tag} ${env.GCR_URL}/data.stack.sm:${params.tag}"
        //         sh "docker push ${env.GCR_URL}/data.stack.sm:${params.tag}"
        //     }
        // }
    }
}