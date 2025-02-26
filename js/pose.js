import { renderer } from './renderer.js';
import { gameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

class PoseDetector {
    constructor() {
        this.detector = null;
        this.video = null;
        this.isRunning = false;
        this.lastPoseTime = 0;
        this.positionHistory = null;
        this.lastScore = null;
        this.currentArmPhase = 'neutral'; // 新增：当前手臂相位
    }

    async init() {
        // 初始化视频元素
        this.video = document.getElementById('webcamView');
        if (!this.video) {
            throw new Error('找不到视频元素');
        }

        // 等待 MediaPipe 加载完成
        await new Promise(resolve => {
            if (window.Pose) {
                resolve();
            } else {
                window.addEventListener('load', resolve);
            }
        });

        // 初始化姿势检测器
        this.detector = new window.Pose({
            locateFile: (file) => {
                return `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`;
            }
        });

        this.detector.setOptions({
            modelComplexity: 0,
            smoothLandmarks: true,
            minDetectionConfidence: 0.5,  // 降低检测置信度要求
            minTrackingConfidence: 0.5    // 降低跟踪置信度要求
        });

        // 设置结果回调
        this.detector.onResults((results) => this.onPoseResults(results));
        
        // 为全局访问设置当前手臂相位
        window.currentArmPhase = 'neutral';
    }

    async startDetection() {
        if (!this.detector || !this.video) return;
        
        this.isRunning = true;
        while (this.isRunning) {
            try {
                await this.detector.send({image: this.video});
            } catch (error) {
                console.error('姿势检测错误:', error);
                gameState.setState({ debugInfo: '姿势检测错误' });
            }
            // 降低检测间隔到16ms (约60fps)
            await new Promise(resolve => setTimeout(resolve, 16));
        }
    }

    stop() {
        this.isRunning = false;
    }

    onPoseResults(results) {
        if (!results || !results.poseLandmarks) {
            return;
        }

        try {
            // 更新骨骼和阴影
            renderer.updateShadow(this.video, results);

            // 分析姿势
            this.analyzePose(results);
        } catch (error) {
            console.error('处理姿势结果错误:', error);
            gameState.setState({ debugInfo: '处理姿势结果错误' });
        }
    }

    analyzePose(results) {
        const now = performance.now();
        const timeDelta = (now - this.lastPoseTime) / 1000; // 转换为秒
        if (timeDelta < 0.016) { // 约60fps
            return;
        }
        this.lastPoseTime = now;

        const landmarks = results.poseLandmarks;
        
        // 检查关键点可见性
        const visibilityThreshold = 0.5;
        const checkVisibility = (points) => {
            return points.every(point => 
                landmarks[point] && 
                landmarks[point].visibility > visibilityThreshold
            );
        };

        // 分别检查上半身和下半身的关键点
        const upperBodyPoints = [11, 12, 13, 14]; // 肩膀和手肘
        const lowerBodyPoints = [23, 24, 25, 26]; // 髋部和膝盖
        const upperBodyVisible = checkVisibility(upperBodyPoints);
        const lowerBodyVisible = checkVisibility(lowerBodyPoints);

        // 检查手臂和腿部的完整性
        const leftArmComplete = checkVisibility([11, 13, 15]); // 左肩到左手
        const rightArmComplete = checkVisibility([12, 14, 16]); // 右肩到右手
        const leftLegComplete = checkVisibility([23, 25, 27]); // 左髋到左脚
        const rightLegComplete = checkVisibility([24, 26, 28]); // 右髋到右脚

        // 确定当前检测模式
        const detectionMode = {
            isUpperBody: upperBodyVisible && (leftArmComplete || rightArmComplete),
            isLowerBody: lowerBodyVisible && (leftLegComplete || rightLegComplete),
            isFullBody: upperBodyVisible && lowerBodyVisible
        };

        // 如果没有足够的关键点可见，则停止检测
        if (!detectionMode.isUpperBody && !detectionMode.isLowerBody) {
            gameState.setState({ 
                currentSpeed: 0,
                movementQuality: 0,
                debugInfo: '未检测到有效姿势'
            });
            return;
        }

        // 初始化历史记录
        if (!this.positionHistory) {
            this.positionHistory = {
                leftArm: [],
                rightArm: [],
                leftLeg: [],
                rightLeg: []
            };
        }

        let velocityScore = 0;
        let totalDetectedParts = 0;
        let coordinationScore = 0;

        // 分析手臂运动
        if (detectionMode.isUpperBody) {
            // 获取手臂关键点的当前位置
            const leftArm = {
                shoulder: landmarks[11],
                elbow: landmarks[13],
                wrist: landmarks[15]
            };
            const rightArm = {
                shoulder: landmarks[12],
                elbow: landmarks[14],
                wrist: landmarks[16]
            };

            // 计算手臂的运动速度
            const leftArmVelocity = this.calculateVelocity(leftArm.wrist, this.positionHistory.leftArm[0]?.wrist, timeDelta);
            const rightArmVelocity = this.calculateVelocity(rightArm.wrist, this.positionHistory.rightArm[0]?.wrist, timeDelta);

            // 更新历史记录
            this.positionHistory.leftArm.unshift(leftArm);
            this.positionHistory.rightArm.unshift(rightArm);
            if (this.positionHistory.leftArm.length > 5) {
                this.positionHistory.leftArm.pop();
                this.positionHistory.rightArm.pop();
            }

            // 计算手臂摆动的速度分数
            const armVelocityScore = (
                Math.abs(leftArmVelocity.y) + 
                Math.abs(rightArmVelocity.y) + 
                Math.abs(leftArmVelocity.x) * 0.5 + 
                Math.abs(rightArmVelocity.x) * 0.5
            ) / 2;
            
            // 检查手臂协调性
            if (leftArmComplete && rightArmComplete) {
                const leftArmY = leftArm.wrist.y;
                const rightArmY = rightArm.wrist.y;
                if (Math.abs(leftArmY - rightArmY) > 0.15) {
                    coordinationScore = 1.0;
                }
            }
            
            velocityScore += armVelocityScore * (detectionMode.isFullBody ? 0.6 : 1.0);
            totalDetectedParts++;
            
            // 新增：检测手臂相位，用于步数计算
            this.detectAndUpdateArmPhase(leftArm, rightArm);
        }

        // 分析腿部运动
        if (detectionMode.isLowerBody) {
            // 获取腿部关键点的当前位置
            const leftLeg = {
                hip: landmarks[23],
                knee: landmarks[25],
                ankle: landmarks[27]
            };
            const rightLeg = {
                hip: landmarks[24],
                knee: landmarks[26],
                ankle: landmarks[28]
            };

            // 计算腿部的运动速度
            const leftLegVelocity = this.calculateVelocity(leftLeg.knee, this.positionHistory.leftLeg[0]?.knee, timeDelta);
            const rightLegVelocity = this.calculateVelocity(rightLeg.knee, this.positionHistory.rightLeg[0]?.knee, timeDelta);

            // 更新历史记录
            this.positionHistory.leftLeg.unshift(leftLeg);
            this.positionHistory.rightLeg.unshift(rightLeg);
            if (this.positionHistory.leftLeg.length > 5) {
                this.positionHistory.leftLeg.pop();
                this.positionHistory.rightLeg.pop();
            }

            // 计算腿部运动的速度分数
            const legVelocityScore = (
                Math.abs(leftLegVelocity.y) + 
                Math.abs(rightLegVelocity.y) + 
                Math.abs(leftLegVelocity.x) * 0.3 + 
                Math.abs(rightLegVelocity.x) * 0.3
            ) / 2;
            
            velocityScore += legVelocityScore;
            totalDetectedParts++;
        }

        // 根据可见部位调整分数
        if (totalDetectedParts > 0) {
            // 如果只有上半身可见，稍微降低运动阈值
            const threshold = detectionMode.isUpperBody && !detectionMode.isLowerBody ? 
                GAME_CONFIG.movementThreshold * 0.7 : 
                GAME_CONFIG.movementThreshold;

            // 归一化速度分数，使用非线性映射使速度变化更平滑
            velocityScore = Math.pow(Math.min(1, (velocityScore / totalDetectedParts) / threshold), 1.5);

            // 如果检测到良好的动作协调性，给予额外加分
            if (coordinationScore > 0.8) {
                velocityScore *= 1.2;
            }
        } else {
            velocityScore = 0;
        }
        
        // 应用平滑处理，增加历史权重以减少抖动
        const smoothedScore = this.lastScore ? 
            this.lastScore * 0.8 + velocityScore * 0.2 : 
            velocityScore;
        this.lastScore = smoothedScore;

        // 更新游戏状态
        const detectionModeText = detectionMode.isFullBody ? 
            '全身' : (detectionMode.isUpperBody ? '上半身' : '下半身');
        const isRunning = smoothedScore > GAME_CONFIG.runningThreshold;
        
        gameState.setState({
            movementQuality: Math.round(smoothedScore * 100),
            debugInfo: isRunning ? 
                `${detectionModeText}运动中 (速度: ${Math.round(smoothedScore * 100)}%)` : 
                `等待${detectionModeText}运动...`
        });
        gameState.updateMovement(isRunning ? smoothedScore : 0);
    }
    
    // 新增：检测并更新手臂相位
    detectAndUpdateArmPhase(leftArm, rightArm) {
        if (!leftArm || !rightArm || !leftArm.wrist || !rightArm.wrist) {
            return;
        }
        
        // 根据手腕的Y坐标判断哪只手臂抬得更高
        const leftWristY = leftArm.wrist.y;
        const rightWristY = rightArm.wrist.y;
        
        // 使用配置中的阈值，防止微小变化导致相位变化
        const threshold = GAME_CONFIG.armPhaseThreshold;
        
        let newPhase = 'neutral';
        
        if (leftWristY < rightWristY - threshold) {
            // 左手抬得更高
            newPhase = 'left_up';
        } else if (rightWristY < leftWristY - threshold) {
            // 右手抬得更高
            newPhase = 'right_up';
        }
        
        // 只有当相位真正变化时才更新
        if (newPhase !== this.currentArmPhase) {
            this.currentArmPhase = newPhase;
            // 更新全局变量，供gameState使用
            window.currentArmPhase = newPhase;
        }
    }

    // 计算两点间的速度
    calculateVelocity(current, previous, timeDelta) {
        if (!current || !previous || timeDelta === 0) {
            return { x: 0, y: 0 };
        }
        return {
            x: (current.x - previous.x) / timeDelta,
            y: (current.y - previous.y) / timeDelta
        };
    }

    detectArmPhase() {
        if (!this.positionHistory || !this.positionHistory.leftArm.length) return 'neutral';
        
        const leftArm = this.positionHistory.leftArm[0];
        const rightArm = this.positionHistory.rightArm[0];
        
        if (!leftArm || !rightArm) return 'neutral';
        
        return leftArm.wrist.y < rightArm.wrist.y ? 'left_up' : 'right_up';
    }

    detectLegPhase() {
        if (!this.positionHistory || !this.positionHistory.leftLeg.length) return 'neutral';
        
        const leftLeg = this.positionHistory.leftLeg[0];
        const rightLeg = this.positionHistory.rightLeg[0];
        
        if (!leftLeg || !rightLeg) return 'neutral';
        
        return leftLeg.knee.y < rightLeg.knee.y ? 'left_up' : 'right_up';
    }

    calibrate() {
        gameState.reset();
        gameState.setState({ debugInfo: '校准完成' });
    }
}

export const poseDetector = new PoseDetector();
