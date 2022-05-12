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
                echo 'Building..'
            }
        }
        stage('Deploy') {
            when {
                expression {
                    params.deploy
                }
            }
            steps {
                echo 'Deploying....'
            }
        }
        stage('Push to Docker Hub') {
            when {
                expression {
                    params.dockerHub
                }
            }
            steps {
                echo 'Pushing to Docker HUB....'
            }
        }
        stage('Push to ECR') {
            when {
                expression {
                    params.ecr
                }
            }
            steps {
                echo 'Pushing to ECR....'
            }
        }
        stage('Push to GCR') {
            when {
                expression {
                    params.gcr
                }
            }
            steps {
                echo 'Pushing to GCR....'
            }
        }
    }
}