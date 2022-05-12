pipeline {
    agent any


    parameters{
        string(name: 'tag', defaultValue: 'dev', description: 'Image Tag')
        booleanParam(name: 'dockerHub', defaultValue: false, description: 'Push to Docker Hub')
        booleanParam(name: 'ecr', defaultValue: false, description: 'Push to ECR')
        booleanParam(name: 'gcr', defaultValue: false, description: 'Push to GCR')
        booleanParam(name: 'deploy', defaultValue: true, description: 'Deploy in machine')
    }
    stages {
        stage('Build') {
            steps {
                sh "docker build -t data.stack.sm:${params.tag} ."
            }
        }
        stage('Push to Local Registry') {
            steps {
                sh "docker tag data.stack.sm:${params.tag} ${env.LOCAL_REGISTRY}/data.stack.sm:${params.tag}"
                sh "docker push ${env.LOCAL_REGISTRY}/data.stack.sm:${params.tag}"
            }
        }
        stage('Deploy') {
            when {
                expression {
                    params.deploy == true
                }
            }
            steps {
                echo 'Deploying....'
            }
        }
        stage('Push to Docker Hub') {
            when {
                expression {
                    params.dockerHub  == true
                }
            }
            steps {
                sh "docker tag data.stack.sm:${params.tag}appveen/data.stack.sm:${params.tag}"
                sh "docker push appveen/data.stack.sm:${params.tag}"
            }
        }
        stage('Push to ECR') {
            when {
                expression {
                    params.ecr  == true
                }
            }
            steps {
                sh "docker tag data.stack.sm:${params.tag} ${env.ECR_URL}/data.stack.sm:${params.tag}"
                sh "docker push ${env.ECR_URL}/data.stack.sm:${params.tag}"
            }
        }
        stage('Push to GCR') {
            when {
                expression {
                    params.gcr  == true
                }
            }
            steps {
                sh "docker tag data.stack.sm:${params.tag} ${env.GCR_URL}/data.stack.sm:${params.tag}"
                sh "docker push ${env.GCR_URL}/data.stack.sm:${params.tag}"
            }
        }
    }
}