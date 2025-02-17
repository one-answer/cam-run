// 游戏状态管理
let gameState = {
    calibrationStatus: '未校准',
    detectionMode: '等待检测',
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
    const stateHtml = `
        <h3>游戏状态</h3>
        <p>校准状态: ${gameState.calibrationStatus}</p>
        <p>检测模式: ${gameState.detectionMode}</p>
        <p>动作质量: <span class="${qualityClass}">${qualityScore.toFixed(1)}%</span></p>
        <p>当前速度: ${gameState.currentSpeed.toFixed(1)} m/s</p>
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

async function init() {
    try {
        // 重置游戏状态
        gameState.calibrationStatus = '待校准';
        gameState.detectionMode = '等待检测';
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
            detectPose();
        };

        // 添加校准按钮
        const calibrateBtn = document.createElement('button');
        calibrateBtn.textContent = '开始校准';
        calibrateBtn.style.position = 'fixed';
        calibrateBtn.style.top = '20px';
        calibrateBtn.style.right = '20px';
        calibrateBtn.onclick = startCalibration;
        document.body.appendChild(calibrateBtn);
        console.log('校准按钮已创建并添加到DOM'); // 添加调试信息

        // 开始动画循环
        animate();
        
        console.log('3D场景初始化成功');
    } catch (error) {
        console.error('初始化错误:', error);
    }
}

// 添加校准触发函数
function startCalibration() {
    if (gameState.calibrationStatus === '校准完成') return;
    
    console.log('开始校准...'); // 添加调试信息
    gameState.calibrationStatus = '校准中...';
    gameState.debugInfo = '请保持站立姿势2秒';
    updateGameState();
    console.log('校准状态已更新:', gameState.calibrationStatus); // 添加调试信息
    
    calibrationData = {
        samples: [],
        sampleCount: 30, // 2秒数据（假设30fps）
        keyPoints: {}
    };
}


function onPoseResults(results) {
    if (!results.poseLandmarks) return;

    const landmarks = results.poseLandmarks;
    console.log('检测到的关键点:', landmarks); // 添加调试信息
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
    
    // 检查关键点数量，判断是否为半身
    const minLandmarksForFullBody = 20; // 阈值可以调整
    if (landmarks.length < minLandmarksForFullBody) {
       // 如果是半身，则只使用上半身的关键点
       KEYPOINTS = {
          LEFT_SHOULDER: 11,
          RIGHT_SHOULDER: 12,
          LEFT_ELBOW: 13,
          RIGHT_ELBOW: 14
       };
    }

    // 校准逻辑
    console.log('当前校准状态:', gameState.calibrationStatus); // 添加调试信息
    if (gameState.calibrationStatus === '校准中') {
        if (calibrationData.samples.length < calibrationData.sampleCount) {
            calibrationData.samples.push(landmarks);
            gameState.debugInfo = `校准进度: ${Math.round(calibrationData.samples.length/calibrationData.sampleCount*100)}%`;
            updateGameState();
            console.log('校准进度:', calibrationData.samples.length, '/', calibrationData.sampleCount); // 添加调试信息
        } else {
            console.log('校准完成条件满足!'); // 添加调试信息
            // 计算基准值
            const baseValues = {};
            for (const kp in KEYPOINTS) {
                const values = calibrationData.samples.map(s => s[KEYPOINTS[kp]]);
                baseValues[kp] = {
                    x: average(values.map(v => v.x)),
                    y: average(values.map(v => v.y)),
                    z: average(values.map(v => v.z))
                };
            }
            calibrationData.baseValues = baseValues;
            gameState.calibrationStatus = '校准完成';
            gameState.debugInfo = '校准完成！';
            updateGameState();
            console.log('校准完成!'); // 添加调试信息
        }
        return;
    }

    // 运动检测逻辑（仅在校准完成后执行）
    if (gameState.calibrationStatus !== '校准完成') return;

    // 计算关节角度
    const getAngle = (a, b, c) => {
        if (!a || !b || !c) return 0;
        const ab = [b.x - a.x, b.y - a.y];
        const cb = [b.x - c.x, b.y - c.y];
        
        const dot = ab[0]*cb[0] + ab[1]*cb[1];
        const magAB = Math.sqrt(ab[0]**2 + ab[1]**2);
        const magCB = Math.sqrt(cb[0]**2 + cb[1]**2);
        
        return Math.acos(dot/(magAB*magCB)) * (180/Math.PI);
    };

    // 获取基准值
    const base = calibrationData.baseValues;
    
    let kneeAngleDiff = 0;
    let armMovement = 0;

    // 检查是否包含下半身关键点
    if (KEYPOINTS.LEFT_HIP) {
        // 计算下肢运动特征
        const leftKneeAngle = getAngle(
            landmarks[KEYPOINTS.LEFT_HIP],
            landmarks[KEYPOINTS.LEFT_KNEE],
            landmarks[KEYPOINTS.LEFT_ANKLE]
        );
        
        const rightKneeAngle = getAngle(
            landmarks[KEYPOINTS.RIGHT_HIP],
            landmarks[KEYPOINTS.RIGHT_KNEE],
            landmarks[KEYPOINTS.RIGHT_ANKLE]
        );
        kneeAngleDiff = Math.abs(leftKneeAngle - rightKneeAngle);
    }

    // 检查是否包含上肢关键点
    if (KEYPOINTS.LEFT_ELBOW) {
        // 计算上肢运动特征
        const leftArmMovement = Math.sqrt(
            (landmarks[KEYPOINTS.LEFT_ELBOW].x - base[KEYPOINTS.LEFT_ELBOW].x)**2 +
            (landmarks[KEYPOINTS.LEFT_ELBOW].y - base[KEYPOINTS.LEFT_ELBOW].y)**2
        );

        const rightArmMovement = Math.sqrt(
            (landmarks[KEYPOINTS.RIGHT_ELBOW].x - base[KEYPOINTS.RIGHT_ELBOW].x)**2 +
            (landmarks[KEYPOINTS.RIGHT_ELBOW].y - base[KEYPOINTS.RIGHT_ELBOW].y)**2
        );
        armMovement = (leftArmMovement + rightArmMovement) * 10;
    }

    // 运动强度计算
    let movementScore = kneeAngleDiff * 0.8 + armMovement * 0.2;
    
    // 更新运动缓冲区
    movementBuffer.push(movementScore);
    if (movementBuffer.length > 10) movementBuffer.shift(); // 增大缓冲区
    
    // 使用加权平均
    const weightedMovement = movementBuffer.reduce((acc, val, idx) => 
        acc + val * (idx + 1)/movementBuffer.length, 0) / 
        (movementBuffer.length * (movementBuffer.length + 1) / 2);

    // 动态阈值调整
    const baselineThreshold = 15; // 根据实际测试调整
    const dynamicThreshold = baselineThreshold * (1 + speed/maxSpeed);
    
    // 步态检测逻辑
    const now = Date.now();
    if (weightedMovement > dynamicThreshold) {
        if (!isRunning) consecutiveMovements++;
        
        if (consecutiveMovements >= 4) { // 需要连续4帧确认
            isRunning = true;
            targetSpeed = Math.min(maxSpeed, targetSpeed + 0.3);
            
            // 步数计数逻辑
            if (now - lastStepTime > 300) { // 最小步间隔300ms
                stepCount++;
                lastStepTime = now;
            }
        }
    } else {
        consecutiveMovements = Math.max(0, consecutiveMovements - 2);
        targetSpeed = Math.max(0, targetSpeed - 0.4);
    }

    // 更新游戏状态
    gameState.movementQuality = Math.min(100, weightedMovement / baselineThreshold * 100);
    gameState.currentSpeed = speed;
    gameState.stepCount = stepCount;
    updateGameState();
}


// 辅助函数：计算平均值
function average(arr) {
    return arr.reduce((a, b) => a + b, 0) / arr.length;
}

async function detectPose() {
    const video = document.getElementById('webcamView');
    if (video.readyState === 4) {
        console.log('正在检测姿势...'); // 添加调试信息
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
