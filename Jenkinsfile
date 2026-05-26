pipeline {
    agent any

    environment {
        DOCKER_HUB_CREDENTIALS = credentials('dockerhub-credentials')
        DOCKER_IMAGE            = credentials('docker-image-name')
        EC2_HOST                = credentials('ec2-host')
        DOCKER_TAG              = "${BUILD_NUMBER}"
        EC2_USER                = 'ubuntu'
        CONTAINER_NAME          = 'gatotkota-backend'
        APP_PORT                = '3000'
    }

    stages {

        stage('Checkout') {
            steps {
                echo '=== Stage 1: Checkout ==='
                checkout scm
                echo 'Repository berhasil di-checkout'
            }
        }

        stage('Build') {
            steps {
                echo '=== Stage 2: Build ==='
                sh 'npm ci --only=production'
                echo 'Dependencies berhasil diinstall'
            }
        }

        stage('Test') {
            steps {
                echo '=== Stage 3: Test ==='
                sh 'npm ci'
                sh 'npm test'
                echo 'Semua test berhasil'
            }
        }

        stage('Docker Build') {
            steps {
                echo '=== Stage 4: Docker Build ==='
                sh "docker build -t ${DOCKER_IMAGE}:${DOCKER_TAG} ."
                sh "docker tag ${DOCKER_IMAGE}:${DOCKER_TAG} ${DOCKER_IMAGE}:latest"
                echo "Image ${DOCKER_IMAGE}:${DOCKER_TAG} berhasil dibuat"
            }
        }

        stage('Docker Push') {
            steps {
                echo '=== Stage 5: Docker Push ==='
                sh "echo ${DOCKER_HUB_CREDENTIALS_PSW} | docker login -u ${DOCKER_HUB_CREDENTIALS_USR} --password-stdin"
                sh "docker push ${DOCKER_IMAGE}:${DOCKER_TAG}"
                sh "docker push ${DOCKER_IMAGE}:latest"
                echo "Image berhasil di-push ke Docker Hub"
            }
        }

        stage('Deploy') {
            steps {
                echo '=== Stage 6: Deploy ==='
                sshagent(['ec2-ssh-key']) {
                    sh """
                        ssh -o StrictHostKeyChecking=no ${EC2_USER}@${EC2_HOST} '
                            docker pull ${DOCKER_IMAGE}:latest &&
                            docker stop ${CONTAINER_NAME} || true &&
                            docker rm   ${CONTAINER_NAME} || true &&
                            docker run -d \\
                                --name ${CONTAINER_NAME} \\
                                -p ${APP_PORT}:${APP_PORT} \\
                                --env-file /home/ubuntu/.env \\
                                --restart unless-stopped \\
                                ${DOCKER_IMAGE}:latest
                        '
                    """
                }
                echo "Aplikasi berhasil di-deploy ke EC2"
            }
        }
    }

    post {
        success {
            echo "Pipeline BERHASIL — Build #${BUILD_NUMBER} | Image: ${DOCKER_IMAGE}:${DOCKER_TAG}"
        }
        failure {
            echo "Pipeline GAGAL — cek log di atas untuk detail error"
        }
    }
}
