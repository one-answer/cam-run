class ShadowRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.initialized = false;
        this.SHADOW_OPACITY = 0.8;
        this.SHADOW_BLUR = 6;
        this.lastRenderTime = 0;
        this.renderInterval = 50; // 降低阴影渲染频率到20fps
        this.lowQualityMode = false;
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
        
        // 降低阴影画布分辨率以提高性能
        this.canvas.width = 240; // 降低分辨率
        this.canvas.height = 180;

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
        
        // 降低渲染频率
        const now = performance.now();
        if (now - this.lastRenderTime < this.renderInterval) {
            return;
        }
        this.lastRenderTime = now;

        this.clear();

        // 在离屏画布上绘制
        const ctx = this.offscreenCtx;
        ctx.save();
        ctx.scale(-1, 1);
        ctx.translate(-ctx.canvas.width, 0);

        // 根据性能模式设置模糊效果
        if (this.lowQualityMode) {
            ctx.filter = 'none'; // 禁用模糊以提高性能
        } else {
            ctx.filter = `blur(${this.SHADOW_BLUR}px)`;
        }

        // 简化绘制，只绘制主要部分
        if (this.lowQualityMode) {
            this.drawSimplifiedShadow(ctx, landmarks);
        } else {
            // 绘制身体各部分
            this.drawTorso(ctx, landmarks);  // 躯干
            this.drawLimbs(ctx, landmarks);  // 四肢
            this.drawHead(ctx, landmarks);   // 头部
        }

        ctx.restore();

        // 将离屏画布的内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = this.lowQualityMode ? 0.3 : 0.4;  // 降低透明度以提高性能
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }
    
    // 简化的阴影绘制，只绘制一个整体轮廓
    drawSimplifiedShadow(ctx, landmarks) {
        // 找出所有关键点的边界
        const points = landmarks.filter(point => point && point.visibility > 0.5);
        if (points.length < 5) return;
        
        // 计算中心点
        let sumX = 0, sumY = 0, count = 0;
        points.forEach(point => {
            sumX += point.x;
            sumY += point.y;
            count++;
        });
        
        const centerX = (sumX / count) * ctx.canvas.width;
        const centerY = (sumY / count) * ctx.canvas.height;
        
        // 计算半径（简单地取最远点的距离）
        let maxDist = 0;
        points.forEach(point => {
            const dx = point.x * ctx.canvas.width - centerX;
            const dy = point.y * ctx.canvas.height - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            maxDist = Math.max(maxDist, dist);
        });
        
        // 绘制简单的圆形阴影
        const gradient = ctx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxDist * 1.2
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        ctx.beginPath();
        ctx.ellipse(centerX, centerY, maxDist * 1.2, maxDist * 0.8, 0, 0, Math.PI * 2);
        ctx.fillStyle = gradient;
        ctx.fill();
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

        // 在关节处添加圆形，但不在肘部(中间点)添加明显的圆形
        // 只在起点和终点添加较大的圆形
        ctx.beginPath();
        ctx.arc(points[0].x, points[0].y, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
        ctx.fill();
        
        // 肘部(中间点)不添加明显的圆形阴影
        // 如果需要保留一点连续性，可以添加非常小且透明度低的圆形
        ctx.beginPath();
        ctx.arc(points[1].x, points[1].y, 3, 0, Math.PI * 2); // 减小半径
        ctx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY * 0.3})`; // 降低透明度
        ctx.fill();
        
        ctx.beginPath();
        ctx.arc(points[2].x, points[2].y, 8, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
        ctx.fill();
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

// 将阴影渲染器暴露给全局对象以便性能控制
window.shadowRenderer = shadowRenderer;

// 全局变量，用于跟踪步数和运动状态
let stepCount = 0;
let lastStepTime = 0;
let isRunning = false;
let consecutiveMovements = 0;
let speedBuffer = [];
let armSwingPhase = 'neutral'; // 'up', 'down', 'neutral'
let armCycleProgress = 0; // 0-100
let lastArmPositions = {}; // 存储上一次手臂位置
let previousCompleteCycleTime = null; // 上一次完整周期的时间
let lastCompleteCycleTime = null; // 最近一次完整周期的时间
let cyclesPerMinute = 0; // 每分钟周期数
let lastStepCycleCount = 0; // 上次增加步数时的周期计数
let totalCycleCount = 0; // 总周期计数
let stepLockoutActive = false; // 步数锁定状态
let stepLockoutEndTime = 0; // 步数锁定结束时间
