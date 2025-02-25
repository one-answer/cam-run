class ShadowRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.initialized = false;
        this.SHADOW_OPACITY = 0.8;
        this.SHADOW_BLUR = 6;
    }

    init() {
        if (this.initialized) return;
        
        // 主画布
        this.canvas = document.getElementById('shadowCanvas');
        if (!this.canvas) {
            console.error('找不到阴影画布元素');
            return;
        }
        this.ctx = this.canvas.getContext('2d');
        this.canvas.width = 320;
        this.canvas.height = 240;

        // 离屏画布
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        this.initialized = true;
    }

    clear() {
        if (!this.ctx || !this.canvas) return;
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
    }

    render(landmarks) {
        if (!this.initialized) this.init();
        if (!this.ctx || !landmarks) return;

        this.clear();

        // 在离屏画布上绘制
        const ctx = this.offscreenCtx;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-ctx.canvas.width, 0);

        // 设置模糊效果
        ctx.filter = `blur(${this.SHADOW_BLUR}px)`;

        // 绘制身体各部分
        this.drawTorso(ctx, landmarks);  // 躯干
        this.drawLimbs(ctx, landmarks);  // 四肢
        this.drawHead(ctx, landmarks);   // 头部

        ctx.restore();

        // 将离屏画布的内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.4;  // 整体透明度
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }

    drawTorso(ctx, landmarks) {
        const leftShoulder = landmarks[11];
        const rightShoulder = landmarks[12];
        const leftHip = landmarks[23];
        const rightHip = landmarks[24];

        if (!leftShoulder || !rightShoulder || !leftHip || !rightHip) return;

        // 计算躯干中心点
        const centerX = (leftShoulder.x + rightShoulder.x + leftHip.x + rightHip.x) / 4 * ctx.canvas.width;
        const centerY = (leftShoulder.y + rightShoulder.y + leftHip.y + rightHip.y) / 4 * ctx.canvas.height;
        
        // 计算躯干尺寸
        const torsoWidth = Math.abs(leftShoulder.x - rightShoulder.x) * ctx.canvas.width;
        const torsoHeight = Math.abs(leftShoulder.y - leftHip.y) * ctx.canvas.height;
        const radius = Math.max(torsoWidth, torsoHeight) / 1.5;

        // 创建径向渐变
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, radius
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // 绘制躯干椭圆
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, radius, radius * 0.6, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }

    drawLimbs(ctx, landmarks) {
        // 绘制手臂
        this.drawLimb(ctx, landmarks[11], landmarks[13], landmarks[15]); // 左臂
        this.drawLimb(ctx, landmarks[12], landmarks[14], landmarks[16]); // 右臂

        // 绘制腿部
        this.drawLimb(ctx, landmarks[23], landmarks[25], landmarks[27]); // 左腿
        this.drawLimb(ctx, landmarks[24], landmarks[26], landmarks[28]); // 右腿
    }

    drawLimb(ctx, start, mid, end) {
        if (!start || !mid || !end) return;

        // 转换坐标
        const points = [start, mid, end].map(p => ({
            x: p.x * ctx.canvas.width,
            y: p.y * ctx.canvas.height
        }));

        // 创建渐变
        const gradient = ctx.createLinearGradient(
            points[0].x, points[0].y,
            points[2].x, points[2].y
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, `rgba(0, 0, 0, ${this.SHADOW_OPACITY * 0.5})`);

        // 绘制连接线
        ctx.beginPath();
        ctx.moveTo(points[0].x, points[0].y);
        
        // 使用二次贝塞尔曲线创建平滑的连接
        const cp1x = (points[0].x + points[1].x) / 2;
        const cp1y = (points[0].y + points[1].y) / 2;
        const cp2x = (points[1].x + points[2].x) / 2;
        const cp2y = (points[1].y + points[2].y) / 2;

        ctx.quadraticCurveTo(points[1].x, points[1].y, cp2x, cp2y);
        ctx.lineTo(points[2].x, points[2].y);

        // 设置线条样式
        ctx.lineWidth = 15;  // 加粗线条
        ctx.lineCap = 'round';
        ctx.strokeStyle = gradient;
        ctx.stroke();

        // 在关节处添加圆形
        [points[0], points[1], points[2]].forEach(point => {
            ctx.beginPath();
            ctx.arc(point.x, point.y, 8, 0, Math.PI * 2);
            ctx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
            ctx.fill();
        });
    }

    drawHead(ctx, landmarks) {
        const nose = landmarks[0];
        const leftEye = landmarks[2];
        const rightEye = landmarks[5];

        if (!nose || !leftEye || !rightEye) return;

        // 计算头部大小
        const eyeDistance = Math.sqrt(
            Math.pow((rightEye.x - leftEye.x) * ctx.canvas.width, 2) +
            Math.pow((rightEye.y - leftEye.y) * ctx.canvas.height, 2)
        );
        const headRadius = eyeDistance * 2;  // 增大头部大小

        // 创建径向渐变
        const centerX = nose.x * ctx.canvas.width;
        const centerY = nose.y * ctx.canvas.height;
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, headRadius
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');

        // 绘制头部
        ctx.beginPath();
        ctx.arc(centerX, centerY, headRadius, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
    }
}

export const shadowRenderer = new ShadowRenderer();

// 优化运动检测和分析
function onPoseResults(results) {
    if (!results.poseLandmarks) {
        return;
    }

    // 更新人物阴影
    const video = document.getElementById('webcamView');
    updateShadow(video, results);
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
            leftKnee: [],
            rightKnee: [],
            leftAnkle: [],
            rightAnkle: [],
            lastUpdateTime: now,
            lastArmSwingPhase: 'neutral',
            lastLegPhase: 'neutral',
            stepBuffer: [], // 用于存储步态周期数据
            stepBufferSize: 10,
            lastStepQuality: 1.0
        };
    }

    // 更新历史记录，扩展时间窗口到500ms以更好地捕捉完整动作周期
    const historyWindow = 500; 
    window.poseHistory.timestamps.push(now);
    
    // 更新所有关键点位置
    const updateKeypoint = (index, array) => {
        if (results.poseLandmarks[index]) {
            array.push({
                x: results.poseLandmarks[index].x,
                y: results.poseLandmarks[index].y,
                z: results.poseLandmarks[index].z || 0,
                visibility: results.poseLandmarks[index].visibility || 0
            });
        } else {
            array.push(null);
        }
    };

    // 更新所有关键点
    updateKeypoint(11, window.poseHistory.leftShoulder);
    updateKeypoint(13, window.poseHistory.leftElbow);
    updateKeypoint(23, window.poseHistory.leftHip);
    updateKeypoint(25, window.poseHistory.leftKnee);
    updateKeypoint(27, window.poseHistory.leftAnkle);
    updateKeypoint(12, window.poseHistory.rightShoulder);
    updateKeypoint(14, window.poseHistory.rightElbow);
    updateKeypoint(24, window.poseHistory.rightHip);
    updateKeypoint(26, window.poseHistory.rightKnee);
    updateKeypoint(28, window.poseHistory.rightAnkle);

    // 维护历史窗口大小
    while (now - window.poseHistory.timestamps[0] > historyWindow) {
        window.poseHistory.timestamps.shift();
        window.poseHistory.leftElbow.shift();
        window.poseHistory.leftShoulder.shift();
        window.poseHistory.rightElbow.shift();
        window.poseHistory.rightShoulder.shift();
        window.poseHistory.leftHip.shift();
        window.poseHistory.rightHip.shift();
        window.poseHistory.leftKnee.shift();
        window.poseHistory.rightKnee.shift();
        window.poseHistory.leftAnkle.shift();
        window.poseHistory.rightAnkle.shift();
    }

    // 增强型姿势检查函数
    const checkRunningPose = (landmarks) => {
        // 检查关键点的可见性
        const upperBodyVisible = checkVisibility(landmarks, [11, 12]); // 肩膀
        const armsVisible = checkVisibility(landmarks, [13, 14]); // 手肘
        const lowerBodyVisible = checkVisibility(landmarks, [23, 24, 25, 26]); // 髋部和膝盖
        const leftLegVisible = checkVisibility(landmarks, [23, 25, 27]); // 左腿完整链
        const rightLegVisible = checkVisibility(landmarks, [24, 26, 28]); // 右腿完整链
        
        // 检查躯干垂直度
        let torsoAngle = 0;
        if (upperBodyVisible) {
            if (lowerBodyVisible) {
                const leftTorsoAngle = Math.abs(Math.atan2(landmarks[23].y - landmarks[11].y, landmarks[23].x - landmarks[11].x));
                const rightTorsoAngle = Math.abs(Math.atan2(landmarks[24].y - landmarks[12].y, landmarks[24].x - landmarks[12].x));
                torsoAngle = (leftTorsoAngle + rightTorsoAngle) / 2;
            } else {
                // 仅上半身时，通过肩膀的水平度来判断姿势
                torsoAngle = Math.abs(Math.atan2(landmarks[12].y - landmarks[11].y, landmarks[12].x - landmarks[11].x));
            }
        }
        
        // 躯干必须接近垂直（允许20度误差）
        const isUprightPose = Math.abs(torsoAngle - Math.PI/2) < Math.PI/9;
        
        // 检查是否有足够的深度变化（z坐标）
        const hasDepth = landmarks.some(landmark => landmark && landmark.z && Math.abs(landmark.z) > 0.1);
        
        // 判断检测模式：全身模式或上半身模式
        const isFullBodyMode = lowerBodyVisible && (leftLegVisible || rightLegVisible);
        const isUpperBodyMode = upperBodyVisible && armsVisible;
        
        // 综合判定条件
        return {
            isValid: (isFullBodyMode || isUpperBodyMode) && isUprightPose && hasDepth,
            hasLeftLeg: leftLegVisible,
            hasRightLeg: rightLegVisible,
            hasUpperBody: upperBodyVisible,
            hasArms: armsVisible,
            hasLowerBody: lowerBodyVisible,
            isFullBodyMode: isFullBodyMode,
            isUpperBodyMode: isUpperBodyMode,
            torsoAngle: torsoAngle
        };
    };

    // 计算关键点的速度和加速度
    const calculatePointVelocity = (point, prevPoint, timeDelta) => {
        if (!point || !prevPoint || timeDelta === 0) return { x: 0, y: 0 };
        return {
            x: (point.x - prevPoint.x) / timeDelta,
            y: (point.y - prevPoint.y) / timeDelta
        };
    };

    const calculateVelocityMagnitude = (velocity) => {
        return Math.sqrt(velocity.x * velocity.x + velocity.y * velocity.y);
    };

    // 分析关键点的运动
    let velocities = {
        leftAnkle: { x: 0, y: 0 },
        rightAnkle: { x: 0, y: 0 },
        leftKnee: { x: 0, y: 0 },
        rightKnee: { x: 0, y: 0 },
        leftHip: { x: 0, y: 0 },
        rightHip: { x: 0, y: 0 },
        leftElbow: { x: 0, y: 0 },
        rightElbow: { x: 0, y: 0 }
    };

    // 计算各个关键点的速度
    if (window.poseHistory.timestamps.length >= 2) {
        const currentIdx = window.poseHistory.timestamps.length - 1;
        const prevIdx = currentIdx - 1;
        const timeDelta = (window.poseHistory.timestamps[currentIdx] - window.poseHistory.timestamps[prevIdx]) / 1000;

        if (checkRunningPose(results.poseLandmarks).hasArms) {
            velocities.leftElbow = calculatePointVelocity(
                window.poseHistory.leftElbow[currentIdx],
                window.poseHistory.leftElbow[prevIdx],
                timeDelta
            );
            velocities.rightElbow = calculatePointVelocity(
                window.poseHistory.rightElbow[currentIdx],
                window.poseHistory.rightElbow[prevIdx],
                timeDelta
            );
        }

        if (checkRunningPose(results.poseLandmarks).hasLowerBody) {
            velocities.leftAnkle = calculatePointVelocity(
                window.poseHistory.leftAnkle[currentIdx],
                window.poseHistory.leftAnkle[prevIdx],
                timeDelta
            );
            velocities.rightAnkle = calculatePointVelocity(
                window.poseHistory.rightAnkle[currentIdx],
                window.poseHistory.rightAnkle[prevIdx],
                timeDelta
            );
            velocities.leftKnee = calculatePointVelocity(
                window.poseHistory.leftKnee[currentIdx],
                window.poseHistory.leftKnee[prevIdx],
                timeDelta
            );
            velocities.rightKnee = calculatePointVelocity(
                window.poseHistory.rightKnee[currentIdx],
                window.poseHistory.rightKnee[prevIdx],
                timeDelta
            );
        }
    }

    // 计算运动强度
    let movementIntensities = {
        arms: 0,
        legs: 0
    };

    // 计算手臂运动强度
    if (checkRunningPose(results.poseLandmarks).hasArms) {
        const leftElbowSpeed = calculateVelocityMagnitude(velocities.leftElbow);
        const rightElbowSpeed = calculateVelocityMagnitude(velocities.rightElbow);
        movementIntensities.arms = (leftElbowSpeed + rightElbowSpeed) / 2;
    }

    // 计算腿部运动强度
    if (checkRunningPose(results.poseLandmarks).hasLowerBody) {
        const leftLegSpeed = (
            calculateVelocityMagnitude(velocities.leftAnkle) +
            calculateVelocityMagnitude(velocities.leftKnee)
        ) / 2;
        const rightLegSpeed = (
            calculateVelocityMagnitude(velocities.rightAnkle) +
            calculateVelocityMagnitude(velocities.rightKnee)
        ) / 2;
        movementIntensities.legs = (leftLegSpeed + rightLegSpeed) / 2;
    }

    // 分析步态和协调性
    let gaitQuality = 0;
    let coordinationQuality = 0;

    if (checkRunningPose(results.poseLandmarks).hasArms) {
        // 检查手臂交替
        const currentIdx = window.poseHistory.leftElbow.length - 1;
        if (window.poseHistory.leftElbow[currentIdx] && window.poseHistory.rightElbow[currentIdx]) {
            const leftArmY = window.poseHistory.leftElbow[currentIdx].y;
            const rightArmY = window.poseHistory.rightElbow[currentIdx].y;
            
            // 检查手臂交替摆动
            if (Math.abs(leftArmY - rightArmY) > 0.2) { // 提高差异要求
                const newPhase = leftArmY > rightArmY ? 'left_up' : 'right_up';
                if (window.poseHistory.lastArmSwingPhase !== newPhase) {
                    coordinationQuality = 1.0;
                    window.poseHistory.lastArmSwingPhase = newPhase;
                }
            }
        }
    }

    if (checkRunningPose(results.poseLandmarks).hasLowerBody) {
        // 分析腿部运动模式
        const leftAnkleSpeed = calculateVelocityMagnitude(velocities.leftAnkle);
        const rightAnkleSpeed = calculateVelocityMagnitude(velocities.rightAnkle);
        const speedDiff = Math.abs(leftAnkleSpeed - rightAnkleSpeed);
        
        // 检查腿部交替
        if (speedDiff > 0.1) {
            gaitQuality = Math.min(1.0, speedDiff / 0.3);
        }
    }

    // 计算综合运动得分
    const calculateMovementScore = () => {
        // 手臂运动得分
        const armScore = Math.min(1.0, movementIntensities.arms / 0.8); // 提高运动强度要求
        const legScore = Math.min(1.0, movementIntensities.legs / 0.8);
        
        // 根据可见的部位调整权重
        let weights = { arms: 0, legs: 0, coordination: 0 };
        
        if (checkRunningPose(results.poseLandmarks).isFullBodyMode) {
            weights = { arms: 0.3, legs: 0.5, coordination: 0.2 }; // 增加腿部权重
        } else if (checkRunningPose(results.poseLandmarks).hasArms) {
            weights = { arms: 0.7, legs: 0, coordination: 0.3 }; // 提高上半身要求
        } else if (checkRunningPose(results.poseLandmarks).hasLowerBody) {
            weights = { arms: 0, legs: 0.8, coordination: 0.2 };
        }

        // 计算基础得分
        const baseScore = (
            armScore * weights.arms +
            legScore * weights.legs +
            Math.max(coordinationQuality, gaitQuality) * weights.coordination
        );

        // 应用非线性映射，使得高分更难达到
        return Math.pow(baseScore, 1.5) * 0.7; // 使用指数映射并降低整体强度
    };

    const movementScore = calculateMovementScore();

    // 时间和速度相关的全局变量（确保在函数外部定义）
    let lastTimeStamp = 0;
    let lastSpeed = 0;
    let currentSpeed = 0;
    let speedBuffer = [];
    const maxSpeedBufferSize = 15; // 增加缓冲区大小
    const maxTimeStep = 0.1; // 最大时间步长
    const baseAcceleration = 2.0; // 基础加速度 (m/s²)
    const baseDeceleration = 3.0; // 基础减速度 (m/s²)
    const maxSpeedChangePerSecond = 3.0; // 每秒最大速度变化

    // 获取当前时间差
    const currentTime = performance.now();
    const secondsPassed = Math.min((currentTime - lastTimeStamp) / 1000, maxTimeStep);
    lastTimeStamp = currentTime;

    // 计算运动强度（考虑频率和幅度）
    const calculateMovementIntensity = () => {
        // 计算运动频率得分 (理想频率范围：1.5-3Hz)
        const frequency = calculateMovementFrequency();
        const frequencyScore = Math.min(1.0, Math.max(0, 
            frequency < 1.2 ? 0 : // 低于1.2Hz不计分
            frequency > 3 ? 1 - (frequency - 3) / 1.5 : 
            (frequency - 1.2) / 1.8
        ));

        // 计算运动幅度得分
        const armAmplitude = Math.min(1.0, movementIntensities.arms / 2.5);
        const legAmplitude = Math.min(1.0, movementIntensities.legs / 2.5);
        const amplitudeScore = Math.pow((armAmplitude + legAmplitude) / 2, 1.2);
        
        // 综合得分，频率和幅度缺一不可
        return Math.pow(frequencyScore * amplitudeScore, 1.1); // 使用更温和的非线性映射
    };

    const calculateMovementFrequency = () => {
        if (window.poseHistory.timestamps.length < 2) return 0;
        
        // 计算平均运动周期
        let totalDuration = 0;
        for (let i = 1; i < window.poseHistory.timestamps.length; i++) {
            totalDuration += window.poseHistory.timestamps[i] - window.poseHistory.timestamps[i - 1];
        }
        const averageCycleTime = totalDuration / (window.poseHistory.timestamps.length - 1);
        
        // 计算频率（Hz）
        return 1000 / averageCycleTime;
    };

    // 更平滑的速度映射
    const mapToRunningSpeed = (intensity) => {
        // 使用更陡峭的曲线映射运动强度到目标速度
        const minSpeed = 0.5; // 降低最小速度
        const maxSpeed = 8.0;
        const speedRange = maxSpeed - minSpeed;
        
        // 使用更陡峭的曲线，让低强度运动更难达到高速
        const mappedIntensity = Math.pow(intensity, 2.5);
        
        // 分段映射，让速度增长更加合理
        if (mappedIntensity < 0.3) {
            return minSpeed + speedRange * 0.2 * (mappedIntensity / 0.3);
        } else if (mappedIntensity < 0.6) {
            return minSpeed + speedRange * (0.2 + 0.3 * ((mappedIntensity - 0.3) / 0.3));
        } else if (mappedIntensity < 0.8) {
            return minSpeed + speedRange * (0.5 + 0.3 * ((mappedIntensity - 0.6) / 0.2));
        } else {
            return minSpeed + speedRange * (0.8 + 0.2 * ((mappedIntensity - 0.8) / 0.2));
        }
    };

    // 更新速度时增加变化限制
    const updateSpeed = () => {
        const movementIntensity = calculateMovementIntensity();
        let targetSpeed = 0;

        // 提高运动检测的门槛
        if (movementIntensity > 0.25 && consecutiveMovements >= 15) {
            targetSpeed = mapToRunningSpeed(movementIntensity);
            
            // 应用模式系数，降低上半身模式的速度系数
            const modeSpeedFactor = poseStatus.isFullBodyMode ? 1.0 : 0.6;
            targetSpeed *= modeSpeedFactor;

            // 限制最大速度
            targetSpeed = Math.min(maxSpeed, targetSpeed);
        }

        // 计算实际速度变化
        const speedChangeLimit = 0.3; // 降低每秒最大速度变化
        const currentIntensity = Math.max(0.1, movementIntensity); // 确保有最小强度值

        if (targetSpeed > currentSpeed) {
            // 基于当前运动强度调整加速度，使用更平缓的加速曲线
            const actualAcceleration = baseAcceleration * Math.pow(currentIntensity, 1.8);
            const speedIncrease = Math.min(
                targetSpeed - currentSpeed,
                actualAcceleration * secondsPassed,
                speedChangeLimit * secondsPassed
            );
            currentSpeed += speedIncrease;
        } else {
            // 更平缓的减速
            const speedDecrease = Math.min(
                currentSpeed - targetSpeed,
                baseDeceleration * secondsPassed,
                speedChangeLimit * secondsPassed
            );
            currentSpeed = Math.max(targetSpeed, currentSpeed - speedDecrease);
        }

        // 更新速度缓冲区
        speedBuffer.push(currentSpeed);
        if (speedBuffer.length > maxSpeedBufferSize) {
            speedBuffer.shift();
        }

        // 使用加权移动平均来平滑速度
        let totalWeight = 0;
        let smoothedSpeed = 0;
        for (let i = 0; i < speedBuffer.length; i++) {
            const weight = (i + 1) / speedBuffer.length; // 更新的速度有更高的权重
            smoothedSpeed += speedBuffer[i] * weight;
            totalWeight += weight;
        }
        smoothedSpeed /= totalWeight;
        
        // 确保速度在有效范围内
        return Math.max(0, Math.min(maxSpeed, smoothedSpeed));
    };

    // 更新当前速度
    speed = updateSpeed();

    // 更新游戏状态
    if (speed > 0.1) {
        isRunning = true;
    } else {
        consecutiveMovements = Math.max(0, consecutiveMovements - 1);
        if (consecutiveMovements === 0) {
            isRunning = false;
            speedBuffer = []; // 清空速度缓冲区
        }
    }

    // 更新游戏状态
    gameState.movementQuality = Math.min(100, weightedScore * 100);
    gameState.currentSpeed = speed;
    gameState.stepCount = stepCount;
    gameState.debugInfo = `${checkRunningPose(results.poseLandmarks).isFullBodyMode ? '全身模式' : '上半身模式'} - 运动强度: ${weightedScore.toFixed(3)}, 阈值: ${baselineThreshold.toFixed(3)}, 协调性: ${coordinationQuality.toFixed(2)}`;
    updateGameState();
}
