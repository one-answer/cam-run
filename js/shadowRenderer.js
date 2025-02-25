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

    // 计算运动强度
    let totalIntensity = 0;
    let validMeasurements = 0;
    let movementQuality = 0;

    // 检查姿势是否有效
    const poseStatus = checkRunningPose(results.poseLandmarks);
    
    if (!poseStatus.isValid) {
        // 如果姿势无效，直接停止
        consecutiveMovements = 0;
        if (isRunning) {
            isRunning = false;
        }
        targetSpeed = 0;
        speed = Math.max(0, speed - 1.5);
        
        // 更新状态
        gameState.movementQuality = 0;
        gameState.currentSpeed = speed;
        gameState.stepCount = stepCount;
        
        // 设置具体的失败原因
        let invalidReason = '';
        if (!poseStatus.hasUpperBody) {
            invalidReason = '需要看到肩部';
        } else if (!poseStatus.hasArms && !poseStatus.hasLowerBody) {
            invalidReason = '需要看到手臂或下半身';
        } else {
            invalidReason = '请保持正确的姿势';
        }
        gameState.debugInfo = `无效的运动姿势 (${invalidReason})`;
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
    let armSwingCoordination = 0;
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

    // 设置阈值（根据检测模式调整）
    const baselineThreshold = poseStatus.isFullBodyMode ? 0.15 : 0.12;
    const noiseThreshold = 0.05;
    const dynamicThreshold = baselineThreshold * (1 + speed/maxSpeed * 0.5);
    
    // 步态检测逻辑
    if (maxMovement > dynamicThreshold && maxMovement > noiseThreshold) {
        if (!isRunning) consecutiveMovements++;
        
        if (consecutiveMovements >= 2) {
            isRunning = true;
            
            // 计算步频（步数/秒）
            const currentTime = now;
            const stepInterval = currentTime - lastStepTime;
            if (stepInterval > 200) { // 最小步频间隔200ms
                stepCount++;
                
                // 计算实时步频
                const stepsPerSecond = 1000 / stepInterval;
                // 正常跑步步频范围约为2.3-3.5步/秒
                const normalizedStepRate = Math.min(Math.max(stepsPerSecond, 1.5), 4.0);
                
                // 根据步频和动作强度计算目标速度
                const stepRateFactor = (normalizedStepRate - 1.5) / 2.5; // 归一化到0-1范围
                const intensityFactor = Math.min(1.5, (maxMovement - dynamicThreshold) / dynamicThreshold);
                
                // 综合考虑步频和动作强度
                const speedFactor = (stepRateFactor * 0.7 + intensityFactor * 0.3);
                // 上半身模式时给予更高的速度系数
                const modeSpeedFactor = poseStatus.isFullBodyMode ? 1.0 : 1.3;
                targetSpeed = Math.min(maxSpeed, maxSpeed * speedFactor * modeSpeedFactor);
                
                lastStepTime = currentTime;
            }
        }
    } else if (maxMovement <= noiseThreshold) {
        consecutiveMovements = 0;
        if (isRunning) {
            isRunning = false;
        }
        targetSpeed = 0;
        // 使用更平滑的减速曲线
        const decelRate = speed * 0.15 + 0.5; // 速度越快，减速越快
        speed = Math.max(0, speed - decelRate);
    } else {
        consecutiveMovements = Math.max(0, consecutiveMovements - 1);
        if (consecutiveMovements === 0 && isRunning) {
            isRunning = false;
        }
        // 更平滑的减速
        targetSpeed = Math.max(0, targetSpeed - 0.2);
    }

    // 更新游戏状态
    gameState.movementQuality = Math.min(100, maxMovement / baselineThreshold * 100);
    gameState.currentSpeed = speed;
    gameState.stepCount = stepCount;
    gameState.debugInfo = `${poseStatus.isFullBodyMode ? '全身模式' : '上半身模式'} - 运动强度: ${maxMovement.toFixed(3)}, 阈值: ${dynamicThreshold.toFixed(3)}, 协调性: ${armSwingCoordination.toFixed(2)}`;
    updateGameState();
}
