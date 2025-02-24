import { renderer } from './renderer.js';
import { gameState } from './gameState.js';
import { GAME_CONFIG } from './config.js';

class PoseDetector {
    constructor() {
        this.detector = null;
        this.video = null;
        this.isRunning = false;
        this.lastPoseTime = 0;
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
            modelComplexity: 0,  // 使用轻量级模型提高性能
            smoothLandmarks: true,
            enableSegmentation: false,
            smoothSegmentation: false,
            minDetectionConfidence: 0.65,  // 提高检测置信度
            minTrackingConfidence: 0.65
        });

        // 设置结果回调
        this.detector.onResults((results) => this.onPoseResults(results));
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
        if (now - this.lastPoseTime < 16) { // 降低分析间隔到16ms
            return;
        }
        this.lastPoseTime = now;

        const landmarks = results.poseLandmarks;
        
        // 检查关键点可见性
        const visibilityThreshold = 0.65;
        const checkVisibility = (points) => {
            return points.every(point => 
                landmarks[point] && 
                landmarks[point].visibility > visibilityThreshold
            );
        };

        // 检查必要的关键点
        const upperBodyVisible = checkVisibility([11, 12, 13, 14]); // 肩膀和手肘
        const lowerBodyVisible = checkVisibility([23, 24, 25, 26]); // 髋部和膝盖

        if (!upperBodyVisible && !lowerBodyVisible) {
            gameState.setState({ 
                currentSpeed: 0,
                movementQuality: 0,
                debugInfo: '未检测到有效姿势'
            });
            return;
        }

        // 分析运动
        let movementScore = 0;
        let movementCount = 0;

        // 分析手臂摆动
        if (upperBodyVisible) {
            const leftArmAngle = this.calculateAngle(
                landmarks[11], // 左肩
                landmarks[13], // 左肘
                landmarks[15]  // 左手腕
            );
            const rightArmAngle = this.calculateAngle(
                landmarks[12], // 右肩
                landmarks[14], // 右肘
                landmarks[16]  // 右手腕
            );

            // 计算手臂摆动幅度
            const armSwing = Math.abs(leftArmAngle - rightArmAngle);
            movementScore += armSwing / 180;
            movementCount++;
        }

        // 分析腿部运动
        if (lowerBodyVisible) {
            const leftLegAngle = this.calculateAngle(
                landmarks[23], // 左髋
                landmarks[25], // 左膝
                landmarks[27]  // 左踝
            );
            const rightLegAngle = this.calculateAngle(
                landmarks[24], // 右髋
                landmarks[26], // 右膝
                landmarks[28]  // 右踝
            );

            // 计算腿部运动幅度
            const legMovement = Math.abs(leftLegAngle - rightLegAngle);
            movementScore += (legMovement / 180) * 1.5; // 给腿部运动更高权重
            movementCount++;
        }

        // 计算最终运动得分
        const finalScore = movementCount > 0 ? (movementScore / movementCount) : 0;
        
        // 更新游戏状态
        const currentState = gameState.getState();
        const newSpeed = Math.min(GAME_CONFIG.maxSpeed, finalScore * GAME_CONFIG.maxSpeed);
        
        gameState.setState({
            currentSpeed: newSpeed,
            movementQuality: Math.min(100, finalScore * 100),
            debugInfo: `运动得分: ${(finalScore * 100).toFixed(1)}%`
        });
    }

    calculateAngle(a, b, c) {
        if (!a || !b || !c) return 0;

        const radians = Math.atan2(
            c.y - b.y,
            c.x - b.x
        ) - Math.atan2(
            a.y - b.y,
            a.x - b.x
        );

        let angle = Math.abs(radians * 180.0 / Math.PI);
        
        if (angle > 180.0) {
            angle = 360 - angle;
        }
        
        return angle;
    }

    calibrate() {
        gameState.reset();
        gameState.setState({ debugInfo: '校准完成' });
    }
}

export const poseDetector = new PoseDetector();
