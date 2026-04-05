pipeline {
    agent any

    parameters {
        choice(
            name: 'ENVIRONMENT',
            choices: ['dev', 'staging', 'production'],
            description: 'Target deployment environment'
        )
        booleanParam(
            name: 'SKIP_TESTS',
            defaultValue: false,
            description: 'Skip running tests (not recommended)'
        )
        booleanParam(
            name: 'SKIP_SECURITY',
            defaultValue: false,
            description: 'Skip security scans'
        )
        booleanParam(
            name: 'FORCE_DEPLOY',
            defaultValue: false,
            description: 'Force deployment regardless of branch'
        )
    }

    options {
        buildDiscarder(logRotator(numToKeepStr: '10'))
        timeout(time: 45, unit: 'MINUTES')
        timestamps()
        ansiColor('xterm')
    }

    environment {
        APP_NAME = 'sample-web-app'
        APP_VERSION = generateAppVersion()
        DOCKER_IMAGE = "${env.APP_NAME}:${env.APP_VERSION}"
        DEPLOY_ENV = determineDeploymentEnvironment()
    }

    stages {
        stage('Pipeline Initialization') {
            steps {
                script {
                    echo "🎬 Starting CI/CD Pipeline"
                    echo "=================================="
                    echo "Application: ${env.APP_NAME}"
                    echo "Version: ${env.APP_VERSION}"
                    echo "Branch: ${env.GIT_BRANCH ?: 'main'}"
                    echo "Build: ${env.BUILD_NUMBER}"
                    echo "Deploy Environment: ${env.DEPLOY_ENV}"
                    echo "=================================="

                    // Archive build metadata
                    def buildInfo = [
                        appName: env.APP_NAME,
                        version: env.APP_VERSION,
                        branch: env.GIT_BRANCH ?: 'main',
                        buildNumber: env.BUILD_NUMBER,
                        timestamp: new Date().toString(),
                        parameters: params
                    ]

                    writeJSON file: 'build-metadata.json', json: buildInfo
                    archiveArtifacts artifacts: 'build-metadata.json', fingerprint: true
                }
            }
        }

        stage('Code Quality & Build') {
            parallel {
                stage('Lint & Build') {
                    agent {
                        docker {
                            image 'node:18-alpine'
                        }
                    }
                    steps {
                        echo "📦 Installing dependencies..."
                        sh 'npm ci'

                        echo "🔍 Running linter..."
                        sh 'npm run lint'

                        echo "🔧 Building application..."
                        sh 'npm run build'
                    }
                }

                stage('Security Scan') {
                    when {
                        not { params.SKIP_SECURITY }
                    }
                    steps {
                        echo "🛡️ Running security scan..."
                        script {
                            sh 'npm audit --audit-level=moderate || true'
                            echo "✅ Security scan completed"
                        }
                    }
                }
            }
        }

        stage('Testing Suite') {
            when {
                not { params.SKIP_TESTS }
            }
            parallel {
                stage('Unit Tests') {
                    agent {
                        docker {
                            image 'node:18-alpine'
                        }
                    }
                    steps {
                        sh 'npm ci'
                        sh 'npm run test:unit'
                    }
                }

                stage('Integration Tests') {
                    agent {
                        docker {
                            image 'node:18-alpine'
                        }
                    }
                    steps {
                        sh 'npm ci'
                        retry(2) {
                            sh 'npm run test:integration'
                        }
                    }
                }

                stage('E2E Tests') {
                    when {
                        anyOf {
                            branch 'main'
                            environment name: 'DEPLOY_ENV', value: 'production'
                        }
                    }
                    steps {
                        echo "🎭 Running E2E tests..."
                        sh 'npm run test:e2e'
                    }
                }
            }
        }

        stage('Docker Build') {
            steps {
                script {
                    echo "🐳 Building Docker image..."

                    def dockerImage = docker.build("${env.DOCKER_IMAGE}", "-f docker/Dockerfile .")

                    // Test the image
                    echo "🧪 Testing Docker image..."
                    dockerImage.inside {
                        sh 'npm --version'
                        sh 'node --version'
                    }

                    echo "✅ Docker image built and tested successfully"
                }
            }
        }

        stage('Quality Gates') {
            parallel {
                stage('Performance Check') {
                    steps {
                        script {
                            echo "⚡ Running performance tests..."

                            // Simulate performance testing
                            def performanceResults = [
                                responseTime: 120,
                                throughput: 850,
                                errorRate: 0.05
                            ]

                            echo "Performance Results:"
                            echo "  Response Time: ${performanceResults.responseTime}ms"
                            echo "  Throughput: ${performanceResults.throughput} req/s"
                            echo "  Error Rate: ${performanceResults.errorRate}%"

                            if (performanceResults.responseTime > 500) {
                                unstable("Performance degradation detected")
                            }
                        }
                    }
                }

                stage('Coverage Check') {
                    steps {
                        script {
                            // Simulate coverage check
                            def coverageThreshold = 80
                            def actualCoverage = 85

                            echo "Code coverage: ${actualCoverage}%"

                            if (actualCoverage < coverageThreshold) {
                                unstable("Code coverage below threshold")
                            } else {
                                echo "✅ Coverage meets requirements"
                            }
                        }
                    }
                }
            }
        }

        stage('Deployment Decision') {
            when {
                anyOf {
                    branch 'main'
                    branch 'develop'
                    expression { params.FORCE_DEPLOY }
                }
            }
            steps {
                script {
                    echo "🤔 Making deployment decision..."

                    def shouldDeploy = false
                    def deploymentReason = ""

                    if (env.GIT_BRANCH?.contains('main')) {
                        shouldDeploy = true
                        deploymentReason = "Main branch - automatic deployment"
                    } else if (env.GIT_BRANCH?.contains('develop')) {
                        shouldDeploy = true
                        deploymentReason = "Develop branch - staging deployment"
                    } else if (params.FORCE_DEPLOY) {
                        shouldDeploy = true
                        deploymentReason = "Force deployment requested"
                    }

                    if (shouldDeploy) {
                        echo "✅ Deployment approved: ${deploymentReason}"
                        env.DEPLOY_APPROVED = 'true'
                    } else {
                        echo "⏸️ Deployment skipped for this branch"
                        env.DEPLOY_APPROVED = 'false'
                    }
                }
            }
        }

        stage('Production Approval') {
            when {
                allOf {
                    environment name: 'DEPLOY_APPROVED', value: 'true'
                    environment name: 'DEPLOY_ENV', value: 'production'
                }
            }
            steps {
                script {
                    echo "🔒 Production deployment requires approval..."

                    timeout(time: 15, unit: 'MINUTES') {
                        def approval = input(
                            message: 'Approve production deployment?',
                            ok: 'Deploy to Production',
                            submitterParameter: 'APPROVER',
                            parameters: [
                                text(
                                    name: 'DEPLOYMENT_NOTES',
                                    defaultValue: 'Production deployment',
                                    description: 'Deployment notes'
                                )
                            ]
                        )

                        echo "✅ Production deployment approved by: ${env.APPROVER}"
                        echo "Notes: ${approval}"
                        env.DEPLOYMENT_NOTES = approval
                    }
                }
            }
        }

        stage('Deploy & Verify') {
            when {
                environment name: 'DEPLOY_APPROVED', value: 'true'
            }
            steps {
                script {
                    echo "🚀 Deploying to ${env.DEPLOY_ENV}..."

                    try {
                        // Deploy application
                        deployApplication(env.DEPLOY_ENV)

                        // Run post-deployment verification
                        runPostDeploymentTests(env.DEPLOY_ENV)

                        echo "✅ Deployment completed successfully"

                    } catch (Exception e) {
                        echo "❌ Deployment failed: ${e.getMessage()}"

                        // Attempt automatic rollback for production
                        if (env.DEPLOY_ENV == 'production') {
                            echo "🔄 Attempting automatic rollback..."
                            rollbackDeployment(env.DEPLOY_ENV)
                        }

                        throw e
                    }
                }
            }
        }
    }

    post {
        always {
            script {
                echo "🧹 Pipeline cleanup..."

                // Generate deployment report
                def reportData = [
                    pipeline: [
                        name: env.JOB_NAME,
                        build: env.BUILD_NUMBER,
                        status: currentBuild.result ?: 'SUCCESS',
                        duration: currentBuild.durationString
                    ],
                    application: [
                        name: env.APP_NAME,
                        version: env.APP_VERSION,
                        branch: env.GIT_BRANCH ?: 'main'
                    ],
                    deployment: [
                        environment: env.DEPLOY_ENV,
                        approved: env.DEPLOY_APPROVED ?: 'false',
                        approver: env.APPROVER ?: 'N/A'
                    ]
                ]

                writeJSON file: 'deployment-report.json', json: reportData
                archiveArtifacts artifacts: 'deployment-report.json', allowEmptyArchive: true

                // Cleanup Docker images
                sh "docker rmi ${env.DOCKER_IMAGE} || true"

                cleanWs()
            }
        }

        success {
            script {
                def message = "✅ Pipeline SUCCESS: ${env.APP_NAME} v${env.APP_VERSION} deployed to ${env.DEPLOY_ENV}"
                sendNotification(message, 'success')
            }
        }

        failure {
            script {
                def message = "❌ Pipeline FAILED: ${env.APP_NAME} (${env.GIT_BRANCH ?: 'main'})"
                sendNotification(message, 'failure')
            }
        }

        unstable {
            script {
                def message = "⚠️ Pipeline UNSTABLE: ${env.APP_NAME} - quality gates failed"
                sendNotification(message, 'warning')
            }
        }
    }
}

// Helper Functions
def generateAppVersion() {
    def baseVersion = "2.0"
    def buildNumber = env.BUILD_NUMBER
    def branchName = env.GIT_BRANCH ?: 'main'

    if (branchName.contains('main')) {
        return "${baseVersion}.${buildNumber}"
    } else if (branchName.contains('release/')) {
        def releaseVersion = branchName.split('/')[1]
        return "${releaseVersion}-rc.${buildNumber}"
    } else {
        def shortBranch = branchName.replaceAll('origin/', '').take(8)
        return "${baseVersion}.${buildNumber}-${shortBranch}"
    }
}

def determineDeploymentEnvironment() {
    if (params.ENVIRONMENT) {
        return params.ENVIRONMENT
    }

    def branchName = env.GIT_BRANCH ?: 'main'

    if (branchName.contains('main')) {
        return 'production'
    } else if (branchName.contains('release/')) {
        return 'staging'
    } else {
        return 'dev'
    }
}

def deployApplication(environment) {
    echo "🚀 Deploying ${env.APP_NAME} to ${environment}..."

    switch(environment) {
        case 'dev':
            sh "docker run -d --name ${env.APP_NAME}-dev -p 3001:3000 ${env.DOCKER_IMAGE}"
            break
        case 'staging':
            echo "Deploying to staging cluster..."
            sh "echo 'kubectl apply -f k8s/ --namespace=staging'"
            break
        case 'production':
            echo "Deploying to production cluster..."
            sh "echo 'kubectl apply -f k8s/ --namespace=production'"
            break
    }

    sleep(5) // Wait for deployment to stabilize
}

def runPostDeploymentTests(environment) {
    echo "🧪 Running post-deployment tests for ${environment}..."

    def baseUrl = getEnvironmentUrl(environment)

    // Health check
    retry(3) {
        sh "curl -f ${baseUrl}/health"
    }

    // API tests
    sh "curl -f ${baseUrl}/api/status"
    sh "curl -f ${baseUrl}/api/version"

    echo "✅ Post-deployment tests passed"
}

def getEnvironmentUrl(environment) {
    switch(environment) {
        case 'dev':
            return 'http://localhost:3001'
        case 'staging':
            return 'https://staging.example.com'
        case 'production':
            return 'https://app.example.com'
        default:
            return 'http://localhost:3000'
    }
}

def rollbackDeployment(environment) {
    echo "🔄 Rolling back deployment in ${environment}..."

    // Rollback logic would go here
    sh "echo 'kubectl rollout undo deployment/${env.APP_NAME} --namespace=${environment}'"

    echo "✅ Rollback completed"
}

def sendNotification(message, type) {
    echo "📢 Notification (${type}): ${message}"

    // In real scenario: send to Slack, Teams, email, etc.
    // slackSend(
    //     channel: '#deployments',
    //     message: message,
    //     color: type == 'success' ? 'good' : type == 'failure' ? 'danger' : 'warning'
    // )
}