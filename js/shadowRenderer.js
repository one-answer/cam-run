class ShadowRenderer {
    constructor() {
        this.canvas = null;
        this.ctx = null;
        this.offscreenCanvas = null;
        this.offscreenCtx = null;
        this.initialized = false;
        this.isMobile = /Mobi|Android|iPhone/i.test(navigator.userAgent);
        this.SHADOW_OPACITY = this.isMobile ? 0.6 : 0.8;
        this.SHADOW_BLUR = this.isMobile ? 4 : 6;
        this.lastRenderTime = 0;
        this.renderInterval = this.isMobile ? 100 : 50; // 移动端10fps, 桌面端20fps
        this.lowQualityMode = this.isMobile;
        // 设置默认质量 - 电脑端默认使用高质量(2)，移动端使用低质量(0)
        this.SHADOW_QUALITY = this.isMobile ? 0 : 2;
        this.tempLowQuality = false;
        this.previousQuality = this.isMobile ? 0 : 2;
        this.adaptiveQualityEnabled = true;
        this.memoryCheckInterval = 20000; // 增加到20秒检查一次内存
        this.lastMemoryCheck = 0;
        this.devicePerformanceScore = 0; // 设备性能评分
        this.frameTimeHistory = []; // 用于存储帧时间历史
        this.maxFrameTimeHistoryLength = 30; // 最多存储30帧的时间
        this.performanceTestCompleted = false; // 标记性能测试是否已完成
        this.lastAdaptiveCheck = 0; // 上次自适应质量检查的时间
        
        // 内存使用阈值 - 提高阈值，减少频繁切换
        this.highMemoryThreshold = 250; // MB，提高到250MB
        this.lowMemoryThreshold = 180;  // MB，提高到180MB
        
        // 稳定性控制 - 添加计数器防止频繁切换
        this.qualityChangeCounter = 0;
        this.qualityChangeThreshold = 5; // 需要连续5次检测才会改变质量
        this.lastQualityChangeTime = 0;
        this.qualityChangeCooldown = 10000; // 10秒冷却时间
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
        
        // 移动设备使用更低的分辨率
        const scale = this.isMobile ? 0.6 : 1.0;
        this.canvas.width = 240 * scale; // 降低分辨率
        this.canvas.height = 180 * scale;

        // 离屏画布
        this.offscreenCanvas = document.createElement('canvas');
        this.offscreenCanvas.width = this.canvas.width;
        this.offscreenCanvas.height = this.canvas.height;
        this.offscreenCtx = this.offscreenCanvas.getContext('2d');

        // 设备性能检测
        this.detectDevicePerformance();
        
        this.initialized = true;
    }

    // 设备性能检测
    detectDevicePerformance() {
        // 如果已经完成性能测试，不再重复测试
        if (this.performanceTestCompleted) return;
        
        // 电脑端默认使用高质量设置，除非明显性能不足
        if (!this.isMobile) {
            // 分析帧时间历史
            if (this.frameTimeHistory.length < 15) return; // 至少需要15帧数据
            
            // 排除异常值，取中间80%的数据计算平均值
            const sortedFrameTimes = [...this.frameTimeHistory].sort((a, b) => a - b);
            const startIndex = Math.floor(sortedFrameTimes.length * 0.1);
            const endIndex = Math.floor(sortedFrameTimes.length * 0.9);
            const filteredFrameTimes = sortedFrameTimes.slice(startIndex, endIndex);
            
            const avgFrameTime = filteredFrameTimes.reduce((a, b) => a + b, 0) / filteredFrameTimes.length;
            const fps = 1000 / avgFrameTime;
            
            console.log(`初始性能检测 - 电脑端FPS: ${fps.toFixed(1)}`);
            
            // 电脑端性能阈值提高到12fps，使其不会轻易降低质量
            // 只有在性能极差的情况下才降低质量
            if (fps < 12) { // 如果帧率低于12fps，降低质量
                this.devicePerformanceScore = 1;
                this.renderInterval = 80; // 约12.5fps
                this.SHADOW_QUALITY = 1;
                console.log('电脑性能不足，使用中等质量阴影');
            } else { // 电脑性能正常，使用高质量
                this.devicePerformanceScore = 3;
                this.renderInterval = 50; // 20fps
                this.SHADOW_QUALITY = 2;
                console.log('电脑性能良好，使用高质量阴影');
            }
            
            this.performanceTestCompleted = true;
            this.lastQualityChangeTime = performance.now(); // 设置初始质量变化时间
            return;
        }
        
        // 移动设备性能检测
        // 分析帧时间历史
        if (this.frameTimeHistory.length < 15) return; // 至少需要15帧数据
        
        // 排除异常值，取中间80%的数据计算平均值
        const sortedFrameTimes = [...this.frameTimeHistory].sort((a, b) => a - b);
        const startIndex = Math.floor(sortedFrameTimes.length * 0.1);
        const endIndex = Math.floor(sortedFrameTimes.length * 0.9);
        const filteredFrameTimes = sortedFrameTimes.slice(startIndex, endIndex);
        
        const avgFrameTime = filteredFrameTimes.reduce((a, b) => a + b, 0) / filteredFrameTimes.length;
        const fps = 1000 / avgFrameTime;
        
        // 根据帧率评估设备性能
        if (fps < 15) { // 性能很差
            this.devicePerformanceScore = 0;
            this.renderInterval = 200; // 5fps
            this.SHADOW_QUALITY = 0;
            console.log('设备性能较差，使用最低质量设置');
        } else if (fps < 25) { // 性能一般
            this.devicePerformanceScore = 1;
            this.renderInterval = 100; // 10fps
            this.SHADOW_QUALITY = 0;
            console.log('设备性能一般，使用低质量设置');
        } else { // 性能良好
            this.devicePerformanceScore = 2;
            this.renderInterval = 80; // 约12.5fps
            this.SHADOW_QUALITY = 1;
            console.log('设备性能良好，使用中等质量设置');
        }
        
        this.performanceTestCompleted = true;
        this.lastQualityChangeTime = performance.now(); // 设置初始质量变化时间
    }

    clear() {
        if (!this.initialized) return;
        
        // 清除离屏画布
        this.offscreenCtx.clearRect(0, 0, this.offscreenCanvas.width, this.offscreenCanvas.height);
        
        // 清除主画布
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    }

    recordFrameTime(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistoryLength) {
            this.frameTimeHistory.shift();
        }
    }

    adaptQualityBasedOnPerformance() {
        // 如果未完成初始性能测试，先进行测试
        if (!this.performanceTestCompleted) {
            this.detectDevicePerformance();
            return;
        }
        
        // 检查是否处于冷却期
        const now = performance.now();
        if (now - this.lastQualityChangeTime < this.qualityChangeCooldown) {
            return; // 如果在冷却期内，跳过质量调整
        }
        
        // 检查帧时间历史是否足够
        if (this.frameTimeHistory.length < 15) return;
        
        // 排除异常值，取中间80%的数据计算平均值
        const sortedFrameTimes = [...this.frameTimeHistory].sort((a, b) => a - b);
        const startIndex = Math.floor(sortedFrameTimes.length * 0.1);
        const endIndex = Math.floor(sortedFrameTimes.length * 0.9);
        const filteredFrameTimes = sortedFrameTimes.slice(startIndex, endIndex);
        
        const avgFrameTime = filteredFrameTimes.reduce((a, b) => a + b, 0) / filteredFrameTimes.length;
        
        // 获取内存使用情况
        let memoryUsage = 0;
        if (window.performance && window.performance.memory) {
            memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }
        
        // 电脑端使用更严格的性能标准
        const frameTimeThreshold = this.isMobile ? 16 : 20; // 电脑端提高到20ms (约50fps)
        
        // 基于性能调整质量
        if (avgFrameTime > frameTimeThreshold || memoryUsage > this.highMemoryThreshold) {
            // 电脑端需要更严重的性能问题才降低质量
            if (!this.isMobile && avgFrameTime < 30) { // 电脑端只有在帧时间超过30ms(约33fps)才考虑降低质量
                this.qualityChangeCounter = 0;
                return;
            }
            
            if (this.SHADOW_QUALITY > 0 && this.qualityChangeCounter < this.qualityChangeThreshold) {
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                    // 电脑端不降低到最低质量
                    const newQuality = Math.max(this.isMobile ? 0 : 1, this.SHADOW_QUALITY - 1);
                    if (newQuality !== this.SHADOW_QUALITY) {
                        this.SHADOW_QUALITY = newQuality;
                        this.lastQualityChangeTime = now;
                        console.log(`性能不佳，降低阴影质量到${this.SHADOW_QUALITY}`);
                    }
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        } else if (avgFrameTime < 8 && memoryUsage < this.lowMemoryThreshold && this.SHADOW_QUALITY < 2) {
            // 性能良好，可以考虑提高质量
            if (this.qualityChangeCounter < this.qualityChangeThreshold) {
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                    // 电脑端可以直接提高到最高质量
                    const newQuality = this.isMobile ? Math.min(1, this.SHADOW_QUALITY + 1) : 2;
                    if (newQuality !== this.SHADOW_QUALITY) {
                        this.SHADOW_QUALITY = newQuality;
                        this.lastQualityChangeTime = now;
                        console.log(`性能良好，提高阴影质量到${this.SHADOW_QUALITY}`);
                    }
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        } else {
            // 性能适中，保持当前质量
            this.qualityChangeCounter = 0;
        }
    }

    render(landmarks) {
        if (!this.initialized || !landmarks) return;
        
        const now = performance.now();
        
        // 根据设置的渲染间隔控制渲染频率
        if (now - this.lastRenderTime < this.renderInterval) return;
        this.lastRenderTime = now;
        
        // 如果启用了自适应质量，并且有足够的帧时间历史数据，检测设备性能
        if (this.adaptiveQualityEnabled && this.frameTimeHistory.length >= 15 && !this.performanceTestCompleted) {
            this.detectDevicePerformance();
        }
        
        // 清除画布
        this.clear();
        
        // 根据质量设置选择渲染方法
        switch (this.SHADOW_QUALITY) {
            case 0: // 最低质量 - 简单圆形
                this.renderUltraSimpleShadow(landmarks);
                break;
            case 1: // 中等质量 - 简化轮廓
                this.renderSimplifiedShadow(landmarks);
                break;
            case 2: // 高质量 - 完整轮廓
                this.renderFullShadow(landmarks);
                break;
            default:
                // 电脑端默认使用高质量
                if (!this.isMobile) {
                    this.renderFullShadow(landmarks);
                } else {
                    this.renderSimplifiedShadow(landmarks);
                }
        }
        
        // 内存使用检查 - 每隔一段时间检查一次
        if (now - this.lastMemoryCheck > this.memoryCheckInterval) {
            this.lastMemoryCheck = now;
            
            // 检查是否处于冷却期
            if (now - this.lastQualityChangeTime < this.qualityChangeCooldown) {
                return; // 如果在冷却期内，跳过内存检查
            }
            
            if (window.performance && window.performance.memory) {
                const memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
                
                // 电脑端使用更高的内存阈值
                const highThreshold = this.isMobile ? this.highMemoryThreshold : this.highMemoryThreshold * 1.2;
                const lowThreshold = this.isMobile ? this.lowMemoryThreshold : this.lowMemoryThreshold * 1.2;
                
                // 如果内存使用过高，降低质量
                if (memoryUsage > highThreshold && !this.tempLowQuality) {
                    // 增加计数器，连续多次检测到高内存才降低质量
                    this.qualityChangeCounter++;
                    
                    if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                        this.tempLowQuality = true;
                        this.previousQuality = this.SHADOW_QUALITY;
                        
                        // 电脑端降低到中等质量，移动端降低到最低质量
                        this.SHADOW_QUALITY = this.isMobile ? 0 : 1;
                        this.lastQualityChangeTime = now;
                        this.qualityChangeCounter = 0;
                        console.log(`内存使用过高 (${memoryUsage.toFixed(2)}MB)，临时降低阴影质量`);
                    }
                } 
                // 如果内存使用恢复正常，恢复之前的质量
                else if (memoryUsage < lowThreshold && this.tempLowQuality) {
                    // 增加计数器，连续多次检测到低内存才恢复质量
                    this.qualityChangeCounter++;
                    
                    if (this.qualityChangeCounter >= this.qualityChangeThreshold) {
                        this.SHADOW_QUALITY = this.previousQuality;
                        this.tempLowQuality = false;
                        this.lastQualityChangeTime = now;
                        this.qualityChangeCounter = 0;
                        console.log(`内存使用恢复正常 (${memoryUsage.toFixed(2)}MB)，恢复阴影质量`);
                    }
                } else {
                    // 重置计数器
                    this.qualityChangeCounter = 0;
                }
            }
        }
    }
    
    // 记录帧时间用于性能分析
    recordFrameTime(frameTime) {
        this.frameTimeHistory.push(frameTime);
        if (this.frameTimeHistory.length > this.maxFrameTimeHistoryLength) {
            this.frameTimeHistory.shift();
        }
    }
    
    // 基于性能自适应调整质量
    adaptQualityBasedOnPerformance() {
        if (!this.frameTimeHistory.length) return;
        
        // 计算平均帧时间
        const avgFrameTime = this.frameTimeHistory.reduce((sum, time) => sum + time, 0) / this.frameTimeHistory.length;
        
        // 获取内存使用情况
        let memoryUsage = 0;
        if (window.performance && window.performance.memory) {
            memoryUsage = window.performance.memory.usedJSHeapSize / (1024 * 1024); // MB
        }
        
        // 基于性能调整质量
        if (avgFrameTime > 16 || memoryUsage > this.highMemoryThreshold) { // 帧时间超过16ms(约60fps)或内存超过200MB
            if (this.SHADOW_QUALITY > 0 && this.qualityChangeCounter < this.qualityChangeThreshold) {
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold && performance.now() - this.lastQualityChangeTime > this.qualityChangeCooldown) {
                    this.SHADOW_QUALITY--;
                    this.lastQualityChangeTime = performance.now();
                    console.log(`性能不佳，降低阴影质量到${this.SHADOW_QUALITY}`);
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        } else if (avgFrameTime < 8 && memoryUsage < this.lowMemoryThreshold && this.SHADOW_QUALITY < 2) {
            // 性能良好，可以考虑提高质量
            if (Math.random() < 0.3 && this.qualityChangeCounter < this.qualityChangeThreshold) { // 30%的概率提高质量，避免频繁切换
                this.qualityChangeCounter++;
                if (this.qualityChangeCounter >= this.qualityChangeThreshold && performance.now() - this.lastQualityChangeTime > this.qualityChangeCooldown) {
                    this.SHADOW_QUALITY++;
                    this.lastQualityChangeTime = performance.now();
                    console.log(`性能良好，提高阴影质量到${this.SHADOW_QUALITY}`);
                    // 重置历史记录以便评估新设置
                    this.frameTimeHistory = [];
                    this.qualityChangeCounter = 0;
                }
            }
        }
    }
    
    // 超简化的阴影绘制 - 用于最低质量模式
    renderUltraSimpleShadow(landmarks) {
        // 只找出几个关键点
        const keyPoints = [
            landmarks[0],  // 鼻子
            landmarks[11], // 左肩
            landmarks[12], // 右肩
            landmarks[23], // 左髋
            landmarks[24]  // 右髋
        ];
        
        // 计算中心点
        let sumX = 0, sumY = 0, count = 0;
        keyPoints.forEach(point => {
            if (!point || point.visibility < 0.5) return;
            sumX += point.x;
            sumY += point.y;
            count++;
        });
        
        const centerX = (sumX / count) * this.offscreenCanvas.width;
        const centerY = (sumY / count) * this.offscreenCanvas.height;
        
        // 简单椭圆阴影
        const width = this.offscreenCanvas.width * 0.2;
        const height = this.offscreenCanvas.height * 0.15;
        
        this.offscreenCtx.beginPath();
        this.offscreenCtx.ellipse(centerX, centerY, width, height, 0, 0, Math.PI * 2);
        this.offscreenCtx.fillStyle = `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`;
        this.offscreenCtx.fill();
        
        // 将离屏画布内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.3;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }

    renderSimplifiedShadow(landmarks) {
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
        
        const centerX = (sumX / count) * this.offscreenCanvas.width;
        const centerY = (sumY / count) * this.offscreenCanvas.height;
        
        // 计算半径（简单地取最远点的距离）
        let maxDist = 0;
        points.forEach(point => {
            const dx = point.x * this.offscreenCanvas.width - centerX;
            const dy = point.y * this.offscreenCanvas.height - centerY;
            const dist = Math.sqrt(dx*dx + dy*dy);
            maxDist = Math.max(maxDist, dist);
        });
        
        // 绘制简单的圆形阴影
        const gradient = this.offscreenCtx.createRadialGradient(
            centerX, centerY, 0,
            centerX, centerY, maxDist * 1.2
        );
        gradient.addColorStop(0, `rgba(0, 0, 0, ${this.SHADOW_OPACITY})`);
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)');
        
        this.offscreenCtx.beginPath();
        this.offscreenCtx.ellipse(centerX, centerY, maxDist * 1.2, maxDist * 0.8, 0, 0, Math.PI * 2);
        this.offscreenCtx.fillStyle = gradient;
        this.offscreenCtx.fill();
        
        // 将离屏画布内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.5;
        this.ctx.drawImage(this.offscreenCanvas, 0, 0);
        this.ctx.restore();
    }

    renderFullShadow(landmarks) {
        // 绘制身体各部分
        this.drawTorso(this.offscreenCtx, landmarks);  // 躯干
        this.drawLimbs(this.offscreenCtx, landmarks);  // 四肢
        this.drawHead(this.offscreenCtx, landmarks);   // 头部
        
        // 将离屏画布内容绘制到主画布
        this.ctx.save();
        this.ctx.globalAlpha = 0.8;
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
