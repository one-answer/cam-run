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
        const visibilityThreshold = 0.65;
        
        // 检查关键点可见性
        const checkVisibility = (points) => {
            return points.every(point => 
                landmarks[point] && 
                landmarks[point].visibility > visibilityThreshold
            );
        };

        // 检查躯干垂直度
        const checkTorsoVertical = () => {
            if (!landmarks[11] || !landmarks[12] || !landmarks[23] || !landmarks[24]) {
                return false;
            }

            const leftShoulderY = landmarks[11].y;
            const rightShoulderY = landmarks[12].y;
            const leftHipY = landmarks[23].y;
            const rightHipY = landmarks[24].y;

            // 计算躯干倾斜角度
            const torsoAngleLeft = Math.abs(Math.atan2(leftHipY - leftShoulderY, 0.001));
            const torsoAngleRight = Math.abs(Math.atan2(rightHipY - rightShoulderY, 0.001));
            const averageTorsoAngle = (torsoAngleLeft + torsoAngleRight) / 2;

            // 允许25度的前后倾斜
            return averageTorsoAngle > Math.PI/2 - Math.PI/7.2 && 
                   averageTorsoAngle < Math.PI/2 + Math.PI/7.2;
        };

        // 检查肩部水平
        const checkShoulderLevel = () => {
            if (!landmarks[11] || !landmarks[12]) return false;
            return Math.abs(landmarks[11].y - landmarks[12].y) < 0.15;
        };

        // 检查整体姿态
        const upperBodyVisible = checkVisibility([11, 12, 13, 14]);
        const lowerBodyVisible = checkVisibility([23, 24, 25, 26]);
        const torsoVertical = checkTorsoVertical();
        const shoulderLevel = checkShoulderLevel();

        return {
            isValid: upperBodyVisible && torsoVertical && shoulderLevel,
            upperBodyQuality: upperBodyVisible ? 1.0 : 0.0,
            lowerBodyQuality: lowerBodyVisible ? 1.0 : 0.0,
            postureQuality: (torsoVertical && shoulderLevel) ? 1.0 : 0.0
        };
    };

    // 计算运动强度和质量
    const calculateMovementQuality = () => {
        const currentIdx = window.poseHistory.timestamps.length - 1;
        if (currentIdx < 2) return { intensity: 0, quality: 0 };

        let totalIntensity = 0;
        let qualityScore = 0;
        let measurements = 0;

        // 计算关节运动
        const calculateJointMovement = (joint1Array, joint2Array) => {
            if (joint1Array.length < 2 || joint2Array.length < 2) return null;

            const current = {
                x: joint1Array[currentIdx].x - joint2Array[currentIdx].x,
                y: joint1Array[currentIdx].y - joint2Array[currentIdx].y,
                z: joint1Array[currentIdx].z - joint2Array[currentIdx].z
            };

            const previous = {
                x: joint1Array[currentIdx - 1].x - joint2Array[currentIdx - 1].x,
                y: joint1Array[currentIdx - 1].y - joint2Array[currentIdx - 1].y,
                z: joint1Array[currentIdx - 1].z - joint2Array[currentIdx - 1].z
            };

            const timeDelta = (window.poseHistory.timestamps[currentIdx] - 
                             window.poseHistory.timestamps[currentIdx - 1]) / 1000;

            return {
                velocity: {
                    x: (current.x - previous.x) / timeDelta,
                    y: (current.y - previous.y) / timeDelta,
                    z: (current.z - previous.z) / timeDelta
                },
                magnitude: Math.sqrt(
                    Math.pow(current.x - previous.x, 2) +
                    Math.pow(current.y - previous.y, 2) +
                    Math.pow(current.z - previous.z, 2)
                ) / timeDelta
            };
        };

        // 分析手臂运动
        const leftArmMovement = calculateJointMovement(
            window.poseHistory.leftElbow,
            window.poseHistory.leftShoulder
        );
        const rightArmMovement = calculateJointMovement(
            window.poseHistory.rightElbow,
            window.poseHistory.rightShoulder
        );

        // 分析腿部运动
        const leftLegMovement = calculateJointMovement(
            window.poseHistory.leftKnee,
            window.poseHistory.leftHip
        );
        const rightLegMovement = calculateJointMovement(
            window.poseHistory.rightKnee,
            window.poseHistory.rightHip
        );

        // 计算手臂协调性
        let armCoordination = 0;
        if (leftArmMovement && rightArmMovement) {
            // 检查手臂是否反向运动
            const oppositeMotion = leftArmMovement.velocity.y * rightArmMovement.velocity.y < 0;
            const magnitudeDiff = Math.abs(leftArmMovement.magnitude - rightArmMovement.magnitude);
            const magnitudeAvg = (leftArmMovement.magnitude + rightArmMovement.magnitude) / 2;
            
            // 评分标准：反向运动且幅度相近
            armCoordination = oppositeMotion ? 
                (1 - Math.min(1, magnitudeDiff / magnitudeAvg)) : 0.3;
        }

        // 计算腿部协调性
        let legCoordination = 0;
        if (leftLegMovement && rightLegMovement) {
            const oppositeMotion = leftLegMovement.velocity.y * rightLegMovement.velocity.y < 0;
            const magnitudeDiff = Math.abs(leftLegMovement.magnitude - rightLegMovement.magnitude);
            const magnitudeAvg = (leftLegMovement.magnitude + rightLegMovement.magnitude) / 2;
            
            legCoordination = oppositeMotion ? 
                (1 - Math.min(1, magnitudeDiff / magnitudeAvg)) : 0.3;
        }

        // 计算总体运动强度
        if (leftArmMovement) {
            totalIntensity += leftArmMovement.magnitude;
            measurements++;
        }
        if (rightArmMovement) {
            totalIntensity += rightArmMovement.magnitude;
            measurements++;
        }
        if (leftLegMovement) {
            totalIntensity += leftLegMovement.magnitude * 1.2; // 给腿部运动更高的权重
            measurements++;
        }
        if (rightLegMovement) {
            totalIntensity += rightLegMovement.magnitude * 1.2;
            measurements++;
        }

        // 计算平均强度
        const avgIntensity = measurements > 0 ? totalIntensity / measurements : 0;

        // 计算动作质量得分
        qualityScore = (armCoordination * 0.4 + legCoordination * 0.6) * 
                      Math.min(1, avgIntensity / 0.5);

        // 更新步态缓冲区
        window.poseHistory.stepBuffer.push(qualityScore);
        if (window.poseHistory.stepBuffer.length > window.poseHistory.stepBufferSize) {
            window.poseHistory.stepBuffer.shift();
        }

        // 计算平滑后的质量得分
        const smoothedQuality = window.poseHistory.stepBuffer.reduce((a, b) => a + b, 0) / 
                              window.poseHistory.stepBuffer.length;

        return {
            intensity: avgIntensity,
            quality: smoothedQuality,
            armCoordination,
            legCoordination
        };
    };

    // 检查姿势状态
    const poseStatus = checkRunningPose(results.poseLandmarks);
    
    if (!poseStatus.isValid) {
        // 姿势无效时的处理
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
        
        // 设置详细的调试信息
        let invalidReason = [];
        if (poseStatus.upperBodyQuality < 0.5) invalidReason.push('上半身未完全可见');
        if (poseStatus.lowerBodyQuality < 0.5) invalidReason.push('下半身未完全可见');
        if (poseStatus.postureQuality < 0.5) invalidReason.push('请保持正确站姿');
        
        gameState.debugInfo = `姿势检测: ${invalidReason.join(', ')}`;
        updateGameState();
        return;
    }

    // 计算运动质量和强度
    const movementAnalysis = calculateMovementQuality();
    
    // 动态调整阈值
    const baseThreshold = 0.15;
    const speedFactor = speed / maxSpeed;
    const dynamicThreshold = baseThreshold * (1 + speedFactor * 0.5);
    
    // 更新运动状态
    if (movementAnalysis.intensity > dynamicThreshold && 
        movementAnalysis.quality > 0.4) {
        
        consecutiveMovements++;
        
        if (consecutiveMovements >= 2) {
            isRunning = true;
            
            // 计算新的目标速度
            const qualityFactor = movementAnalysis.quality;
            const intensityFactor = Math.min(1.5, movementAnalysis.intensity / dynamicThreshold);
            
            // 综合评分
            const performanceScore = (qualityFactor * 0.6 + intensityFactor * 0.4);
            targetSpeed = Math.min(maxSpeed, maxSpeed * performanceScore);
            
            // 更新步数
            const currentTime = now;
            if (currentTime - lastStepTime > 200) {
                stepCount++;
                lastStepTime = currentTime;
            }
        }
    } else if (movementAnalysis.intensity < dynamicThreshold * 0.3) {
        // 快速停止
        consecutiveMovements = 0;
        isRunning = false;
        targetSpeed = 0;
        speed = Math.max(0, speed - (speed * 0.15 + 0.5));
    } else {
        // 渐进式减速
        consecutiveMovements = Math.max(0, consecutiveMovements - 1);
        if (consecutiveMovements === 0) {
            isRunning = false;
        }
        targetSpeed = Math.max(0, targetSpeed - 0.2);
    }

    // 更新游戏状态
    gameState.movementQuality = Math.min(100, movementAnalysis.quality * 100);
    gameState.currentSpeed = speed;
    gameState.stepCount = stepCount;
    
    // 详细的调试信息
    gameState.debugInfo = `运动评分: ${(movementAnalysis.quality * 100).toFixed(1)}%
        手臂协调: ${(movementAnalysis.armCoordination * 100).toFixed(1)}%
        腿部协调: ${(movementAnalysis.legCoordination * 100).toFixed(1)}%
        强度: ${movementAnalysis.intensity.toFixed(2)}`;
    
    updateGameState();
}
