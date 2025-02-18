// 游戏状态管理
let gameState = {
    movementQuality: 0,
    currentSpeed: 0,
    stepCount: 0,
    debugInfo: ''
};

// 更新状态显示
function updateGameState() {
    const stateElement = document.getElementById('gameState');
    if (!stateElement) {
        const stateDiv = document.createElement('div');
        stateDiv.id = 'gameState';
        document.body.appendChild(stateDiv);
    }

    // 计算动作质量评分
    const qualityScore = Math.min(100, (gameState.movementQuality * 100));
    const qualityClass = qualityScore > 80 ? 'status-good' :
                        qualityScore > 50 ? 'status-warning' :
                        'status-error';

    // 更新状态显示
    const fpsElement = document.getElementById('fpsValue');
    const stateHtml = `
        <h3>游戏状态 (FPS: <span>${fpsElement.textContent || 0}</span>)</h3>
        <p>动作质量: <span class="${qualityClass}">${qualityScore.toFixed(1)}%</span></p>
        <p>当前速度: ${gameState.currentSpeed.toFixed(1)} m/s ${
            gameState.currentSpeed === 0 ? '(等待开始跑步...)' :
            gameState.currentSpeed < 5 * 0.3 ? '(慢跑中...)' :
            gameState.currentSpeed < 5 * 0.7 ? '(跑步中...)' :
            '(冲刺中！)'
        }</p>
        <p>步数: ${gameState.stepCount}</p>
        ${gameState.debugInfo ? `<p>调试信息: ${gameState.debugInfo}</p>` : ''}
    `;
    document.getElementById('gameState').innerHTML = stateHtml;
}

// 初始化Three.js场景
let scene, camera, renderer;
let ground, player;
let isRunning = false;
let speed = 0;
let targetSpeed = 0;
const maxSpeed = 5;
const acceleration = 0.1;
const deceleration = 0.05;

// 初始化MediaPipe
let pose;
let lastPositions = {
    leftKnee: 0,
    rightKnee: 0,
    leftAnkle: 0,
    rightAnkle: 0
};
let runningThreshold = 0.2;
let lastStepTime = 0;
let stepCount = 0;
let calibrationData = {
    isCalibrated: false,
    baselineY: 0,
    samples: [],
    sampleCount: 30
};
let movementBuffer = [];
const bufferSize = 5;
let consecutiveMovements = 0;
const requiredConsecutiveMovements = 3;

// 添加检测状态控制
let isDetecting = false;

async function init() {
    try {
        // 重置游戏状态
        gameState.movementQuality = 0;
        gameState.currentSpeed = 0;
        gameState.stepCount = 0;
        gameState.debugInfo = '准备开始...';
        updateGameState();

        // 设置Three.js场景
        scene = new THREE.Scene();
        scene.background = new THREE.Color(0x87ceeb); // 添加天空蓝背景色

        // 设置相机
        camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
        
        // 设置渲染器
        renderer = new THREE.WebGLRenderer({ 
            canvas: document.getElementById('gameCanvas'),
            antialias: true 
        });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);

        // 添加环境光和平行光
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);
        
        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(0, 50, 0);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        // 创建无限地形系统
        const terrainSystem = {
            grounds: [],
            decorations: [],
            segmentLength: 1000,
            segmentWidth: 100,
            activeSegments: 3,
            decorationsPerSegment: 20,
            maxDecorationsPool: 100,
            lastGeneratedZ: 0
        };

        // 创建地面材质
        const groundMaterial = new THREE.MeshStandardMaterial({
            color: 0x228B22,  // 森林绿色
            roughness: 0.8,
            metalness: 0.2
        });

        // 创建装饰物体材质
        const decorationMaterial = new THREE.MeshStandardMaterial({ color: 0x808080 });
        const decorationGeometry = new THREE.BoxGeometry(2, 2, 2);

        // 初始化对象池
        const decorationPool = [];
        for (let i = 0; i < terrainSystem.maxDecorationsPool; i++) {
            const decoration = new THREE.Mesh(decorationGeometry, decorationMaterial);
            decoration.castShadow = true;
            decoration.visible = false;
            scene.add(decoration);
            decorationPool.push(decoration);
        }

        // 创建初始地形段
        for (let i = 0; i < terrainSystem.activeSegments; i++) {
            const groundGeometry = new THREE.PlaneGeometry(
                terrainSystem.segmentWidth,
                terrainSystem.segmentLength
            );
            const groundMesh = new THREE.Mesh(groundGeometry, groundMaterial);
            groundMesh.rotation.x = -Math.PI / 2;
            groundMesh.receiveShadow = true;
            groundMesh.position.z = i * terrainSystem.segmentLength;
            scene.add(groundMesh);
            terrainSystem.grounds.push(groundMesh);
            terrainSystem.lastGeneratedZ = (i + 1) * terrainSystem.segmentLength;

            // 为每个地形段添加装饰物
            for (let j = 0; j < terrainSystem.decorationsPerSegment; j++) {
                const decoration = decorationPool[decorationPool.length - 1];
                decorationPool.pop();
                decoration.visible = true;
                decoration.position.set(
                    Math.random() * 80 - 40,
                    1,
                    i * terrainSystem.segmentLength + Math.random() * terrainSystem.segmentLength
                );
                terrainSystem.decorations.push(decoration);
            }
        }

        // 将地形系统添加到全局变量
        window.terrainSystem = terrainSystem;
        window.decorationPool = decorationPool;

        // 设置相机位置
        camera.position.set(0, 5, -10);
        camera.lookAt(0, 0, 10);

        // 初始化MediaPipe Pose
        pose = new Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`;
            }
        });

        pose.setOptions({
            modelComplexity: 1,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,
            minTrackingConfidence: 0.5
        });

        // 设置回调函数
        pose.onResults(onPoseResults);

        // 初始化摄像头
        const video = document.getElementById('webcamView');
        const stream = await navigator.mediaDevices.getUserMedia({ video: true });
        video.srcObject = stream;
        video.onloadedmetadata = () => {
            video.play();
            detectPose();  // 启动检测循环
            isDetecting = true; // 开始检测
        };

        // 开始动画循环
        animate();
        
        console.log('3D场景初始化成功');
    } catch (error) {
        console.error('初始化错误:', error);
    }
}

// 添加停止检测函数
function stopDetection() {
    isDetecting = false;
    gameState.debugInfo = '';
    updateGameState();
}

async function detectPose() {
    const video = document.getElementById('webcamView');
    if (video.readyState === 4 && isDetecting) {
        await pose.send({image: video});
    }
    requestAnimationFrame(detectPose);
}

// 添加FPS计数器
let frameCount = 0;
let lastTime = performance.now();

function updateFPS() {
    const fpsElement = document.getElementById('fpsValue');
    if (!fpsElement) return; // 如果元素不存在，直接返回

    frameCount++;
    const currentTime = performance.now();
    if (currentTime - lastTime >= 1000) {
        const fps = Math.round(frameCount * 1000 / (currentTime - lastTime));
        fpsElement.textContent = fps;
        frameCount = 0;
        lastTime = currentTime;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    // 平滑速度变化
    if (Math.abs(speed - targetSpeed) > 0.01) {
        if (speed < targetSpeed) {
            speed += acceleration;
        } else {
            speed -= deceleration;
        }
    }
    
    // 限制最小和最大速度
    speed = THREE.MathUtils.lerp(speed, targetSpeed, 0.1);
    
    // 更新游戏状态
    gameState.currentSpeed = speed;
    if (speed === 0) {
        if (!gameState.debugInfo.includes('动作')) {
            gameState.debugInfo = '等待开始跑步...';
        }
    } else if (speed < maxSpeed * 0.3) {
        if (!gameState.debugInfo.includes('动作')) {
            gameState.debugInfo = '慢跑中...';
        }
    } else if (speed < maxSpeed * 0.7) {
        if (!gameState.debugInfo.includes('动作')) {
            gameState.debugInfo = '跑步中...';
        }
    } else {
        if (!gameState.debugInfo.includes('动作')) {
            gameState.debugInfo = '冲刺中！';
        }
    }
    updateGameState();

    if (speed > 0) {
        // 使用平滑的相机移动
        const moveStep = speed * 0.5; // 降低移动速度
        camera.position.z += moveStep;
        
        // 获取地形系统
        const terrainSystem = window.terrainSystem;
        const decorationPool = window.decorationPool;
        const cameraZ = camera.position.z;
        
        // 检查是否需要生成新的地形段
        if (cameraZ + terrainSystem.segmentLength > terrainSystem.lastGeneratedZ - terrainSystem.segmentLength) {
            // 移除最远的地形段
            const oldGround = terrainSystem.grounds.shift();
            oldGround.position.z = terrainSystem.lastGeneratedZ;
            terrainSystem.grounds.push(oldGround);
            
            // 回收和重新生成装饰物
            const decorationsToRecycle = terrainSystem.decorations.filter(
                d => d.position.z < cameraZ - terrainSystem.segmentLength
            );
            
            decorationsToRecycle.forEach(decoration => {
                decoration.visible = false;
                decorationPool.push(decoration);
                terrainSystem.decorations = terrainSystem.decorations.filter(d => d !== decoration);
            });
            
            // 在新地形段添加装饰物
            for (let i = 0; i < terrainSystem.decorationsPerSegment; i++) {
                if (decorationPool.length > 0) {
                    const decoration = decorationPool.pop();
                    decoration.visible = true;
                    decoration.position.set(
                        Math.random() * 80 - 40,
                        1,
                        terrainSystem.lastGeneratedZ + Math.random() * terrainSystem.segmentLength
                    );
                    terrainSystem.decorations.push(decoration);
                }
            }
            
            // 更新最后生成的Z坐标
            terrainSystem.lastGeneratedZ += terrainSystem.segmentLength;
        }
        
        // 添加更自然的相机摇晃效果
        const walkingCycle = Date.now() * 0.002;
        const verticalBob = Math.sin(walkingCycle) * (speed * 0.05);
        const lateralBob = Math.cos(walkingCycle * 0.5) * (speed * 0.025);
        
        camera.position.y = 5 + verticalBob;
        camera.position.x = lateralBob;
        
        // 相机稍微朝向运动方向
        camera.lookAt(0, 5, camera.position.z + 10);
    }
    
    updateFPS();
    renderer.render(scene, camera);
}

// 处理窗口大小变化
window.addEventListener('resize', () => {
    const width = window.innerWidth;
    const height = window.innerHeight;
    
    camera.aspect = width / height;
    camera.updateProjectionMatrix();
    renderer.setSize(width, height);
});

// 添加错误处理
window.addEventListener('error', (event) => {
    console.error('运行时错误:', event.error);
});

// 启动游戏
window.addEventListener('load', () => {
    init().catch(error => {
        console.error('游戏启动失败:', error);
    });

});

// 辅助函数：计算平均值
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

// 计算关节角度
function getAngle(a, b, c) {
    if (!a || !b || !c || 
        typeof a.x !== 'number' || typeof a.y !== 'number' ||
        typeof b.x !== 'number' || typeof b.y !== 'number' ||
        typeof c.x !== 'number' || typeof c.y !== 'number') {
        return 0;
    }
    
    const ab = [b.x - a.x, b.y - a.y];
    const cb = [b.x - c.x, b.y - c.y];
    
    const dot = ab[0]*cb[0] + ab[1]*cb[1];
    const magAB = Math.sqrt(ab[0]**2 + ab[1]**2);
    const magCB = Math.sqrt(cb[0]**2 + cb[1]**2);
    
    // 防止除以零
    if (magAB === 0 || magCB === 0) return 0;
    
    const cosTheta = dot/(magAB*magCB);
    // 确保 cosTheta 在有效范围内
    const clampedCosTheta = Math.max(-1, Math.min(1, cosTheta));
    return Math.acos(clampedCosTheta) * (180/Math.PI);
}

function onPoseResults(results) {
    if (!results || !results.poseLandmarks) {
        // console.log('未检测到姿势');
        targetSpeed = 0; // 直接停止
        isRunning = false;
        consecutiveMovements = 0;
        gameState.debugInfo = '未检测到姿势';
        updateGameState();
        return;
    }

    const landmarks = results.poseLandmarks;
    if (!Array.isArray(landmarks)) {
        // console.error('姿势关键点格式错误');
        return;
    }
    // console.log('检测到的关键点:', landmarks); // 添加调试信息
    let KEYPOINTS = {
        LEFT_HIP: 23,
        RIGHT_HIP: 24,
        LEFT_KNEE: 25,
        RIGHT_KNEE: 26,
        LEFT_ANKLE: 27,
        RIGHT_ANKLE: 28,
        LEFT_SHOULDER: 11,
        RIGHT_SHOULDER: 12,
        LEFT_ELBOW: 13,
        RIGHT_ELBOW: 14
    };
    
    // 计算手臂运动
    const now = Date.now();
    
    // 初始化历史记录
    if (!window.poseHistory) {
        window.poseHistory = {
            timestamps: [],
            leftElbow: [],
            leftShoulder: [],
            rightElbow: [],
            rightShoulder: [],
            leftHip: [],
            rightHip: [],
            lastUpdateTime: now,
            lastArmSwingPhase: 'neutral' // 新增：记录手臂摆动相位
        };
    }

    // 更新历史记录
    const historyWindow = 300; // 300ms的时间窗口
    window.poseHistory.timestamps.push(now);
    
    // 更新手臂和肩膀位置
    if (landmarks[KEYPOINTS.LEFT_ELBOW] && landmarks[KEYPOINTS.LEFT_SHOULDER]) {
        window.poseHistory.leftElbow.push({
            x: landmarks[KEYPOINTS.LEFT_ELBOW].x,
            y: landmarks[KEYPOINTS.LEFT_ELBOW].y
        });
        window.poseHistory.leftShoulder.push({
            x: landmarks[KEYPOINTS.LEFT_SHOULDER].x,
            y: landmarks[KEYPOINTS.LEFT_SHOULDER].y
        });
    }
    
    if (landmarks[KEYPOINTS.RIGHT_ELBOW] && landmarks[KEYPOINTS.RIGHT_SHOULDER]) {
        window.poseHistory.rightElbow.push({
            x: landmarks[KEYPOINTS.RIGHT_ELBOW].x,
            y: landmarks[KEYPOINTS.RIGHT_ELBOW].y
        });
        window.poseHistory.rightShoulder.push({
            x: landmarks[KEYPOINTS.RIGHT_SHOULDER].x,
            y: landmarks[KEYPOINTS.RIGHT_SHOULDER].y
        });
    }

    // 更新髋部位置
    if (landmarks[KEYPOINTS.LEFT_HIP]) {
        window.poseHistory.leftHip.push({
            x: landmarks[KEYPOINTS.LEFT_HIP].x,
            y: landmarks[KEYPOINTS.LEFT_HIP].y
        });
    }
    
    if (landmarks[KEYPOINTS.RIGHT_HIP]) {
        window.poseHistory.rightHip.push({
            x: landmarks[KEYPOINTS.RIGHT_HIP].x,
            y: landmarks[KEYPOINTS.RIGHT_HIP].y
        });
    }

    // 保持窗口大小
    while (now - window.poseHistory.timestamps[0] > historyWindow) {
        window.poseHistory.timestamps.shift();
        window.poseHistory.leftElbow.shift();
        window.poseHistory.leftShoulder.shift();
        window.poseHistory.rightElbow.shift();
        window.poseHistory.rightShoulder.shift();
        window.poseHistory.leftHip.shift();
        window.poseHistory.rightHip.shift();
    }

    // 计算速度矢量
    const calculateVelocity = (current, previous, timeDelta) => {
        if (!current || !previous) return { x: 0, y: 0 };
        return {
            x: (current.x - previous.x) / timeDelta,
            y: (current.y - previous.y) / timeDelta
        };
    };

    // 计算运动强度
    const calculateIntensity = (velocity) => {
        return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    };

    // 检查关键点可见性
    const checkVisibility = (landmarks, points) => {
        return points.every(point => landmarks[point] && landmarks[point].visibility > 0.5);
    };

    // 检查姿势是否符合跑步状态
    const checkRunningPose = (landmarks) => {
        // 检查上半身是否可见（肩膀必须可见）
        const shouldersVisible = checkVisibility(landmarks, [
            KEYPOINTS.LEFT_SHOULDER,
            KEYPOINTS.RIGHT_SHOULDER
        ]);

        // 检查髋部是否可见（不强制要求）
        const hipsVisible = checkVisibility(landmarks, [
            KEYPOINTS.LEFT_HIP,
            KEYPOINTS.RIGHT_HIP
        ]);

        // 至少需要一个完整的手臂可见
        const leftArmVisible = checkVisibility(landmarks, [
            KEYPOINTS.LEFT_SHOULDER,
            KEYPOINTS.LEFT_ELBOW
        ]);

        const rightArmVisible = checkVisibility(landmarks, [
            KEYPOINTS.RIGHT_SHOULDER,
            KEYPOINTS.RIGHT_ELBOW
        ]);

        // 检查是否处于站立/跑步姿势
        let isStandingPose = true; // 默认为true
        if (hipsVisible) {
            // 如果髋部可见，则检查躯干垂直度
            const leftShoulderY = landmarks[KEYPOINTS.LEFT_SHOULDER].y;
            const leftHipY = landmarks[KEYPOINTS.LEFT_HIP].y;
            const rightShoulderY = landmarks[KEYPOINTS.RIGHT_SHOULDER].y;
            const rightHipY = landmarks[KEYPOINTS.RIGHT_HIP].y;
            
            // 计算躯干与垂直线的夹角
            const torsoAngleLeft = Math.abs(Math.atan2(leftHipY - leftShoulderY, 0.001));
            const torsoAngleRight = Math.abs(Math.atan2(rightHipY - rightShoulderY, 0.001));
            const averageTorsoAngle = (torsoAngleLeft + torsoAngleRight) / 2;
            
            // 如果躯干接近垂直（允许20度误差），认为是站立姿势
            isStandingPose = averageTorsoAngle > Math.PI/2 - Math.PI/9 && 
                            averageTorsoAngle < Math.PI/2 + Math.PI/9;
        } else {
            // 如果髋部不可见，通过肩膀的水平对齐程度来判断是否站立
            const shoulderYDiff = Math.abs(landmarks[KEYPOINTS.LEFT_SHOULDER].y - 
                                         landmarks[KEYPOINTS.RIGHT_SHOULDER].y);
            // 如果肩膀高度差异不大，认为是站立姿势
            isStandingPose = shoulderYDiff < 0.1;
        }

        // 判定条件：
        // 1. 肩膀必须可见
        // 2. 至少有一个手臂可见用于检测跑步动作
        // 3. 姿势必须接近站立状态
        return {
            isValid: shouldersVisible && (leftArmVisible || rightArmVisible) && isStandingPose,
            hasLeftArm: leftArmVisible,
            hasRightArm: rightArmVisible,
            hasShoulders: shouldersVisible,
            hasHips: hipsVisible
        };
    };

    let totalIntensity = 0;
    let validMeasurements = 0;
    let armSwingCoordination = 0;

    // 检查姿势是否有效
    const poseStatus = checkRunningPose(landmarks);
    
    if (!poseStatus.isValid) {
        // 如果姿势无效，直接停止
        consecutiveMovements = 0;
        if (isRunning) {
            isRunning = false;
        }
        targetSpeed = 0;
        speed = Math.max(0, speed - 1.5);
        
        // 更新状态并返回
        gameState.movementQuality = 0;
        gameState.currentSpeed = speed;
        gameState.stepCount = stepCount;
        
        // 设置相应的调试信息
        let invalidReason = '';
        if (!poseStatus.hasShoulders) {
            invalidReason = '需要看到肩部';
        } else if (!poseStatus.hasLeftArm && !poseStatus.hasRightArm) {
            invalidReason = '需要至少一个手臂可见';
        } else {
            invalidReason = '请保持站立姿势';
        }
        gameState.debugInfo = `无效的跑步姿势 (${invalidReason})`;
        updateGameState();
        return;
    }

    // 计算手臂运动
    let leftArmIntensity = 0;
    let rightArmIntensity = 0;

    // 计算左臂运动（如果可见）
    if (poseStatus.hasLeftArm && window.poseHistory.leftElbow.length >= 2) {
        const currentIdx = window.poseHistory.leftElbow.length - 1;
        const prevIdx = currentIdx - 1;
        const timeDelta = (window.poseHistory.timestamps[currentIdx] - window.poseHistory.timestamps[prevIdx]) / 1000;

        const currentRelative = {
            x: window.poseHistory.leftElbow[currentIdx].x - window.poseHistory.leftShoulder[currentIdx].x,
            y: window.poseHistory.leftElbow[currentIdx].y - window.poseHistory.leftShoulder[currentIdx].y
        };

        const previousRelative = {
            x: window.poseHistory.leftElbow[prevIdx].x - window.poseHistory.leftShoulder[prevIdx].x,
            y: window.poseHistory.leftElbow[prevIdx].y - window.poseHistory.leftShoulder[prevIdx].y
        };

        const velocity = calculateVelocity(currentRelative, previousRelative, timeDelta);
        leftArmIntensity = calculateIntensity(velocity);
        totalIntensity += leftArmIntensity;
        validMeasurements++;
    }

    // 计算右臂运动（如果可见）
    if (poseStatus.hasRightArm && window.poseHistory.rightElbow.length >= 2) {
        const currentIdx = window.poseHistory.rightElbow.length - 1;
        const prevIdx = currentIdx - 1;
        const timeDelta = (window.poseHistory.timestamps[currentIdx] - window.poseHistory.timestamps[prevIdx]) / 1000;

        const currentRelative = {
            x: window.poseHistory.rightElbow[currentIdx].x - window.poseHistory.rightShoulder[currentIdx].x,
            y: window.poseHistory.rightElbow[currentIdx].y - window.poseHistory.rightShoulder[currentIdx].y
        };

        const previousRelative = {
            x: window.poseHistory.rightElbow[prevIdx].x - window.poseHistory.rightShoulder[prevIdx].x,
            y: window.poseHistory.rightElbow[prevIdx].y - window.poseHistory.rightShoulder[prevIdx].y
        };

        const velocity = calculateVelocity(currentRelative, previousRelative, timeDelta);
        rightArmIntensity = calculateIntensity(velocity);
        totalIntensity += rightArmIntensity;
        validMeasurements++;
    }

    // 检测手臂摆动模式
    if (poseStatus.hasLeftArm && poseStatus.hasRightArm) {
        const currentIdx = window.poseHistory.leftElbow.length - 1;
        const leftArmY = window.poseHistory.leftElbow[currentIdx].y;
        const rightArmY = window.poseHistory.rightElbow[currentIdx].y;
        
        // 检查手臂交替摆动
        if (Math.abs(leftArmY - rightArmY) > 0.1) {
            const newPhase = leftArmY > rightArmY ? 'left_up' : 'right_up';
            if (window.poseHistory.lastArmSwingPhase !== newPhase) {
                armSwingCoordination = 1.0;
                window.poseHistory.lastArmSwingPhase = newPhase;
            }
        }
    } else if ((poseStatus.hasLeftArm && leftArmIntensity > 0.2) || 
               (poseStatus.hasRightArm && rightArmIntensity > 0.2)) {
        // 单手摆动
        armSwingCoordination = 0.7;
    }

    // 计算平均运动强度
    const currentMovement = validMeasurements > 0 
        ? (totalIntensity / validMeasurements) * (0.5 + 0.5 * armSwingCoordination)
        : 0;
    
    // 更新运动缓冲区
    movementBuffer.push(currentMovement);
    if (movementBuffer.length > 3) {
        movementBuffer.shift();
    }

    // 使用最大值作为当前运动强度
    const maxMovement = Math.max(...movementBuffer);

    // 设置阈值
    const baselineThreshold = 0.15;
    const noiseThreshold = 0.05;
    const dynamicThreshold = baselineThreshold * (1 + speed/maxSpeed * 0.5);
    
    // 步态检测逻辑
    if (maxMovement > dynamicThreshold && maxMovement > noiseThreshold) {
        if (!isRunning) consecutiveMovements++;
        
        if (consecutiveMovements >= 2) {
            isRunning = true;
            const accelerationFactor = Math.min(1.0, (maxMovement - dynamicThreshold) / dynamicThreshold);
            targetSpeed = Math.min(maxSpeed, targetSpeed + 0.3 * accelerationFactor);
            
            if (now - lastStepTime > 200) {
                stepCount++;
                lastStepTime = now;
            }
        }
    } else if (maxMovement <= noiseThreshold) {
        consecutiveMovements = 0;
        if (isRunning) {
            isRunning = false;
        }
        targetSpeed = 0;
        speed = Math.max(0, speed - 1.5);
    } else {
        consecutiveMovements = Math.max(0, consecutiveMovements - 1);
        if (consecutiveMovements === 0 && isRunning) {
            isRunning = false;
        }
        targetSpeed = Math.max(0, targetSpeed - 0.2);
    }

    // 更新游戏状态
    gameState.movementQuality = Math.min(100, maxMovement / baselineThreshold * 100);
    gameState.currentSpeed = speed;
    gameState.stepCount = stepCount;
    gameState.debugInfo = `运动强度: ${maxMovement.toFixed(3)}, 阈值: ${dynamicThreshold.toFixed(3)}`;
    updateGameState();
}
